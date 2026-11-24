"""Catalog, Search, Routes, Trips, Fares & PickupOptions APIs (8 DB tables)."""
from decimal import Decimal
from django.db import transaction
from django.db.models import Min, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Location, PickupOption, Route, RouteStop, Trip, TripFare, TripStop, TripUnit
from common import IsOperatorMember, IsPlatformAdmin, api_error, get_active_operator_ids
from fleet.models import LayoutUnit, Vehicle
from inventory.models import InventoryAllocation


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


class TripSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Trip.objects.filter(status='OPEN', route__operator__status='ACTIVE').select_related(
            'route', 'route__operator', 'vehicle', 'vehicle__type'
        )
        operator_id = request.query_params.get('operator_id')
        if operator_id:
            qs = qs.filter(route__operator_id=operator_id)
        date_str = request.query_params.get('departure_date') or request.query_params.get('date')
        if date_str:
            qs = qs.filter(departure_at__date=date_str)
        from_loc = request.query_params.get('from_location_id')
        if from_loc:
            qs = qs.filter(stops__route_stop__location_id=from_loc)
        to_loc = request.query_params.get('to_location_id')
        if to_loc:
            qs = qs.filter(stops__route_stop__location_id=to_loc)

        sort_by = request.query_params.get('sort', 'price_asc')
        qs = qs.distinct().annotate(min_price=Min('tripfare__base_amount'))
        if sort_by == 'price_desc':
            qs = qs.order_by('-min_price', 'departure_at')
        elif sort_by == 'departure_asc':
            qs = qs.order_by('departure_at')
        else:
            qs = qs.order_by('min_price', 'departure_at')

        trips = list(qs[:50])
        return Response({
            'count': len(trips),
            'results': [
                {
                    'id': str(t.id),
                    'route_name': t.route.name,
                    'operator_id': str(t.route.operator_id),
                    'operator_name': t.route.operator.name,
                    'vehicle_type': t.vehicle.type.name,
                    'departure_at': t.departure_at,
                    'min_price': str(t.min_price) if t.min_price is not None else None,
                }
                for t in trips
            ],
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
        blocked_ids = set(
            InventoryAllocation.objects.filter(
                trip_unit__trip_id=trip_id,
                status__in=['HELD', 'CONFIRMED', 'BLOCKED'],
                section__overlap=(from_seq, to_seq),
            )
            .exclude(status='HELD', expires_at__lte=now)
            .values_list('trip_unit_id', flat=True)
        )
        fares = {
            f.unit_kind: str(f.base_amount)
            for f in TripFare.objects.filter(trip_id=trip_id, from_sequence=from_seq, to_sequence=to_seq)
        }
        return Response({
            'trip_id': str(trip_id),
            'from_sequence': from_seq,
            'to_sequence': to_seq,
            'units': [
                {
                    'id': str(u.id),
                    'unit_code': u.unit_code,
                    'kind': u.kind,
                    'deck': u.layout_unit.deck,
                    'row': u.layout_unit.row_number,
                    'col': u.layout_unit.column_number,
                    'max_adults': u.max_adults,
                    'max_children': u.max_children,
                    'price': fares.get(u.kind),
                    'available': u.id not in blocked_ids,
                }
                for u in units
            ],
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
        r = Route.objects.create(operator_id=op_ids[0], name=request.data['name'].strip())
        return Response({'id': str(r.id), 'name': r.name}, status=status.HTTP_201_CREATED)


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
        rs = RouteStop.objects.create(
            route=route,
            location_id=request.data['location_id'],
            sequence=int(request.data['sequence']),
            allow_pickup=bool(request.data.get('allow_pickup', True)),
            allow_dropoff=bool(request.data.get('allow_dropoff', True)),
        )
        return Response({'id': str(rs.id), 'sequence': rs.sequence}, status=status.HTTP_201_CREATED)


class OperatorTripsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(
            Trip.objects.filter(route__operator_id__in=op_ids).values(
                'id', 'route_id', 'vehicle_id', 'departure_at', 'status'
            )
        )
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Forbidden.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        route = Route.objects.filter(id=request.data.get('route_id'), operator_id__in=op_ids).first()
        vehicle = Vehicle.objects.filter(id=request.data.get('vehicle_id'), operator_id__in=op_ids).first()
        if not route or not vehicle or route.operator_id != vehicle.operator_id:
            return api_error(
                'Route and vehicle must belong to the same authorized operator (API-15).',
                'CROSS_TENANT_TRIP',
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                request,
            )
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
        unit_kind = request.data['unit_kind']
        if TripFare.objects.filter(trip=trip, from_sequence=from_seq, to_sequence=to_seq, unit_kind=unit_kind).exists():
            return api_error('Duplicate fare for segment and unit_kind (API-16).', 'DUPLICATE_FARE', status.HTTP_409_CONFLICT, request)
        fare = TripFare.objects.create(
            trip=trip,
            from_sequence=from_seq,
            to_sequence=to_seq,
            unit_kind=unit_kind,
            base_amount=Decimal(str(request.data['base_amount'])),
            child_extra_amount=Decimal(str(request.data['child_extra_amount'])) if request.data.get('child_extra_amount') is not None else None,
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
        if new_status == 'OPEN':
            if trip.route.operator.status != 'ACTIVE':
                return api_error('Operator must be ACTIVE before opening trips.', 'OPERATOR_NOT_ACTIVE', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
            if trip.stops.count() < 2 or trip.units.count() < 1 or not TripFare.objects.filter(trip=trip).exists():
                return api_error('Trip requires >=2 stops, >=1 unit, and >=1 fare before opening.', 'INCOMPLETE_TRIP', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        trip.status = new_status
        trip.save(update_fields=['status', 'updated_at'])
        return Response({'id': str(trip.id), 'status': trip.status})


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
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        rows = list(
            Trip.objects.select_related('route', 'route__operator', 'vehicle')
            .order_by('-departure_at')
            .values('id', 'route__name', 'route__operator__name', 'vehicle__registration', 'departure_at', 'status')[:100]
        )
        return Response({'results': rows})
