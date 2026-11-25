"""Catalog, Search, Routes, Trips, Fares & PickupOptions APIs (8 DB tables)."""
from datetime import time
from decimal import Decimal
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import BookingItem, BookingItemPassenger
from catalog.models import Location, PickupOption, Route, RouteStop, Trip, TripFare, TripStop, TripUnit
from common import (
    IsOperatorManagerOrOwner,
    IsOperatorMember,
    IsPlatformAdmin,
    IsPlatformStaffOrAdmin,
    api_error,
    get_active_operator_ids,
)
from content.models import AuditLog, OutboxEvent
from fleet.models import LayoutUnit, Vehicle
from inventory.models import InventoryAllocation
from payments.models import Ticket


class LocationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        qs = Location.objects.all().order_by('name')
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(province__icontains=q))
        return Response({'results': list(qs.values('id', 'name', 'province', 'address')[:50])})


class AdminLocationCreateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return api_error('Location name is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        loc = Location.objects.create(
            name=name,
            province=(request.data.get('province') or '').strip(),
            address=(request.data.get('address') or '').strip(),
        )
        return Response({'id': str(loc.id), 'name': loc.name}, status=status.HTTP_201_CREATED)


def _parse_hhmm(val: str | None) -> time | None:
    if not val:
        return None
    parts = val.strip().split(':')
    if len(parts) < 2:
        return None
    return time(int(parts[0]), int(parts[1]))


