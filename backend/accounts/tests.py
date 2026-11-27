"""Phase 2 P0 Security, Authentication, RBAC, and PostgreSQL Database Constraint tests."""
from datetime import date, timedelta
from decimal import Decimal
import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Operator, OperatorMembership
from bookings.models import Booking, BookingItem
from catalog.models import Location, Route, RouteStop, Trip, TripUnit
from content.models import OutboxEvent
from finance.models import CommissionAgreement, Settlement, SettlementLine
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType

User = get_user_model()


@override_settings(
    MAILERS={'default': {'BACKEND': 'django.core.mail.backends.locmem.EmailBackend'}},
)
class AccountsSecurityAndConstraintTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='alice@vexuyenviet.vn',
            password='StrongPassword#2026',
            full_name='Alice Nguyen',
        )
        self.staff = User.objects.create_user(
            email='staff@vexuyenviet.vn',
            password='StrongPassword#2026',
            full_name='Platform Staff',
            is_staff=True,
        )
        self.admin = User.objects.create_superuser(
            email='root@vexuyenviet.vn',
            password='StrongPassword#2026',
            full_name='Root Admin',
        )

    def test_csrf_endpoint_sets_cookie_and_returns_token(self):
        resp = self.client.get('/api/v1/auth/csrf')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('csrfToken', resp.json())
        self.assertIn('csrftoken', resp.cookies)

    def test_register_enforces_django_password_validators_and_queues_outbox(self):
        # Weak common/numeric password must be rejected with 422 WEAK_PASSWORD
        weak_resp = self.client.post(
            '/api/v1/auth/register',
            {'email': 'newuser@vexuyenviet.vn', 'password': '12345678', 'full_name': 'New User'},
            format='json',
        )
        self.assertEqual(weak_resp.status_code, 422)
        self.assertEqual(weak_resp.json()['code'], 'WEAK_PASSWORD')

        # Strong password succeeds and does NOT leak verification token in response
        ok_resp = self.client.post(
            '/api/v1/auth/register',
            {'email': 'newuser@vexuyenviet.vn', 'password': 'SafeTravel#2026!', 'full_name': 'New User'},
            format='json',
        )
        self.assertEqual(ok_resp.status_code, 201)
        body = ok_resp.json()
        self.assertNotIn('token', body)
        self.assertNotIn('uid', body)
        self.assertTrue(
            OutboxEvent.objects.filter(
                event_type='EMAIL_VERIFICATION_REQUESTED',
                payload__email='newuser@vexuyenviet.vn',
            ).exists()
        )

    def test_login_logout_and_uniform_error_message(self):
        bad_user = self.client.post(
            '/api/v1/auth/login',
            {'email': 'nonexistent@vexuyenviet.vn', 'password': 'WrongPassword#1'},
            format='json',
        )
        bad_pwd = self.client.post(
            '/api/v1/auth/login',
            {'email': 'alice@vexuyenviet.vn', 'password': 'WrongPassword#1'},
            format='json',
        )
        self.assertEqual(bad_user.status_code, 401)
        self.assertEqual(bad_pwd.status_code, 401)
        self.assertEqual(bad_user.json()['detail'], bad_pwd.json()['detail'])

        ok = self.client.post(
            '/api/v1/auth/login',
            {'email': 'alice@vexuyenviet.vn', 'password': 'StrongPassword#2026'},
            format='json',
        )
        self.assertEqual(ok.status_code, 201)
        me = self.client.get('/api/v1/me')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()['email'], 'alice@vexuyenviet.vn')

        out = self.client.post('/api/v1/auth/logout')
        self.assertEqual(out.status_code, 204)
        self.assertEqual(self.client.get('/api/v1/me').status_code, 403)

    def test_password_reset_does_not_leak_token_or_account_existence(self):
        mail.outbox.clear()
        r_unknown = self.client.post(
            '/api/v1/auth/password-reset/request',
            {'email': 'nobody@vexuyenviet.vn'},
            format='json',
        )
        self.assertEqual(r_unknown.status_code, 200)
        self.assertNotIn('token', r_unknown.json())
        self.assertNotIn('uid', r_unknown.json())
        self.assertEqual(len(mail.outbox), 0)

        r_known = self.client.post(
            '/api/v1/auth/password-reset/request',
            {'email': 'alice@vexuyenviet.vn'},
            format='json',
        )
        self.assertEqual(r_known.status_code, 200)
        self.assertEqual(r_known.json(), r_unknown.json())
        self.assertNotIn('token', r_known.json())
        self.assertNotIn('uid', r_known.json())
        self.assertEqual(len(mail.outbox), 1)

        # Extract uid & token from sent email body
        match = re.search(r'uid=([^\s]+)\s+token=([^\s]+)', mail.outbox[0].body)
        self.assertIsNotNone(match)
        uid, token = match.group(1), match.group(2)

        # Weak new password rejected
        weak_confirm = self.client.post(
            '/api/v1/auth/password-reset/confirm',
            {'uid': uid, 'token': token, 'password': 'password123'},
            format='json',
        )
        self.assertEqual(weak_confirm.status_code, 422)

        # Strong new password accepted
        ok_confirm = self.client.post(
            '/api/v1/auth/password-reset/confirm',
            {'uid': uid, 'token': token, 'password': 'UpdatedStrong#2026!'},
            format='json',
        )
        self.assertEqual(ok_confirm.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('UpdatedStrong#2026!'))

    def test_email_verification_does_not_leak_token_in_http_response(self):
        mail.outbox.clear()
        self.client.force_login(self.user)
        req_resp = self.client.post('/api/v1/auth/email-verification/request')
        self.assertEqual(req_resp.status_code, 200)
        self.assertNotIn('token', req_resp.json())
        self.assertNotIn('uid', req_resp.json())
        self.assertEqual(len(mail.outbox), 1)

        match = re.search(r'uid=([^\s]+)\s+token=([^\s]+)', mail.outbox[0].body)
        uid, token = match.group(1), match.group(2)
        conf_resp = self.client.post(
            '/api/v1/auth/email-verification/confirm',
            {'uid': uid, 'token': token},
            format='json',
        )
        self.assertEqual(conf_resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.email_verified_at)

    def test_operator_registration_self_profile_and_rbac(self):
        self.client.force_login(self.user)
        reg = self.client.post(
            '/api/v1/operators/register',
            {'name': 'Nhà xe Hải Vân', 'legal_name': 'Công ty TNHH Hải Vân', 'contact_email': 'contact@haivan.vn'},
            format='json',
        )
        self.assertEqual(reg.status_code, 201)
        op_id = reg.json()['id']
        self.assertEqual(reg.json()['status'], 'DRAFT')

        # Owner can update operator profile and add staff
        patch_resp = self.client.patch(
            '/api/v1/operators/me',
            {'legal_name': 'Công ty Cổ phần Hải Vân Express'},
            format='json',
        )
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.json()['legal_name'], 'Công ty Cổ phần Hải Vân Express')

        staff_user = User.objects.create_user(email='checkin@haivan.vn', password='StrongPassword#2026')
        add_m = self.client.post(
            '/api/v1/operators/me/memberships',
            {'email': 'checkin@haivan.vn', 'role': 'STAFF'},
            format='json',
        )
        self.assertEqual(add_m.status_code, 201)

        # Staff member cannot add other memberships (OWNER only)
        self.client.force_login(staff_user)
        forbidden = self.client.post(
            '/api/v1/operators/me/memberships',
            {'email': 'alice@vexuyenviet.vn', 'role': 'MANAGER'},
            format='json',
        )
        self.assertEqual(forbidden.status_code, 403)

        # Platform staff can list operators, but cannot approve status (Admin only)
        self.client.force_login(self.staff)
        self.assertEqual(self.client.get('/api/v1/admin/operators').status_code, 200)
        self.assertEqual(
            self.client.patch(f'/api/v1/admin/operators/{op_id}/status', {'status': 'ACTIVE'}, format='json').status_code,
            403,
        )

        # Platform admin can approve status
        self.client.force_login(self.admin)
        self.assertEqual(
            self.client.patch(f'/api/v1/admin/operators/{op_id}/status', {'status': 'ACTIVE'}, format='json').status_code,
            200,
        )

    def test_postgresql_database_constraints_for_layout_and_finance(self):
        op = Operator.objects.create(name='Hãng Kiểm Thử DB', status='ACTIVE')
        layout = SeatLayout.objects.create(operator=op, name='Sơ đồ 2 tầng', deck_count=2)
        LayoutUnit.objects.create(
            layout=layout, unit_code='P01', kind='CABIN', deck=1, row_number=1, column_number=1, max_adults=2, max_children=1
        )

        # Duplicate grid coordinates (layout, deck, row_number, column_number) must fail
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                LayoutUnit.objects.create(
                    layout=layout, unit_code='P02', kind='CABIN', deck=1, row_number=1, column_number=1, max_adults=2, max_children=1
                )

        # Invalid capacity max_adults=0 must fail ck_layout_unit_capacity
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                LayoutUnit.objects.create(
                    layout=layout, unit_code='P03', kind='CABIN', deck=1, row_number=2, column_number=1, max_adults=0, max_children=0
                )

        # Invalid commission agreement date range (effective_to < effective_from) must fail
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CommissionAgreement.objects.create(
                    operator=op,
                    percentage=Decimal('10.00'),
                    effective_from=date(2026, 6, 1),
                    effective_to=date(2026, 5, 1),
                )

        # Duplicate booking_item across two different settlements must fail uq_settlement_line_single_booking_item
        vt = VehicleType.objects.create(code='LIMO_DB', name='Limo DB')
        lu = LayoutUnit.objects.filter(layout=layout, unit_code='P01').first()
        veh = Vehicle.objects.create(operator=op, type=vt, layout=layout, registration='43B-99999')
        loc1 = Location.objects.create(name='Đầu A')
        loc2 = Location.objects.create(name='Đầu B')
        route = Route.objects.create(operator=op, name='Tuyến A-B')
        RouteStop.objects.create(route=route, location=loc1, sequence=0)
        RouteStop.objects.create(route=route, location=loc2, sequence=1)
        trip = Trip.objects.create(route=route, vehicle=veh, departure_at='2026-12-01T08:00:00Z', status='OPEN')
        tu = TripUnit.objects.create(trip=trip, layout_unit=lu, unit_code='P01', kind='CABIN', max_adults=2, max_children=1)
        bk = Booking.objects.create(
            customer=self.user, booking_code='VXV-DB01', status='CONFIRMED',
            hold_expires_at='2026-12-01T07:00:00Z', contact_email=self.user.email,
            total_amount=Decimal('500000.00'), idempotency_key='idem-db-01',
        )
        b_item = BookingItem.objects.create(
            booking=bk, trip_unit=tu, from_sequence=0, to_sequence=1,
            adult_count=2, child_count=0, unit_price=Decimal('500000.00'),
        )
        s1 = Settlement.objects.create(operator=op, period_start=date(2026, 11, 1), period_end=date(2026, 11, 15), gross_amount=Decimal('500000.00'))
        s2 = Settlement.objects.create(operator=op, period_start=date(2026, 11, 16), period_end=date(2026, 11, 30), gross_amount=Decimal('500000.00'))
        SettlementLine.objects.create(settlement=s1, booking_item=b_item, gross_amount=Decimal('500000.00'))
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SettlementLine.objects.create(settlement=s2, booking_item=b_item, gross_amount=Decimal('500000.00'))
