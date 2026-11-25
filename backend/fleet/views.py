"""Fleet APIs mapped to vehicle_types, seat_layouts, layout_units, vehicles."""
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Trip, TripUnit
from common import IsOperatorManagerOrOwner, IsOperatorMember, IsPlatformAdmin, api_error, get_active_operator_ids
from content.models import AuditLog
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType


class VehicleTypeListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        rows = list(VehicleType.objects.all().order_by('code').values('id', 'code', 'name'))
        return Response({'results': rows})


class AdminVehicleTypeCreateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        code = (request.data.get('code') or '').strip().upper()
        name = (request.data.get('name') or '').strip()
        if not code or not name:
            return api_error('code and name are required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        if VehicleType.objects.filter(code=code).exists():
            return api_error('VehicleType code already exists.', 'DUPLICATE_CODE', status.HTTP_409_CONFLICT, request)
        vt = VehicleType.objects.create(code=code, name=name)
        return Response({'id': str(vt.id), 'code': vt.code, 'name': vt.name}, status=status.HTTP_201_CREATED)


class OperatorVehiclesView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(
            Vehicle.objects.filter(operator_id__in=op_ids)
            .select_related('type', 'layout')
            .order_by('-created_at')
            .values(
                'id',
                'operator_id',
                'type_id',
                'type__code',
                'type__name',
                'layout_id',
                'layout__name',
                'registration',
                'active',
            )
        )
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Not authorized for this operator.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        operator_id = op_ids[0]
        type_id = request.data.get('type_id')
        layout_id = request.data.get('layout_id')
        registration = (request.data.get('registration') or '').strip().upper()
        if not type_id or not layout_id or not registration:
            return api_error(
                'type_id, layout_id, and registration are required.',
                'INVALID_INPUT',
                status.HTTP_400_BAD_REQUEST,
                request,
            )
        if not VehicleType.objects.filter(id=type_id).exists():
            return api_error('VehicleType not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        layout = SeatLayout.objects.filter(id=layout_id, operator_id=operator_id).first()
        if not layout:
            return api_error(
                'Layout does not belong to this operator.',
                'CROSS_TENANT_LAYOUT',
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                request,
            )
        if Vehicle.objects.filter(operator_id=operator_id, registration=registration).exists():
            return api_error(
                'Vehicle registration already exists for this operator.',
                'DUPLICATE_REGISTRATION',
                status.HTTP_409_CONFLICT,
                request,
            )
        v = Vehicle.objects.create(
            operator_id=operator_id,
            type_id=type_id,
            layout=layout,
            registration=registration,
            active=bool(request.data.get('active', True)),
        )
        AuditLog.objects.create(
            actor=request.user,
            operator_id=operator_id,
            action='VEHICLE_CREATED',
            resource_type='Vehicle',
            resource_id=str(v.id),
            metadata={'registration': v.registration},
        )
        return Response({'id': str(v.id), 'registration': v.registration, 'active': v.active}, status=status.HTTP_201_CREATED)


class OperatorVehicleDetailView(APIView):
    permission_classes = [IsOperatorManagerOrOwner]

    def patch(self, request, vehicle_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        v = Vehicle.objects.filter(id=vehicle_id, operator_id__in=op_ids).first()
        if not v:
            return api_error('Vehicle not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        if 'registration' in request.data:
            new_reg = (request.data.get('registration') or '').strip().upper()
            if not new_reg:
                return api_error('registration cannot be empty.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
            if Vehicle.objects.filter(operator_id=v.operator_id, registration=new_reg).exclude(id=v.id).exists():
                return api_error('Duplicate registration.', 'DUPLICATE_REGISTRATION', status.HTTP_409_CONFLICT, request)
            v.registration = new_reg
        if 'active' in request.data:
            v.active = bool(request.data['active'])
        if 'type_id' in request.data:
            if not VehicleType.objects.filter(id=request.data['type_id']).exists():
                return api_error('VehicleType not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
            v.type_id = request.data['type_id']
        if 'layout_id' in request.data and str(request.data['layout_id']) != str(v.layout_id):
            if Trip.objects.filter(vehicle=v, status__in=['OPEN', 'CLOSED']).exists():
                return api_error(
                    'Cannot change layout of a vehicle assigned to active trips.',
                    'VEHICLE_IN_USE',
                    status.HTTP_409_CONFLICT,
                    request,
                )
            new_layout = SeatLayout.objects.filter(id=request.data['layout_id'], operator_id=v.operator_id).first()
            if not new_layout:
                return api_error(
                    'Layout does not belong to this operator.',
                    'CROSS_TENANT_LAYOUT',
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    request,
                )
            v.layout = new_layout
        v.save()
        return Response({'id': str(v.id), 'registration': v.registration, 'active': v.active, 'layout_id': str(v.layout_id)})


class OperatorLayoutsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(SeatLayout.objects.filter(operator_id__in=op_ids).values('id', 'operator_id', 'name', 'deck_count'))
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Not authorized for this operator.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        name = (request.data.get('name') or '').strip()
        if not name:
            return api_error('Layout name is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        try:
            deck_count = int(request.data.get('deck_count', 1))
        except (TypeError, ValueError):
            return api_error('deck_count must be an integer.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        if deck_count not in (1, 2):
            return api_error('deck_count must be 1 or 2.', 'INVALID_DECK_COUNT', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        layout = SeatLayout.objects.create(
            operator_id=op_ids[0],
            name=name,
            deck_count=deck_count,
        )
        return Response({'id': str(layout.id), 'name': layout.name, 'deck_count': layout.deck_count}, status=status.HTTP_201_CREATED)


class OperatorLayoutUnitsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request, layout_id):
        op_ids = get_active_operator_ids(request.user, request=request)
        layout = SeatLayout.objects.filter(id=layout_id, operator_id__in=op_ids).first()
        if not layout:
            return api_error('Layout not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        rows = list(
            LayoutUnit.objects.filter(layout=layout)
            .order_by('deck', 'row_number', 'column_number')
            .values('id', 'unit_code', 'kind', 'deck', 'row_number', 'column_number', 'price_mode', 'max_adults', 'max_children')
        )
        return Response({'results': rows})

    def post(self, request, layout_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        layout = SeatLayout.objects.filter(id=layout_id, operator_id__in=op_ids).first()
        if not layout:
            return api_error('Layout not found or forbidden.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        if TripUnit.objects.filter(layout_unit__layout=layout).exists():
            return api_error(
                'Cannot modify a seat layout that is already bound to existing trips.',
                'LAYOUT_IN_USE',
                status.HTTP_409_CONFLICT,
                request,
            )
        unit_code = (request.data.get('unit_code') or '').strip()
        kind = request.data.get('kind')
        if not unit_code or kind not in ('CABIN', 'BED', 'SEAT'):
            return api_error('Valid unit_code and kind (CABIN/BED/SEAT) are required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        try:
            deck = int(request.data.get('deck', 1))
            row_number = int(request.data['row_number'])
            column_number = int(request.data['column_number'])
        except (KeyError, TypeError, ValueError):
            return api_error('deck, row_number, and column_number must be valid integers.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        if deck < 1 or deck > layout.deck_count:
            return api_error(f'deck must be between 1 and {layout.deck_count}.', 'INVALID_DECK', status.HTTP_422_UNPROCESSABLE_ENTITY, request)

        try:
            with transaction.atomic():
                unit = LayoutUnit.objects.create(
                    layout=layout,
                    unit_code=unit_code,
                    kind=kind,
                    deck=deck,
                    row_number=row_number,
                    column_number=column_number,
                    price_mode=request.data.get('price_mode', 'WHOLE_UNIT'),
                    max_adults=request.data.get('max_adults'),
                    max_children=request.data.get('max_children'),
                )
        except IntegrityError:
            return api_error(
                'Duplicate unit_code or duplicate (deck, row_number, column_number) coordinate in layout.',
                'DUPLICATE_LAYOUT_UNIT',
                status.HTTP_409_CONFLICT,
                request,
            )
        return Response({'id': str(unit.id), 'unit_code': unit.unit_code}, status=status.HTTP_201_CREATED)
