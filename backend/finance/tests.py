"""Phase 4 Finance tests: Cancellation decision releases InventoryAllocation and invalidates Tickets."""
from datetime import timedelta
from decimal import Decimal
import uuid

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Operator, OperatorMembership
from bookings.services import create_atomic_hold
from catalog.models import Location, Route, RouteStop, Trip, TripFare, TripStop, TripUnit
from finance.services import submit_cancellation_request
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType
from inventory.models import InventoryAllocation
from payments.models import Ticket
from payments.services import create_vnpay_payment_intent, process_vnpay_ipn

User = get_user_model()


class FinanceCancellationAndSettlementTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer1 = User.objects.create_user(email='c.fin1@vexuyenviet.vn', password='StrongPassword#2026')
        self.customer2 = User.objects.create_user(email='c.fin2@vexuyenviet.vn', password='StrongPassword#2026')
        self.staff = User.objects.create_user(
            email='staff.fin@vexuyenviet.vn', password='StrongPassword#2026', is_staff=True
        )
        self.operator = Operator.objects.create(name='Hãng Tài Chính', status='ACTIVE')
        vtype = VehicleType.objects.create(code='LIMO_FIN', name='Limo Fin')
        layout = SeatLayout.objects.create(operator=self.operator, name='Layout Fin', deck_count=1)
        lu = LayoutUnit.objects.create(
            layout=layout, unit_code='P01', kind='CABIN', deck=1, row_number=1, column_number=1, max_adults=2, max_children=1
        )
        veh = Vehicle.objects.create(operator=self.operator, type=vtype, layout=layout, registration='51B-77777')
        loc_a = Location.objects.create(name='A')
        loc_b = Location.objects.create(name='B')
        route = Route.objects.create(operator=self.operator, name='A-B')
        rs0 = RouteStop.objects.create(route=route, location=loc_a, sequence=0)
        rs1 = RouteStop.objects.create(route=route, location=loc_b, sequence=1)

        self.trip = Trip.objects.create(route=route, vehicle=veh, departure_at=timezone.now() + timedelta(days=2), status='OPEN')
        TripStop.objects.create(trip=self.trip, route_stop=rs0, sequence=0)
        TripStop.objects.create(trip=self.trip, route_stop=rs1, sequence=1)
        self.tu1 = TripUnit.objects.create(trip=self.trip, layout_unit=lu, unit_code='P01', kind='CABIN', max_adults=2, max_children=1)
        TripFare.objects.create(trip=self.trip, from_sequence=0, to_sequence=1, unit_kind='CABIN', base_amount=Decimal('400000.00'))

    def test_approved_cancellation_releases_inventory_and_cancels_ticket(self):
        b1 = create_atomic_hold(
            customer=self.customer1,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=1,
            unit_requests=[{'trip_unit_id': str(self.tu1.id), 'adult_count': 2, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        intent = create_vnpay_payment_intent(customer=self.customer1, booking_id=b1.id)
        process_vnpay_ipn(
            params={'vnp_TxnRef': intent.provider_reference, 'vnp_TransactionNo': 'FIN01', 'vnp_ResponseCode': '00'},
            verify_signature=False,
        )
        b1.refresh_from_db()
        self.assertEqual(b1.status, 'CONFIRMED')
        self.assertEqual(Ticket.objects.get(booking_item__booking=b1).status, 'ISSUED')

        # Customer 1 requests cancellation
        cr = submit_cancellation_request(customer=self.customer1, booking_id=b1.id, kind='CANCEL', reason='Đổi lịch trình')

        # Platform staff approves cancellation with refund
        self.client.force_login(self.staff)
        resp = self.client.post(
            f'/api/v1/admin/cancellation-requests/{cr.id}/decision',
            {'decision': 'APPROVED', 'approved_refund_amount': '360000.00'},
            format='json',
        )
        self.assertEqual(resp.status_code, 201)
        b1.refresh_from_db()
        self.assertEqual(b1.status, 'CANCELLED')
        self.assertEqual(Ticket.objects.get(booking_item__booking=b1).status, 'CANCELLED')
        self.assertEqual(InventoryAllocation.objects.get(booking_item__booking=b1).status, 'RELEASED')

        # Customer 2 can now book the exact same unit P01 on segment [0, 1) without conflict!
        b2 = create_atomic_hold(
            customer=self.customer2,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=1,
            unit_requests=[{'trip_unit_id': str(self.tu1.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        self.assertEqual(b2.status, 'HOLDING')
