"""Phase 4 tests: VNPay signed URL, IPN signature & amount verification, late payment exception (T06), and HMAC QR check-in."""
from datetime import timedelta
from decimal import Decimal
import os
import urllib.parse
import uuid

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Operator, OperatorMembership
from bookings.models import Booking
from bookings.services import assign_passengers_and_pickup, create_atomic_hold
from catalog.models import Location, Route, RouteStop, Trip, TripFare, TripStop, TripUnit
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType
from inventory.models import InventoryAllocation
from payments.models import Ticket
from payments.services import (
    _vnpay_hmac_sha512,
    create_vnpay_payment_intent,
    process_vnpay_ipn,
    verify_vnpay_signature,
)

User = get_user_model()


class PaymentsVNPayAndTicketQRTests(TransactionTestCase):
    def setUp(self):
        os.environ['VNPAY_TMN_CODE'] = 'RIDEWAYTEST'
        os.environ['VNPAY_HASH_SECRET'] = 'test-hmac-sha512-secret-key-2026'
        self.client = APIClient()
        self.customer1 = User.objects.create_user(email='pay1@vexuyenviet.vn', password='StrongPassword#2026')
        self.customer2 = User.objects.create_user(email='pay2@vexuyenviet.vn', password='StrongPassword#2026')
        self.op_owner = User.objects.create_user(email='op.pay@vexuyenviet.vn', password='StrongPassword#2026')

        self.operator = Operator.objects.create(name='Sao Việt Limousine', status='ACTIVE')
        OperatorMembership.objects.create(user=self.op_owner, operator=self.operator, role='OWNER')

        vtype = VehicleType.objects.create(code='LIMO_PAY', name='Limousine Pay')
        layout = SeatLayout.objects.create(operator=self.operator, name='Limo Pay', deck_count=2)
        lu1 = LayoutUnit.objects.create(
            layout=layout, unit_code='P01', kind='CABIN', deck=1, row_number=1, column_number=1, max_adults=2, max_children=1
        )
        veh = Vehicle.objects.create(operator=self.operator, type=vtype, layout=layout, registration='29B-11111')
        loc_a = Location.objects.create(name='Bến A')
        loc_b = Location.objects.create(name='Bến B')
        route = Route.objects.create(operator=self.operator, name='A-B')
        rs0 = RouteStop.objects.create(route=route, location=loc_a, sequence=0)
        rs1 = RouteStop.objects.create(route=route, location=loc_b, sequence=1)

        self.trip = Trip.objects.create(route=route, vehicle=veh, departure_at=timezone.now() + timedelta(days=1), status='OPEN')
        TripStop.objects.create(trip=self.trip, route_stop=rs0, sequence=0)
        TripStop.objects.create(trip=self.trip, route_stop=rs1, sequence=1)
        self.tu1 = TripUnit.objects.create(trip=self.trip, layout_unit=lu1, unit_code='P01', kind='CABIN', max_adults=2, max_children=1)
        TripFare.objects.create(trip=self.trip, from_sequence=0, to_sequence=1, unit_kind='CABIN', base_amount=Decimal('500000.00'))

    def _sign_ipn_params(self, params: dict) -> dict:
        secret = os.environ['VNPAY_HASH_SECRET']
        sorted_items = sorted((k, v) for k, v in params.items() if k not in ('vnp_SecureHash', 'vnp_SecureHashType'))
        query_str = urllib.parse.urlencode(sorted_items)
        signed = dict(params)
        signed['vnp_SecureHash'] = _vnpay_hmac_sha512(secret, query_str)
        return signed

    def test_signed_vnpay_url_ipn_verification_and_hmac_qr_checkin(self):
        booking = create_atomic_hold(
            customer=self.customer1,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=1,
            unit_requests=[{'trip_unit_id': str(self.tu1.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        item = booking.items.first()
        assign_passengers_and_pickup(
            customer=self.customer1,
            booking_id=booking.id,
            passengers_data=[{'client_ref': 'p1', 'full_name': 'Nguyen Van A', 'kind': 'ADULT', 'contact_phone': '0901234567'}],
            item_assignments=[{'booking_item_id': str(item.id), 'passenger_refs': ['p1']}],
        )

        intent = create_vnpay_payment_intent(customer=self.customer1, booking_id=booking.id, require_passengers=True)
        parsed = urllib.parse.urlparse(intent.qr_payload)
        qs_params = dict(urllib.parse.parse_qsl(parsed.query))
        self.assertTrue(verify_vnpay_signature(qs_params))
        self.assertEqual(qs_params['vnp_Amount'], '50000000')

        # 1. Wrong amount in signed IPN must be rejected
        bad_amount_ipn = self._sign_ipn_params({
            'vnp_TmnCode': 'RIDEWAYTEST',
            'vnp_TxnRef': intent.provider_reference,
            'vnp_TransactionNo': 'VNP99901',
            'vnp_Amount': '10000000',
            'vnp_ResponseCode': '00',
            'vnp_TransactionStatus': '00',
        })
        resp_bad = self.client.post('/api/v1/webhooks/payments/vnpay', bad_amount_ipn, format='json')
        self.assertEqual(resp_bad.status_code, 400)

        # 2. Valid signed IPN issues ticket and logs OutboxEvent
        good_ipn = self._sign_ipn_params({
            'vnp_TmnCode': 'RIDEWAYTEST',
            'vnp_TxnRef': intent.provider_reference,
            'vnp_TransactionNo': 'VNP99902',
            'vnp_Amount': '50000000',
            'vnp_ResponseCode': '00',
            'vnp_TransactionStatus': '00',
        })
        resp_ok = self.client.post('/api/v1/webhooks/payments/vnpay', good_ipn, format='json')
        self.assertEqual(resp_ok.status_code, 201)
        self.assertEqual(resp_ok.json()['RspCode'], '00')

        # 3. Customer /me/tickets returns qr_token and never exposes qr_token_hash
        self.client.force_login(self.customer1)
        tk_resp = self.client.get('/api/v1/me/tickets')
        self.assertEqual(tk_resp.status_code, 200)
        tk_item = tk_resp.json()['results'][0]
        self.assertIn('qr_token', tk_item)
        self.assertNotIn('qr_token_hash', tk_item)

        db_ticket = Ticket.objects.get(id=tk_item['id'])
        # 4. Attempting to check in using the raw DB qr_token_hash must FAIL (422)
        self.client.force_login(self.op_owner)
        spoof_resp = self.client.post(
            '/api/v1/operators/me/check-in',
            {'qr_token': db_ticket.qr_token_hash},
            format='json',
        )
        self.assertEqual(spoof_resp.status_code, 422)

        # 5. Checking in with the HMAC-signed qr_token succeeds once and fails on second scan
        checkin_ok = self.client.post(
            '/api/v1/operators/me/check-in',
            {'qr_token': tk_item['qr_token']},
            format='json',
        )
        self.assertEqual(checkin_ok.status_code, 201)
        self.assertEqual(checkin_ok.json()['status'], 'USED')

        checkin_dup = self.client.post(
            '/api/v1/operators/me/check-in',
            {'qr_token': tk_item['qr_token']},
            format='json',
        )
        self.assertEqual(checkin_dup.status_code, 422)

    def test_t06_late_payment_webhook_after_hold_expired_and_seat_reallocated(self):
        # Customer 1 holds P01 and initiates payment
        b1 = create_atomic_hold(
            customer=self.customer1,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=1,
            unit_requests=[{'trip_unit_id': str(self.tu1.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        intent1 = create_vnpay_payment_intent(customer=self.customer1, booking_id=b1.id)

        # Hold expires
        past = timezone.now() - timedelta(minutes=2)
        Booking.objects.filter(id=b1.id).update(hold_expires_at=past)
        InventoryAllocation.objects.filter(booking_item__booking=b1).update(expires_at=past)

        # Customer 2 holds P01 on the same segment [0, 1)
        b2 = create_atomic_hold(
            customer=self.customer2,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=1,
            unit_requests=[{'trip_unit_id': str(self.tu1.id), 'adult_count': 1, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        self.assertEqual(b2.status, 'HOLDING')

        # Late VNPay webhook arrives for Customer 1's expired hold
        late_ipn = self._sign_ipn_params({
            'vnp_TmnCode': 'RIDEWAYTEST',
            'vnp_TxnRef': intent1.provider_reference,
            'vnp_TransactionNo': 'VNP99903',
            'vnp_Amount': '50000000',
            'vnp_ResponseCode': '00',
            'vnp_TransactionStatus': '00',
        })
        tx = process_vnpay_ipn(params=late_ipn, verify_signature=True)
        self.assertEqual(tx.status, 'EXCEPTION')
        b1.refresh_from_db()
        self.assertEqual(b1.status, 'EXCEPTION')
        self.assertEqual(Ticket.objects.filter(booking_item__booking=b1).count(), 0)
