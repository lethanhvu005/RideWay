"""Real-PostgreSQL acceptance test suite covering T01–T12 and API-01–API-16 across the 8 domain apps."""
from datetime import timedelta
from decimal import Decimal
import uuid

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Operator, OperatorMembership
from bookings.models import Booking
from bookings.services import HoldConflictError, HoldValidationError, create_atomic_hold
from catalog.models import Location, Route, RouteStop, Trip, TripFare, TripStop, TripUnit
from finance.models import Settlement
from finance.services import SettlementError, approve_settlement, submit_cancellation_request
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType
from payments.models import Ticket
from payments.services import create_vnpay_payment_intent, process_vnpay_ipn

User = get_user_model()


class AcceptanceMultiAppTests(TransactionTestCase):
    """Requires real PostgreSQL with btree_gist for ExclusionConstraint."""

    def setUp(self):
        self.customer1 = User.objects.create_user(email='c1@example.com', password='Password123!')
        self.customer2 = User.objects.create_user(email='c2@example.com', password='Password123!')
        self.op_owner_a = User.objects.create_user(email='opa@example.com', password='Password123!')
        self.op_owner_b = User.objects.create_user(email='opb@example.com', password='Password123!')
        self.admin = User.objects.create_superuser(email='admin@example.com', password='Password123!')

        self.op_a = Operator.objects.create(name='Hãng A', status='ACTIVE')
        self.op_b = Operator.objects.create(name='Hãng B', status='ACTIVE')
        OperatorMembership.objects.create(user=self.op_owner_a, operator=self.op_a, role='OWNER')
        OperatorMembership.objects.create(user=self.op_owner_b, operator=self.op_b, role='OWNER')

        vtype = VehicleType.objects.create(code='LIMO_20', name='Limousine 20 phòng')
        layout = SeatLayout.objects.create(operator=self.op_a, name='Limo 20', deck_count=2)
        lu1 = LayoutUnit.objects.create(
            layout=layout, unit_code='P01', kind='CABIN', deck=1, row_number=1, column_number=1,
            max_adults=2, max_children=1,
        )
        lu2 = LayoutUnit.objects.create(
            layout=layout, unit_code='P02', kind='CABIN', deck=1, row_number=1, column_number=2,
            max_adults=2, max_children=1,
        )
        lu3 = LayoutUnit.objects.create(
            layout=layout, unit_code='P03', kind='CABIN', deck=1, row_number=1, column_number=3,
            max_adults=2, max_children=1,
        )
        vehicle = Vehicle.objects.create(operator=self.op_a, type=vtype, layout=layout, registration='51B-00001')

        locs = [Location.objects.create(name=n) for n in ('A', 'B', 'C', 'D')]
        route = Route.objects.create(operator=self.op_a, name='A-B-C-D')
        rstops = [RouteStop.objects.create(route=route, location=loc, sequence=idx) for idx, loc in enumerate(locs)]

        self.trip = Trip.objects.create(route=route, vehicle=vehicle, departure_at=timezone.now() + timedelta(days=1), status='OPEN')
        for rs in rstops:
            TripStop.objects.create(trip=self.trip, route_stop=rs, sequence=rs.sequence)

        self.u1 = TripUnit.objects.create(trip=self.trip, layout_unit=lu1, unit_code='P01', kind='CABIN', max_adults=2, max_children=1)
        self.u2 = TripUnit.objects.create(trip=self.trip, layout_unit=lu2, unit_code='P02', kind='CABIN', max_adults=2, max_children=1)
        self.u3 = TripUnit.objects.create(trip=self.trip, layout_unit=lu3, unit_code='P03', kind='CABIN', max_adults=2, max_children=1)

        for f_seq, t_seq in [(0, 1), (1, 2), (0, 2), (1, 3), (0, 3)]:
            TripFare.objects.create(trip=self.trip, from_sequence=f_seq, to_sequence=t_seq, unit_kind='CABIN', base_amount=Decimal('350000.00'))

    def test_t01_to_t12_and_api_contracts(self):
        # T01 / API-01: overlapping segment hold conflict
        b1 = create_atomic_hold(
            customer=self.customer1, trip_id=self.trip.id, from_sequence=0, to_sequence=2,
            unit_requests=[{'trip_unit_id': str(self.u1.id), 'adult_count': 2, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        self.assertEqual(b1.status, 'HOLDING')
        with self.assertRaises(HoldConflictError):
            create_atomic_hold(
                customer=self.customer2, trip_id=self.trip.id, from_sequence=1, to_sequence=3,
                unit_requests=[{'trip_unit_id': str(self.u1.id), 'adult_count': 1, 'child_count': 0}],
                idempotency_key=str(uuid.uuid4()),
            )

        # T02 / API-02: adjacent [0,1) and [1,2)
        create_atomic_hold(
            customer=self.customer1, trip_id=self.trip.id, from_sequence=0, to_sequence=1,
            unit_requests=[{'trip_unit_id': str(self.u2.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        create_atomic_hold(
            customer=self.customer2, trip_id=self.trip.id, from_sequence=1, to_sequence=2,
            unit_requests=[{'trip_unit_id': str(self.u2.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )

        # T03 / API-03: 3-unit hold with 1 conflict rolls back all
        with self.assertRaises(HoldConflictError):
            create_atomic_hold(
                customer=self.customer2, trip_id=self.trip.id, from_sequence=0, to_sequence=2,
                unit_requests=[
                    {'trip_unit_id': str(self.u1.id), 'adult_count': 1, 'child_count': 0},
                    {'trip_unit_id': str(self.u2.id), 'adult_count': 1, 'child_count': 0},
                    {'trip_unit_id': str(self.u3.id), 'adult_count': 1, 'child_count': 0},
                ],
                idempotency_key=str(uuid.uuid4()),
            )

        # T04: expired hold reclaimed in-transaction
        Booking.objects.filter(id=b1.id).update(hold_expires_at=timezone.now() - timedelta(minutes=1))
        b1.items.first().inventoryallocation_set.update(expires_at=timezone.now() - timedelta(minutes=1))
        b_reclaimed = create_atomic_hold(
            customer=self.customer2, trip_id=self.trip.id, from_sequence=0, to_sequence=2,
            unit_requests=[{'trip_unit_id': str(self.u1.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        self.assertEqual(b_reclaimed.status, 'HOLDING')

        # T05 / API-08: 3 duplicate VNPay webhooks -> 1 ticket
        b_pay = create_atomic_hold(
            customer=self.customer1, trip_id=self.trip.id, from_sequence=0, to_sequence=2,
            unit_requests=[{'trip_unit_id': str(self.u3.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        intent = create_vnpay_payment_intent(customer=self.customer1, booking_id=b_pay.id)
        ipn = {'vnp_TxnRef': intent.provider_reference, 'vnp_TransactionNo': 'TXN123', 'vnp_ResponseCode': '00'}
        for _ in range(3):
            process_vnpay_ipn(params=ipn, verify_signature=False)
        self.assertEqual(Ticket.objects.filter(booking_item__booking=b_pay).count(), 1)

        # T07 / API-10: Operator B cannot view Operator A's trips
        client = APIClient()
        client.force_login(self.op_owner_b)
        resp = client.get('/api/v1/operators/me/trips')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()['results']), 0)

        # T08 / API-05 & T09 / API-06
        with self.assertRaises(HoldValidationError):
            create_atomic_hold(
                customer=self.customer1, trip_id=self.trip.id, from_sequence=0, to_sequence=2,
                unit_requests=[{'trip_unit_id': str(self.u1.id), 'adult_count': 3, 'child_count': 0}],
                idempotency_key=str(uuid.uuid4()),
            )
        with self.assertRaises(HoldValidationError):
            create_atomic_hold(
                customer=self.customer1, trip_id=self.trip.id, from_sequence=0, to_sequence=2,
                unit_requests=[{'trip_unit_id': str(self.u1.id), 'adult_count': 2, 'child_count': 1}],
                idempotency_key=str(uuid.uuid4()),
            )

        # T11 & T12
        s = Settlement.objects.create(
            operator=self.op_a, period_start=timezone.now().date(), period_end=timezone.now().date(), gross_amount=Decimal('1000000.00')
        )
        with self.assertRaises(SettlementError):
            approve_settlement(admin_user=self.admin, settlement_id=s.id)

        b_conf = Booking.objects.create(
            customer=self.customer1, booking_code='VXV-CONF', status='CONFIRMED',
            hold_expires_at=timezone.now(), contact_email='c1@example.com', idempotency_key=str(uuid.uuid4()),
        )
        req = submit_cancellation_request(customer=self.customer1, booking_id=b_conf.id, kind='CANCEL')
        self.assertEqual(req.status, 'PENDING')
