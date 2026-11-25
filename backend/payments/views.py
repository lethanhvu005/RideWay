"""Payment, Webhook, Ticket, and Operator Check-In APIs (3 DB tables)."""
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from common import IsOperatorMember, api_error, get_active_operator_ids
from payments.models import Ticket
from payments.services import (
    PaymentError,
    build_signed_qr_token,
    check_in_ticket,
    create_vnpay_payment_intent,
    process_vnpay_ipn,
)


class PaymentIntentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        require_pax = bool(request.data.get('require_passengers', False))
        try:
            intent = create_vnpay_payment_intent(
                customer=request.user,
                booking_id=booking_id,
                require_passengers=require_pax,
            )
        except PaymentError as exc:
            return api_error(str(exc), 'PAYMENT_INTENT_ERROR', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response(
            {
                'payment_intent_id': str(intent.id),
                'provider': intent.provider,
                'provider_reference': intent.provider_reference,
                'amount': str(intent.amount),
                'currency': intent.currency,
                'qr_payload': intent.qr_payload,
                'payment_url': intent.qr_payload,
                'expires_at': intent.expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        booking = Booking.objects.filter(id=booking_id, customer=request.user).first()
        if not booking:
            return api_error('Booking not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        latest = booking.paymentintent_set.order_by('-created_at').first()
        return Response({
            'booking_id': str(booking.id),
            'booking_status': booking.status,
            'payment_status': latest.status if latest else None,
        })


class PaymentWebhookView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, provider):
        return self._handle(request, provider, dict(request.query_params.items()))

    def post(self, request, provider):
        return self._handle(request, provider, dict(request.data))

    def _handle(self, request, provider, params):
        if provider.lower() != 'vnpay':
            return api_error('Unsupported provider.', 'UNSUPPORTED_PROVIDER', status.HTTP_400_BAD_REQUEST, request)
        try:
            tx = process_vnpay_ipn(params=params)
        except PaymentError as exc:
            return Response({'RspCode': '97', 'Message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        http_code = status.HTTP_201_CREATED if request.method == 'POST' else status.HTTP_200_OK
        return Response({'RspCode': '00', 'Message': 'Confirm Success', 'status': tx.status}, status=http_code)


class MyTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = list(
            Ticket.objects.filter(booking_item__booking__customer=request.user)
            .select_related('booking_item', 'booking_item__booking', 'booking_item__trip_unit')
            .order_by('-issued_at')[:50]
        )
        return Response({
            'count': len(tickets),
            'results': [
                {
                    'id': str(tk.id),
                    'code': tk.code,
                    'qr_token': build_signed_qr_token(tk.code, str(tk.booking_item_id)),
                    'status': tk.status,
                    'issued_at': tk.issued_at,
                    'unit_code': tk.booking_item.trip_unit.unit_code,
                    'booking_code': tk.booking_item.booking.booking_code,
                }
                for tk in tickets
            ],
        })


class OperatorCheckInView(APIView):
    permission_classes = [IsOperatorMember]

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        qr_token = (request.data.get('qr_token') or '').strip()
        if not qr_token:
            return api_error('qr_token is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        try:
            tk = check_in_ticket(operator_ids=op_ids, qr_token=qr_token, actor=request.user)
        except PaymentError as exc:
            return api_error(str(exc), 'CHECKIN_FAILED', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response({'ticket_id': str(tk.id), 'code': tk.code, 'status': tk.status}, status=status.HTTP_201_CREATED)
