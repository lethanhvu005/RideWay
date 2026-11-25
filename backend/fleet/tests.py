"""Phase 5 Fleet tests: Operator vehicle management, cross-tenant protection, and layout immutability when bound to trips."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Operator, OperatorMembership
from catalog.models import Location, Route, RouteStop, Trip, TripUnit
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType

User = get_user_model()


class FleetOperatorIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner_a = User.objects.create_user(email='owner.a@vexuyenviet.vn', password='StrongPassword#2026')
        self.owner_b = User.objects.create_user(email='owner.b@vexuyenviet.vn', password='StrongPassword#2026')
        self.op_a = Operator.objects.create(name='Hãng Xe A', status='ACTIVE')
        self.op_b = Operator.objects.create(name='Hãng Xe B', status='ACTIVE')
        OperatorMembership.objects.create(user=self.owner_a, operator=self.op_a, role='OWNER')
        OperatorMembership.objects.create(user=self.owner_b, operator=self.op_b, role='OWNER')

        self.vtype = VehicleType.objects.create(code='BED_34', name='Giường nằm 34 chỗ')
        self.layout_a = SeatLayout.objects.create(operator=self.op_a, name='Sơ đồ A', deck_count=2)
        self.lu_a = LayoutUnit.objects.create(
            layout=self.layout_a, unit_code='G01', kind='BED', deck=1, row_number=1, column_number=1, max_adults=1, max_children=0
        )

    def test_cross_tenant_layout_blocked_and_bound_layout_immutable(self):
        # Operator B cannot create a vehicle using Operator A's layout
        self.client.force_login(self.owner_b)
        cross_resp = self.client.post(
            '/api/v1/operators/me/vehicles',
            {'type_id': str(self.vtype.id), 'layout_id': str(self.layout_a.id), 'registration': '43B-12345'},
            format='json',
        )
        self.assertEqual(cross_resp.status_code, 422)
        self.assertEqual(cross_resp.json()['code'], 'CROSS_TENANT_LAYOUT')

        # Operator A creates vehicle and binds it to a trip
        self.client.force_login(self.owner_a)
        veh_resp = self.client.post(
            '/api/v1/operators/me/vehicles',
            {'type_id': str(self.vtype.id), 'layout_id': str(self.layout_a.id), 'registration': '51B-12345'},
            format='json',
        )
        self.assertEqual(veh_resp.status_code, 201)
        veh_id = veh_resp.json()['id']

        route = Route.objects.create(operator=self.op_a, name='Tuyến A')
        RouteStop.objects.create(route=route, location=Location.objects.create(name='Điểm 1'), sequence=0)
        RouteStop.objects.create(route=route, location=Location.objects.create(name='Điểm 2'), sequence=1)
        trip = Trip.objects.create(route=route, vehicle_id=veh_id, departure_at=timezone.now() + timedelta(days=1), status='DRAFT')
        TripUnit.objects.create(trip=trip, layout_unit=self.lu_a, unit_code='G01', kind='BED', max_adults=1, max_children=0)

        # Adding another unit to layout_a after TripUnit exists must return 409 LAYOUT_IN_USE
        add_unit = self.client.post(
            f'/api/v1/operators/me/layouts/{self.layout_a.id}/units',
            {'unit_code': 'G02', 'kind': 'BED', 'deck': 1, 'row_number': 1, 'column_number': 2, 'max_adults': 1, 'max_children': 0},
            format='json',
        )
        self.assertEqual(add_unit.status_code, 409)
        self.assertEqual(add_unit.json()['code'], 'LAYOUT_IN_USE')
