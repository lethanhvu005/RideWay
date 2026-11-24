"""Fleet APIs mapped to vehicle_types, seat_layouts, layout_units, vehicles."""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common import IsOperatorMember, IsPlatformAdmin, api_error, get_active_operator_ids
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType


class VehicleTypeListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        rows = list(VehicleType.objects.all().order_by('code').values('id', 'code', 'name'))
        return Response({'results': rows})


class AdminVehicleTypeCreateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        code = (request.data.get('code') or '').strip()
        name = (request.data.get('name') or '').strip()
        if not code or not name:
            return api_error('code and name are required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        vt = VehicleType.objects.create(code=code, name=name)
        return Response({'id': str(vt.id), 'code': vt.code, 'name': vt.name}, status=status.HTTP_201_CREATED)


class OperatorVehiclesView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(
            Vehicle.objects.filter(operator_id__in=op_ids).values(
                'id', 'operator_id', 'type_id', 'layout_id', 'registration', 'active'
            )
        )
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Not authorized for this operator.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        operator_id = op_ids[0]
        layout = SeatLayout.objects.filter(id=request.data.get('layout_id'), operator_id=operator_id).first()
        if not layout:
            return api_error('Layout does not belong to this operator.', 'CROSS_TENANT_LAYOUT', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        v = Vehicle.objects.create(
            operator_id=operator_id,
            type_id=request.data['type_id'],
            layout=layout,
            registration=request.data['registration'].strip(),
        )
        return Response({'id': str(v.id), 'registration': v.registration}, status=status.HTTP_201_CREATED)


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
        layout = SeatLayout.objects.create(
            operator_id=op_ids[0],
            name=request.data['name'].strip(),
            deck_count=int(request.data.get('deck_count', 1)),
        )
        return Response({'id': str(layout.id), 'name': layout.name}, status=status.HTTP_201_CREATED)


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
        unit = LayoutUnit.objects.create(
            layout=layout,
            unit_code=request.data['unit_code'].strip(),
            kind=request.data['kind'],
            deck=int(request.data.get('deck', 1)),
            row_number=int(request.data['row_number']),
            column_number=int(request.data['column_number']),
            price_mode=request.data.get('price_mode', 'WHOLE_UNIT'),
            max_adults=request.data.get('max_adults'),
            max_children=request.data.get('max_children'),
        )
        return Response({'id': str(unit.id), 'unit_code': unit.unit_code}, status=status.HTTP_201_CREATED)
