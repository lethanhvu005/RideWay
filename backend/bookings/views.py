"""Booking, Hold, and PickupRequest APIs mapped to 5 booking tables + inventory_allocations."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking, BookingItem, PickupRequest
from bookings.services import (
    BookingStateError,
    BookingValidationError,
    HoldConflictError,
    HoldValidationError,
    accept_booking_quote,
    assign_passengers_and_pickup,
    create_atomic_hold,
    operator_quote_pickup,
)
from common import IsOperatorMember, api_error, get_active_operator_ids


class HoldCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        idem_key = request.headers.get('Idempotency-Key') or request.data.get('idempotency_key')
        if not idem_key:
            return api_error('Idempotency-Key header is required.', 'MISSING_IDEMPOTENCY_KEY', status.HTTP_400_BAD_REQUEST, request)
        try:
            booking = create_atomic_hold(
                customer=request.user,
                trip_id=request.data.get('trip_id'),
                from_sequence=int(request.data.get('from_sequence')),
                to_sequence=int(request.data.get('to_sequence')),
                unit_requests=request.data.get('units', []),
                idempotency_key=idem_key,
            )
        except HoldConflictError as exc:
            return api_error(str(exc), 'SEAT_CONFLICT', status.HTTP_409_CONFLICT, request)
        except (HoldValidationError, TypeError, ValueError) as exc:
            return api_error(str(exc), 'HOLD_VALIDATION_ERROR', status.HTTP_422_UNPROCESSABLE_ENTITY, request)

        return Response(
            {
                'booking_id': str(booking.id),
                'booking_code': booking.booking_code,
                'status': booking.status,
                'hold_expires_at': booking.hold_expires_at,
                'total_amount': str(booking.total_amount),
                'currency': booking.currency,
            },
            status=status.HTTP_201_CREATED,
        )


class BookingPassengersView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, booking_id):
        try:
            booking = assign_passengers_and_pickup(
                customer=request.user,
                booking_id=booking_id,
                passengers_data=request.data.get('passengers', []),
                item_assignments=request.data.get('item_assignments', []),
                pickup_data=request.data.get('pickup_requests'),
            )
        except BookingStateError as exc:
            return api_error(str(exc), 'BOOKING_STATE_CONFLICT', status.HTTP_409_CONFLICT, request)
        except BookingValidationError as exc:
            return api_error(str(exc), 'PASSENGER_VALIDATION_ERROR', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response({
            'booking_id': str(booking.id),
            'status': booking.status,
            'total_amount': str(booking.total_amount),
        })


class BookingAcceptQuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            booking = accept_booking_quote(
                customer=request.user,
                booking_id=booking_id,
                expected_total_amount=request.data.get('expected_total_amount'),
            )
        except BookingStateError as exc:
            return api_error(str(exc), 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        except (BookingValidationError, TypeError, ValueError) as exc:
            return api_error(str(exc), 'QUOTE_MISMATCH', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response(
            {
                'booking_id': str(booking.id),
                'total_amount': str(booking.total_amount),
                'quote_accepted': True,
            },
            status=status.HTTP_201_CREATED,
        )


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        booking = Booking.objects.filter(id=booking_id, customer=request.user).first()
        if not booking:
            return api_error('Booking not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        items = list(
            booking.items.select_related('trip_unit').values(
                'id', 'trip_unit_id', 'trip_unit__unit_code', 'from_sequence', 'to_sequence',
                'adult_count', 'child_count', 'unit_price', 'child_surcharge',
            )
        )
        return Response({
            'id': str(booking.id),
            'booking_code': booking.booking_code,
            'status': booking.status,
            'hold_expires_at': booking.hold_expires_at,
            'total_amount': str(booking.total_amount),
            'currency': booking.currency,
            'items': items,
        })


class MyBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = list(
            Booking.objects.filter(customer=request.user)
            .order_by('-created_at')
            .values('id', 'booking_code', 'status', 'hold_expires_at', 'total_amount', 'currency', 'created_at')[:50]
        )
        return Response({'count': len(rows), 'results': rows})


class OperatorBookingItemsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(
            BookingItem.objects.filter(trip_unit__trip__route__operator_id__in=op_ids).values(
                'id', 'booking__booking_code', 'booking__status', 'trip_unit__unit_code', 'from_sequence', 'to_sequence'
            )[:100]
        )
        return Response({'results': rows})


class OperatorPickupRequestsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        rows = list(
            PickupRequest.objects.filter(booking_item__trip_unit__trip__route__operator_id__in=op_ids)
            .order_by('-created_at')
            .values('id', 'booking_item_id', 'direction', 'kind', 'requested_address', 'fee_snapshot', 'status')[:100]
        )
        return Response({'results': rows})


class OperatorPickupQuoteView(APIView):
    permission_classes = [IsOperatorMember]

    def patch(self, request, pickup_id):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Forbidden.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        try:
            pr, booking = operator_quote_pickup(
                operator_ids=op_ids, pickup_id=pickup_id, fee_amount=request.data.get('fee')
            )
        except BookingStateError as exc:
            return api_error(str(exc), 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        except (BookingValidationError, TypeError, ValueError) as exc:
            return api_error(str(exc), 'INVALID_FEE', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response({
            'id': str(pr.id),
            'status': pr.status,
            'fee': str(pr.fee_snapshot),
            'booking_total': str(booking.total_amount),
        })