class TripSearchView(APIView):
    """
    Segment-aware trip search (FR-05, FR-06, BR-05):
    - Enforces stop ordering: from_stop.sequence < to_stop.sequence
    - Enforces boarding allow_pickup=True and alighting allow_dropoff=True
    - Computes exact segment price [from_sequence, to_sequence) and available unit count on that segment
    """

    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        qs = (
            Trip.objects.filter(status='OPEN', route__operator__status='ACTIVE')
            .select_related('route', 'route__operator', 'vehicle', 'vehicle__type')
            .prefetch_related('stops__route_stop__location', 'tripfare_set', 'units')
        )

        operator_id = request.query_params.get('operator_id')
        if operator_id:
            qs = qs.filter(route__operator_id=operator_id)

        vehicle_type_id = request.query_params.get('vehicle_type_id')
        if vehicle_type_id:
            qs = qs.filter(vehicle__type_id=vehicle_type_id)

        vehicle_type_code = request.query_params.get('vehicle_type')
        if vehicle_type_code:
            qs = qs.filter(
                Q(vehicle__type__code__iexact=vehicle_type_code)
                | Q(vehicle__type__name__icontains=vehicle_type_code)
            )

        unit_kind = (request.query_params.get('unit_kind') or '').strip().upper()
        if unit_kind:
            qs = qs.filter(units__kind=unit_kind).distinct()

        date_str = request.query_params.get('departure_date') or request.query_params.get('date')
        if date_str:
            qs = qs.filter(departure_at__date=date_str)

        dep_from = _parse_hhmm(request.query_params.get('departure_from'))
        if dep_from:
            qs = qs.filter(departure_at__time__gte=dep_from)
        dep_to = _parse_hhmm(request.query_params.get('departure_to'))
        if dep_to:
            qs = qs.filter(departure_at__time__lte=dep_to)

        from_loc = request.query_params.get('from_location_id')
        to_loc = request.query_params.get('to_location_id')
        param_from_seq = request.query_params.get('from_sequence')
        param_to_seq = request.query_params.get('to_sequence')

        min_price_filter = (
            Decimal(str(request.query_params['min_price']))
            if request.query_params.get('min_price') not in (None, '')
            else None
        )
        max_price_filter = (
            Decimal(str(request.query_params['max_price']))
            if request.query_params.get('max_price') not in (None, '')
            else None
        )

        explicit_segment = bool(from_loc or to_loc or (param_from_seq is not None and param_to_seq is not None))

        candidate_trips = list(qs[:100])
        results = []

        for t in candidate_trips:
            stops = sorted(t.stops.all(), key=lambda s: s.sequence)
            if len(stops) < 2:
                continue

            from_stop = None
            to_stop = None

            if param_from_seq is not None and param_to_seq is not None:
                f_seq = int(param_from_seq)
                t_seq = int(param_to_seq)
                from_stop = next((s for s in stops if s.sequence == f_seq and s.route_stop.allow_pickup), None)
                to_stop = next((s for s in stops if s.sequence == t_seq and s.route_stop.allow_dropoff), None)
            elif from_loc and to_loc:
                from_stop = next(
                    (s for s in stops if str(s.route_stop.location_id) == str(from_loc) and s.route_stop.allow_pickup),
                    None,
                )
                to_stop = next(
                    (
                        s
                        for s in stops
                        if str(s.route_stop.location_id) == str(to_loc)
                        and s.route_stop.allow_dropoff
                        and (from_stop is None or s.sequence > from_stop.sequence)
                    ),
                    None,
                )
            elif from_loc:
                from_stop = next(
                    (s for s in stops if str(s.route_stop.location_id) == str(from_loc) and s.route_stop.allow_pickup),
                    None,
                )
                to_stop = stops[-1] if stops[-1].route_stop.allow_dropoff else None
            elif to_loc:
                from_stop = stops[0] if stops[0].route_stop.allow_pickup else None
                to_stop = next(
                    (s for s in stops if str(s.route_stop.location_id) == str(to_loc) and s.route_stop.allow_dropoff),
                    None,
                )
            else:
                from_stop = stops[0]
                to_stop = stops[-1]

            if not from_stop or not to_stop or from_stop.sequence >= to_stop.sequence:
                continue

            seg_from = from_stop.sequence
            seg_to = to_stop.sequence

            # Compute exact segment fare for [seg_from, seg_to) (BR-05)
            all_fares = list(t.tripfare_set.all())
            segment_fares = [
                f
                for f in all_fares
                if f.from_sequence == seg_from
                and f.to_sequence == seg_to
                and (not unit_kind or f.unit_kind == unit_kind)
            ]

            if not segment_fares:
                if explicit_segment:
                    # Do NOT substitute another segment's fare when a specific segment was searched
                    continue
                # For unfiltered general homepage listing, fallback to lowest fare on trip
                fallback_fares = [f for f in all_fares if not unit_kind or f.unit_kind == unit_kind]
                if not fallback_fares:
                    continue
                seg_min_price = min(f.base_amount for f in fallback_fares)
            else:
                seg_min_price = min(f.base_amount for f in segment_fares)

            if min_price_filter is not None and seg_min_price < min_price_filter:
                continue
            if max_price_filter is not None and seg_min_price > max_price_filter:
                continue

            # Count available units on [seg_from, seg_to)
            trip_units = [u for u in t.units.all() if not unit_kind or u.kind == unit_kind]
            blocked_unit_ids = set(
                InventoryAllocation.objects.filter(
                    trip_unit__trip_id=t.id,
                    status__in=['HELD', 'CONFIRMED', 'BLOCKED'],
                    section__overlap=(seg_from, seg_to),
                )
                .exclude(status='HELD', expires_at__lte=now)
                .values_list('trip_unit_id', flat=True)
            )
            available_count = sum(1 for u in trip_units if u.id not in blocked_unit_ids)

            results.append({
                'id': str(t.id),
                'route_id': str(t.route_id),
                'route_name': t.route.name,
                'operator_id': str(t.route.operator_id),
                'operator_name': t.route.operator.name,
                'vehicle_type': t.vehicle.type.name,
                'vehicle_type_code': t.vehicle.type.code,
                'departure_at': t.departure_at,
                'boarding_at': from_stop.scheduled_at or t.departure_at,
                'from_sequence': seg_from,
                'to_sequence': seg_to,
                'from_location_name': from_stop.route_stop.location.name,
                'to_location_name': to_stop.route_stop.location.name,
                'min_price': str(seg_min_price),
                'available_units': available_count,
                'total_units': len(trip_units),
                '_sort_price': seg_min_price,
                '_sort_dep': t.departure_at,
            })

        sort_by = request.query_params.get('sort', 'price_asc')
        if sort_by == 'price_desc':
            results.sort(key=lambda r: (-r['_sort_price'], r['_sort_dep']))
        elif sort_by == 'departure_asc':
            results.sort(key=lambda r: (r['_sort_dep'], r['_sort_price']))
        else:
            results.sort(key=lambda r: (r['_sort_price'], r['_sort_dep']))

        for r in results:
            r.pop('_sort_price', None)
            r.pop('_sort_dep', None)

        return Response({'count': len(results), 'results': results[:50]})


class TripDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, trip_id):
        trip = (
            Trip.objects.select_related('route', 'route__operator', 'vehicle', 'vehicle__type', 'vehicle__layout')
            .filter(id=trip_id)
            .first()
        )
        if not trip:
            return api_error('Trip not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        stops = list(
            TripStop.objects.filter(trip=trip)
            .select_related('route_stop__location')
            .order_by('sequence')
            .values(
                'sequence',
                'scheduled_at',
                'route_stop_id',
                'route_stop__location_id',
                'route_stop__location__name',
                'route_stop__location__province',
                'route_stop__allow_pickup',
                'route_stop__allow_dropoff',
            )
        )
        fares = list(
            TripFare.objects.filter(trip=trip)
            .order_by('from_sequence', 'to_sequence', 'unit_kind')
            .values('id', 'from_sequence', 'to_sequence', 'unit_kind', 'base_amount', 'child_extra_amount', 'currency')
        )
        pickup_options = list(
            PickupOption.objects.filter(route_stop__route=trip.route, is_active=True)
            .order_by('route_stop__sequence', 'name')
            .values('id', 'route_stop_id', 'route_stop__sequence', 'name', 'kind', 'fee')
        )
        return Response({
            'id': str(trip.id),
            'status': trip.status,
            'departure_at': trip.departure_at,
            'route_id': str(trip.route_id),
            'route_name': trip.route.name,
            'operator_id': str(trip.route.operator_id),
            'operator_name': trip.route.operator.name,
            'vehicle_type': trip.vehicle.type.name,
            'deck_count': trip.vehicle.layout.deck_count,
            'stops': stops,
            'fares': fares,
            'pickup_options': pickup_options,
        })


class TripUnitsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, trip_id):
        from_seq = int(request.query_params.get('from_sequence', 0))
        to_seq = int(request.query_params.get('to_sequence', 1))
        if from_seq >= to_seq:
            return api_error('from_sequence must be < to_sequence.', 'INVALID_SEGMENT', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        now = timezone.now()
        units = list(
            TripUnit.objects.filter(trip_id=trip_id)
            .select_related('layout_unit')
            .order_by('layout_unit__deck', 'layout_unit__row_number', 'layout_unit__column_number')
        )
        active_allocs = list(
            InventoryAllocation.objects.filter(
                trip_unit__trip_id=trip_id,
                status__in=['HELD', 'CONFIRMED', 'BLOCKED'],
                section__overlap=(from_seq, to_seq),
            )
            .exclude(status='HELD', expires_at__lte=now)
            .values('trip_unit_id', 'status')
        )
        unavailable_ids = {a['trip_unit_id'] for a in active_allocs}
        blocked_only_ids = {a['trip_unit_id'] for a in active_allocs if a['status'] == 'BLOCKED'}

        fares = {
            f.unit_kind: f
            for f in TripFare.objects.filter(trip_id=trip_id, from_sequence=from_seq, to_sequence=to_seq)
        }
        exclude_blocked = request.query_params.get('exclude_blocked', '').lower() in ('true', '1')
        unit_rows = []
        for u in units:
            if exclude_blocked and u.id in blocked_only_ids:
                continue
            fare_obj = fares.get(u.kind)
            unit_rows.append({
                'id': str(u.id),
                'unit_code': u.unit_code,
                'kind': u.kind,
                'deck': u.layout_unit.deck,
                'row': u.layout_unit.row_number,
                'col': u.layout_unit.column_number,
                'max_adults': u.max_adults,
                'max_children': u.max_children,
                'price': str(fare_obj.base_amount) if fare_obj else None,
                'child_extra_amount': str(fare_obj.child_extra_amount) if (fare_obj and fare_obj.child_extra_amount is not None) else None,
                'available': u.id not in unavailable_ids,
                'blocked': u.id in blocked_only_ids,
            })

        return Response({
            'trip_id': str(trip_id),
            'from_sequence': from_seq,
            'to_sequence': to_seq,
            'units': unit_rows,
        })


class OperatorRoutesView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(Route.objects.filter(operator_id__in=op_ids).values('id', 'operator_id', 'name', 'is_active'))
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Forbidden.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        name = (request.data.get('name') or '').strip()
        if not name:
            return api_error('Route name is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        r = Route.objects.create(operator_id=op_ids[0], name=name)
        return Response({'id': str(r.id), 'name': r.name, 'is_active': r.is_active}, status=status.HTTP_201_CREATED)


class OperatorRouteDetailView(APIView):
    permission_classes = [IsOperatorManagerOrOwner]

    def patch(self, request, route_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        route = Route.objects.filter(id=route_id, operator_id__in=op_ids).first()
        if not route:
            return api_error('Route not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        if 'name' in request.data:
            new_name = (request.data.get('name') or '').strip()
            if not new_name:
                return api_error('Route name cannot be empty.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
            route.name = new_name
        if 'is_active' in request.data:
            route.is_active = bool(request.data['is_active'])
        route.save()
        return Response({'id': str(route.id), 'name': route.name, 'is_active': route.is_active})


class OperatorRouteStopsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request, route_id):
        op_ids = get_active_operator_ids(request.user, request=request)
        route = Route.objects.filter(id=route_id, operator_id__in=op_ids).first()
        if not route:
            return api_error('Route not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        rows = list(
            RouteStop.objects.filter(route=route)
            .order_by('sequence')
            .values('id', 'location_id', 'location__name', 'sequence', 'allow_pickup', 'allow_dropoff')
        )
        return Response({'results': rows})

    def post(self, request, route_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        route = Route.objects.filter(id=route_id, operator_id__in=op_ids).first()
        if not route:
            return api_error('Route not found or forbidden.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        if Trip.objects.filter(route=route).exists():
            return api_error(
                'Cannot add or modify route stops after trips have been created for this route.',
                'ROUTE_HAS_TRIPS',
                status.HTTP_409_CONFLICT,
                request,
            )
        location_id = request.data.get('location_id')
        if not location_id or not Location.objects.filter(id=location_id).exists():
            return api_error('Valid location_id is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        try:
            seq = int(request.data['sequence'])
        except (KeyError, TypeError, ValueError):
            return api_error('sequence must be a non-negative integer.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        try:
            with transaction.atomic():
                rs = RouteStop.objects.create(
                    route=route,
                    location_id=location_id,
                    sequence=seq,
                    allow_pickup=bool(request.data.get('allow_pickup', True)),
                    allow_dropoff=bool(request.data.get('allow_dropoff', True)),
                )
        except IntegrityError:
            return api_error('Duplicate stop sequence on route.', 'DUPLICATE_STOP_SEQUENCE', status.HTTP_409_CONFLICT, request)
        return Response({'id': str(rs.id), 'sequence': rs.sequence}, status=status.HTTP_201_CREATED)


class OperatorTripsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(
            Trip.objects.filter(route__operator_id__in=op_ids)
            .select_related('route', 'vehicle')
            .order_by('-departure_at')
            .values('id', 'route_id', 'route__name', 'vehicle_id', 'vehicle__registration', 'departure_at', 'status')
        )
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Forbidden.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        route = Route.objects.filter(id=request.data.get('route_id'), operator_id__in=op_ids).first()
        vehicle = Vehicle.objects.filter(id=request.data.get('vehicle_id'), operator_id__in=op_ids, active=True).first()
        if not route or not vehicle or route.operator_id != vehicle.operator_id:
            return api_error(
                'Route and active vehicle must belong to the same authorized operator (API-15).',
                'CROSS_TENANT_TRIP',
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                request,
            )
        if not request.data.get('departure_at'):
            return api_error('departure_at is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        with transaction.atomic():
            trip = Trip.objects.create(
                route=route,
                vehicle=vehicle,
                departure_at=request.data['departure_at'],
                status='DRAFT',
            )
            rstops = list(RouteStop.objects.filter(route=route).order_by('sequence'))
            for rs in rstops:
                TripStop.objects.create(trip=trip, route_stop=rs, sequence=rs.sequence)
            lunits = list(LayoutUnit.objects.filter(layout_id=vehicle.layout_id))
            for lu in lunits:
                TripUnit.objects.create(
                    trip=trip,
                    layout_unit=lu,
                    unit_code=lu.unit_code,
                    kind=lu.kind,
                    price_mode=lu.price_mode,
                    max_adults=lu.max_adults,
                    max_children=lu.max_children,
                )
        return Response(
            {'id': str(trip.id), 'status': trip.status, 'stop_count': len(rstops), 'unit_count': len(lunits)},
            status=status.HTTP_201_CREATED,
        )


class OperatorTripDetailView(APIView):
    permission_classes = [IsOperatorManagerOrOwner]

    def patch(self, request, trip_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        trip = Trip.objects.select_related('route', 'vehicle').filter(id=trip_id, route__operator_id__in=op_ids).first()
        if not trip:
            return api_error('Trip not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        if trip.status in ('CANCELLED', 'COMPLETED'):
            return api_error('Cannot modify a cancelled or completed trip.', 'INVALID_TRIP_STATE', status.HTTP_409_CONFLICT, request)
        if 'departure_at' in request.data:
            trip.departure_at = request.data['departure_at']
        if 'vehicle_id' in request.data and str(request.data['vehicle_id']) != str(trip.vehicle_id):
            new_vehicle = Vehicle.objects.filter(
                id=request.data['vehicle_id'], operator_id=trip.route.operator_id, active=True
            ).first()
            if not new_vehicle:
                return api_error('Replacement vehicle must belong to the same operator and be active.', 'CROSS_TENANT_VEHICLE', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
            if new_vehicle.layout_id != trip.vehicle.layout_id:
                return api_error('Replacement vehicle must use the same seat layout.', 'LAYOUT_MISMATCH', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
            trip.vehicle = new_vehicle
        trip.save()
        return Response({'id': str(trip.id), 'departure_at': trip.departure_at, 'vehicle_id': str(trip.vehicle_id), 'status': trip.status})


class OperatorTripFaresView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request, trip_id):
        op_ids = get_active_operator_ids(request.user, request=request)
        trip = Trip.objects.filter(id=trip_id, route__operator_id__in=op_ids).first()
        if not trip:
            return api_error('Trip not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        rows = list(
            TripFare.objects.filter(trip=trip).values(
                'id', 'from_sequence', 'to_sequence', 'unit_kind', 'base_amount', 'child_extra_amount', 'currency'
            )
        )
        return Response({'results': rows})

    def post(self, request, trip_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        trip = Trip.objects.filter(id=trip_id, route__operator_id__in=op_ids).first()
        if not trip:
            return api_error('Trip not found or forbidden.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        from_seq = int(request.data['from_sequence'])
        to_seq = int(request.data['to_sequence'])
        if from_seq >= to_seq:
            return api_error('from_sequence must be strictly less than to_sequence.', 'INVALID_SEGMENT', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        stop_seqs = set(TripStop.objects.filter(trip=trip).values_list('sequence', flat=True))
        if stop_seqs and (from_seq not in stop_seqs or to_seq not in stop_seqs):
            return api_error('from_sequence and to_sequence must match valid TripStop sequences.', 'INVALID_STOP_SEQUENCE', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        unit_kind = request.data['unit_kind']
        base_amount = Decimal(str(request.data['base_amount']))
        if base_amount <= 0:
            return api_error('base_amount must be > 0.', 'INVALID_FARE_AMOUNT', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        if TripFare.objects.filter(trip=trip, from_sequence=from_seq, to_sequence=to_seq, unit_kind=unit_kind).exists():
            return api_error('Duplicate fare for segment and unit_kind (API-16).', 'DUPLICATE_FARE', status.HTTP_409_CONFLICT, request)
        fare = TripFare.objects.create(
            trip=trip,
            from_sequence=from_seq,
            to_sequence=to_seq,
            unit_kind=unit_kind,
            base_amount=base_amount,
            child_extra_amount=(
                Decimal(str(request.data['child_extra_amount']))
                if request.data.get('child_extra_amount') is not None
                else None
            ),
        )
        return Response({'id': str(fare.id)}, status=status.HTTP_201_CREATED)


class OperatorTripStatusView(APIView):
    permission_classes = [IsOperatorMember]

    def patch(self, request, trip_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        trip = Trip.objects.select_related('route__operator').filter(id=trip_id, route__operator_id__in=op_ids).first()
        if not trip:
            return api_error('Trip not found or forbidden.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        new_status = request.data.get('status')
        if new_status not in ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'):
            return api_error('Invalid trip status.', 'INVALID_STATUS', status.HTTP_400_BAD_REQUEST, request)
        if new_status == 'OPEN':
            if trip.route.operator.status != 'ACTIVE':
                return api_error('Operator must be ACTIVE before opening trips.', 'OPERATOR_NOT_ACTIVE', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
            if trip.stops.count() < 2 or trip.units.count() < 1 or not TripFare.objects.filter(trip=trip).exists():
                return api_error('Trip requires >=2 stops, >=1 unit, and >=1 fare before opening.', 'INCOMPLETE_TRIP', status.HTTP_422_UNPROCESSABLE_ENTITY, request)

        now = timezone.now()
        with transaction.atomic():
            trip.status = new_status
            trip.save(update_fields=['status', 'updated_at'])
            if new_status == 'CANCELLED':
                InventoryAllocation.objects.filter(
                    trip_unit__trip=trip,
                    status__in=['HELD', 'CONFIRMED', 'BLOCKED'],
                ).update(status='RELEASED', updated_at=now)
                Ticket.objects.filter(
                    booking_item__trip_unit__trip=trip,
                    status='ISSUED',
                ).update(status='CANCELLED', updated_at=now)
                OutboxEvent.objects.create(
                    event_type='TRIP_CANCELLED',
                    aggregate_id=trip.id,
                    payload={'trip_id': str(trip.id), 'route_name': trip.route.name},
                    attempts=0,
                )
            AuditLog.objects.create(
                actor=request.user,
                operator_id=trip.route.operator_id,
                action='TRIP_STATUS_CHANGED',
                resource_type='Trip',
                resource_id=str(trip.id),
                metadata={'status': new_status},
            )
        return Response({'id': str(trip.id), 'status': trip.status})


class OperatorTripPassengersView(APIView):
    """Return passenger manifest and ticket check-in statuses for an operator's trip."""

    permission_classes = [IsOperatorMember]

    def get(self, request, trip_id):
        op_ids = get_active_operator_ids(request.user, request=request)
        trip = Trip.objects.filter(id=trip_id, route__operator_id__in=op_ids).first()
        if not trip:
            return api_error('Trip not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        items = list(
            BookingItem.objects.filter(
                trip_unit__trip=trip,
                booking__status__in=['CONFIRMED', 'COMPLETED', 'PENDING_PAYMENT'],
            )
            .select_related('booking', 'trip_unit')
            .order_by('trip_unit__unit_code', 'from_sequence')
        )
        item_ids = [it.id for it in items]
        pax_links = (
            BookingItemPassenger.objects.filter(item_id__in=item_ids)
            .select_related('passenger')
        )
        pax_by_item: dict = {}
        for link in pax_links:
            pax_by_item.setdefault(link.item_id, []).append({
                'id': str(link.passenger.id),
                'full_name': link.passenger.full_name,
                'kind': link.passenger.kind,
                'birth_date': link.passenger.birth_date,
                'contact_phone': link.passenger.contact_phone,
            })
        tickets_by_item = {
            tk.booking_item_id: tk
            for tk in Ticket.objects.filter(booking_item_id__in=item_ids)
        }
        manifest = []
        for it in items:
            tk = tickets_by_item.get(it.id)
            manifest.append({
                'booking_item_id': str(it.id),
                'booking_code': it.booking.booking_code,
                'booking_status': it.booking.status,
                'unit_code': it.trip_unit.unit_code,
                'from_sequence': it.from_sequence,
                'to_sequence': it.to_sequence,
                'adult_count': it.adult_count,
                'child_count': it.child_count,
                'ticket_code': tk.code if tk else None,
                'ticket_status': tk.status if tk else None,
                'passengers': pax_by_item.get(it.id, []),
            })
        return Response({'trip_id': str(trip.id), 'count': len(manifest), 'results': manifest})


class OperatorPickupOptionsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(
            PickupOption.objects.filter(operator_id__in=op_ids).values(
                'id', 'operator_id', 'route_stop_id', 'name', 'kind', 'fee', 'is_active'
            )
        )
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Forbidden.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        rs = RouteStop.objects.filter(id=request.data.get('route_stop_id'), route__operator_id=op_ids[0]).first()
        if not rs:
            return api_error('route_stop does not belong to operator.', 'CROSS_TENANT_STOP', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        opt = PickupOption.objects.create(
            operator_id=op_ids[0],
            route_stop=rs,
            name=request.data['name'].strip(),
            kind=request.data.get('kind', 'FIXED'),
            fee=Decimal(str(request.data['fee'])) if request.data.get('fee') is not None else None,
        )
        return Response({'id': str(opt.id), 'name': opt.name}, status=status.HTTP_201_CREATED)


class AdminTripsView(APIView):
    permission_classes = [IsPlatformStaffOrAdmin]

    def get(self, request):
        rows = list(
            Trip.objects.select_related('route', 'route__operator', 'vehicle')
            .order_by('-departure_at')
            .values('id', 'route__name', 'route__operator__name', 'vehicle__registration', 'departure_at', 'status')[:100]
        )
        return Response({'results': rows})
