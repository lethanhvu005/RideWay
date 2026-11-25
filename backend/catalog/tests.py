"""Phase 3 & Phase 5 tests: Segment-aware Trip Search, Exact Segment Pricing, Available Units, and Operator Catalog controls."""
from datetime import timedelta
from decimal import Decimal
import uuid

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.utils import timezone
from psycopg.types.range import Range
from rest_framework.test import APIClient

from accounts.models import Operator, OperatorMembership
from bookings.services import create_atomic_hold
from catalog.models import Location, PickupOption, Route, RouteStop, Trip, TripFare, TripStop, TripUnit
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType
from inventory.models import InventoryAllocation

User = get_user_model()


class CatalogSearchAndOperatorTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email='owner@futabus.vn', password='StrongPassword#2026')
        self.customer = User.objects.create_user(email='pax@vexuyenviet.vn', password='StrongPassword#2026')
        self.operator = Operator.objects.create(name='Phương Trang FUTA', status='ACTIVE')
        OperatorMembership.objects.create(user=self.owner, operator=self.operator, role='OWNER')

        self.vtype = VehicleType.objects.create(code='LIMO_20_CAT', name='Limousine 20 Phòng Đôi')
        self.layout = SeatLayout.objects.create(operator=self.operator, name='Sơ đồ 2 tầng', deck_count=2)
        self.lu1 = LayoutUnit.objects.create(
            layout=self.layout, unit_code='P01', kind='CABIN', deck=1, row_number=1, column_number=1, max_adults=2, max_children=1
        )
        self.lu2 = LayoutUnit.objects.create(
            layout=self.layout, unit_code='P02', kind='CABIN', deck=2, row_number=1, column_number=1, max_adults=2, max_children=1
        )
        self.vehicle = Vehicle.objects.create(
            operator=self.operator, type=self.vtype, layout=self.layout, registration='51B-88888'
        )

        # Route A (0) -> B (1) -> C (2) -> D (3)
        self.loc_a = Location.objects.create(name='Bến A Hà Nội', province='Hà Nội')
        self.loc_b = Location.objects.create(name='Bến B Huế', province='Thừa Thiên Huế')
        self.loc_c = Location.objects.create(name='Bến C Đà Nẵng', province='Đà Nẵng')
        self.loc_d = Location.objects.create(name='Bến D TP.HCM', province='TP.HCM')

        self.route = Route.objects.create(operator=self.operator, name='Hà Nội - Huế - Đà Nẵng - TP.HCM')
        self.rs_a = RouteStop.objects.create(route=self.route, location=self.loc_a, sequence=0, allow_pickup=True, allow_dropoff=False)
        self.rs_b = RouteStop.objects.create(route=self.route, location=self.loc_b, sequence=1, allow_pickup=True, allow_dropoff=True)
        self.rs_c = RouteStop.objects.create(route=self.route, location=self.loc_c, sequence=2, allow_pickup=True, allow_dropoff=True)
        self.rs_d = RouteStop.objects.create(route=self.route, location=self.loc_d, sequence=3, allow_pickup=False, allow_dropoff=True)

        dep_time = timezone.now() + timedelta(days=2)
        self.trip = Trip.objects.create(route=self.route, vehicle=self.vehicle, departure_at=dep_time, status='OPEN')
        for idx, rs in enumerate([self.rs_a, self.rs_b, self.rs_c, self.rs_d]):
            TripStop.objects.create(
                trip=self.trip, route_stop=rs, sequence=rs.sequence, scheduled_at=dep_time + timedelta(hours=idx * 4)
            )
        self.tu1 = TripUnit.objects.create(trip=self.trip, layout_unit=self.lu1, unit_code='P01', kind='CABIN', max_adults=2, max_children=1)
        self.tu2 = TripUnit.objects.create(trip=self.trip, layout_unit=self.lu2, unit_code='P02', kind='CABIN', max_adults=2, max_children=1)

        # Distinct segment fares
        TripFare.objects.create(trip=self.trip, from_sequence=0, to_sequence=1, unit_kind='CABIN', base_amount=Decimal('150000.00'))
        TripFare.objects.create(trip=self.trip, from_sequence=0, to_sequence=2, unit_kind='CABIN', base_amount=Decimal('450000.00'))
        TripFare.objects.create(trip=self.trip, from_sequence=1, to_sequence=3, unit_kind='CABIN', base_amount=Decimal('680000.00'), child_extra_amount=Decimal('80000.00'))
        TripFare.objects.create(trip=self.trip, from_sequence=0, to_sequence=3, unit_kind='CABIN', base_amount=Decimal('1150000.00'))

    def test_search_exact_segment_price_direction_and_available_units(self):
        # 1. Search B -> D ([1, 3)) must return exact price 680000.00, NOT 150000.00 or 1150000.00
        resp = self.client.get(f'/api/v1/trips?from_location_id={self.loc_b.id}&to_location_id={self.loc_d.id}')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['count'], 1)
        item = data['results'][0]
        self.assertEqual(item['from_sequence'], 1)
        self.assertEqual(item['to_sequence'], 3)
        self.assertEqual(item['min_price'], '680000.00')
        self.assertEqual(item['available_units'], 2)

        # 2. Reverse search D -> B must return 0 trips
        rev = self.client.get(f'/api/v1/trips?from_location_id={self.loc_d.id}&to_location_id={self.loc_b.id}')
        self.assertEqual(rev.status_code, 200)
        self.assertEqual(rev.json()['count'], 0)

        # 3. Hold P01 on A -> B ([0, 1)) -> B -> D ([1, 3)) must STILL have 2 available units!
        create_atomic_hold(
            customer=self.customer,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=1,
            unit_requests=[{'trip_unit_id': str(self.tu1.id), 'adult_count': 2, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        resp_adj = self.client.get(f'/api/v1/trips?from_location_id={self.loc_b.id}&to_location_id={self.loc_d.id}')
        self.assertEqual(resp_adj.json()['results'][0]['available_units'], 2)

        # 4. Hold P02 on A -> C ([0, 2)) -> overlaps B -> D ([1, 3)), so B -> D available_units drops to 1
        create_atomic_hold(
            customer=self.customer,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=2,
            unit_requests=[{'trip_unit_id': str(self.tu2.id), 'adult_count': 2, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        resp_ov = self.client.get(f'/api/v1/trips?from_location_id={self.loc_b.id}&to_location_id={self.loc_d.id}')
        self.assertEqual(resp_ov.json()['results'][0]['available_units'], 1)

    def test_trip_detail_and_blocked_units_t10(self):
        PickupOption.objects.create(operator=self.operator, route_stop=self.rs_b, name='Đón Ngã Ba Huế', kind='FIXED', fee=Decimal('0.00'))
        detail = self.client.get(f'/api/v1/trips/{self.trip.id}')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.json()['stops']), 4)
        self.assertEqual(len(detail.json()['pickup_options']), 1)

        # Block unit P01 on [1, 3) (T10)
        InventoryAllocation.objects.create(
            trip_unit=self.tu1, booking_item=None, section=Range(1, 3, '[)'), status='BLOCKED'
        )
        units_resp = self.client.get(f'/api/v1/trips/{self.trip.id}/units?from_sequence=1&to_sequence=3&exclude_blocked=true')
        self.assertEqual(units_resp.status_code, 200)
        returned_codes = [u['unit_code'] for u in units_resp.json()['units']]
        self.assertEqual(returned_codes, ['P02'])

    def test_route_stop_immutability_and_trip_cancellation_release(self):
        self.client.force_login(self.owner)
        # Adding a stop to a route that already has a trip must return 409 ROUTE_HAS_TRIPS
        loc_e = Location.objects.create(name='Bến E Cần Thơ')
        add_stop = self.client.post(
            f'/api/v1/operators/me/routes/{self.route.id}/stops',
            {'location_id': str(loc_e.id), 'sequence': 4},
            format='json',
        )
        self.assertEqual(add_stop.status_code, 409)
        self.assertEqual(add_stop.json()['code'], 'ROUTE_HAS_TRIPS')

        # Hold a unit on the trip, then cancel the trip -> allocation must be RELEASED
        create_atomic_hold(
            customer=self.customer,
            trip_id=self.trip.id,
            from_sequence=0,
            to_sequence=2,
            unit_requests=[{'trip_unit_id': str(self.tu1.id), 'adult_count': 2, 'child_count': 0}],
            idempotency_key=str(uuid.uuid4()),
        )
        cancel_resp = self.client.patch(
            f'/api/v1/operators/me/trips/{self.trip.id}/status',
            {'status': 'CANCELLED'},
            format='json',
        )
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertEqual(
            InventoryAllocation.objects.filter(trip_unit=self.tu1, status='RELEASED').count(),
            1,
        )
