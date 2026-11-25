"""VNPay QR payment intent, signed payment URL, IPN signature verification, idempotent ticket issuance & HMAC check-in."""
from decimal import Decimal
import hashlib
import hmac
import os
import urllib.parse
import uuid

from django.core.signing import Signer
from django.db import IntegrityError, transaction
from django.utils import timezone

from bookings.models import Booking, BookingItemPassenger, PickupRequest
from bookings.services import get_active_platform_config
from content.models import AuditLog, OutboxEvent
from inventory.models import InventoryAllocation
from payments.models import PaymentIntent, PaymentTransaction, Ticket


class PaymentError(Exception):
    pass


def _vnpay_hmac_sha512(secret_key: str, data_str: str) -> str:
    return hmac.new(secret_key.encode('utf-8'), data_str.encode('utf-8'), hashlib.sha512).hexdigest()


def build_signed_qr_token(ticket_code: str, booking_item_id: str) -> str:
    """Create a deterministic HMAC-signed QR token for the ticket owner; DB stores only SHA-256(qr_token)."""
    signer = Signer(salt='rideway.ticket.qr')
    return signer.sign(f"{ticket_code}:{booking_item_id}")


def build_vnpay_payment_url(*, provider_reference: str, booking: Booking, now=None, client_ip: str = '127.0.0.1') -> str:
    """Construct a signed VNPay Sandbox payment URL using environment configuration."""
    now = now or timezone.now()
    base_url = os.environ.get('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
    tmn_code = os.environ.get('VNPAY_TMN_CODE', 'RIDEWAY1')
    secret = os.environ.get('VNPAY_HASH_SECRET', 'rideway-vnpay-sandbox-secret')
    return_url = os.environ.get('VNPAY_RETURN_URL', 'http://localhost:5173/payment/vnpay-return')

    params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'pay',
        'vnp_TmnCode': tmn_code,
        'vnp_Amount': str(int(booking.total_amount * Decimal('100'))),
        'vnp_CurrCode': booking.currency or 'VND',
        'vnp_TxnRef': provider_reference,
        'vnp_OrderInfo': f'Thanh toan don dat ve {booking.booking_code}',
        'vnp_OrderType': 'billpayment',
        'vnp_Locale': 'vn',
        'vnp_ReturnUrl': return_url,
        'vnp_IpAddr': client_ip,
        'vnp_CreateDate': now.strftime('%Y%m%d%H%M%S'),
        'vnp_ExpireDate': booking.hold_expires_at.strftime('%Y%m%d%H%M%S'),
    }
    sorted_items = sorted(params.items())
    query_str = urllib.parse.urlencode(sorted_items)
    secure_hash = _vnpay_hmac_sha512(secret, query_str)
    return f"{base_url}?{query_str}&vnp_SecureHash={secure_hash}"


def verify_vnpay_signature(params: dict) -> bool:
    secret = os.environ.get('VNPAY_HASH_SECRET', '')
    if not secret:
        return False
    received_hash = params.get('vnp_SecureHash', '')
    sorted_items = sorted(
        (k, v) for k, v in params.items() if k not in ('vnp_SecureHash', 'vnp_SecureHashType')
    )
    query_str = urllib.parse.urlencode(sorted_items)
    expected_hash = _vnpay_hmac_sha512(secret, query_str)
    return hmac.compare_digest(expected_hash.lower(), received_hash.lower())


def create_vnpay_payment_intent(*, customer, booking_id, require_passengers: bool = False):
    now = timezone.now()
    rules = get_active_platform_config()
    cutoff_seconds = int(rules.get('vnpay_hold_cutoff_seconds', 0) or 0)

    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(id=booking_id, customer=customer).first()
        if not booking:
            raise PaymentError('Booking not found.')
        if booking.status not in ('HOLDING', 'PENDING_PAYMENT'):
            raise PaymentError(f'Booking status {booking.status} cannot initiate payment.')
        if booking.hold_expires_at <= now:
            raise PaymentError('Hold has expired.')
        if cutoff_seconds > 0 and (booking.hold_expires_at - now).total_seconds() < cutoff_seconds:
            raise PaymentError('Payment initiation blocked within pre-expiry cutoff window (OPEN-04).')

        items = list(booking.items.all())
        expected_pax_count = sum(it.adult_count + it.child_count for it in items)
        assigned_pax_count = BookingItemPassenger.objects.filter(item__booking=booking).count()
        if require_passengers or assigned_pax_count > 0:
            if assigned_pax_count != expected_pax_count:
                raise PaymentError('Valid passengers must be assigned to all booked units before payment.')

        # API-12 / API-13: Block payment if CUSTOM pickup is pending quote or quote not accepted
        if PickupRequest.objects.filter(booking_item__booking=booking, status__in=['PENDING', 'QUOTED']).exists():
            raise PaymentError('Custom pickup fee must be quoted and accepted before payment (API-12/API-13).')
        if not (booking.pricing_snapshot or {}).get('quote_accepted', True):
            raise PaymentError('Customer must accept final quote before payment (API-13).')

        provider_reference = f"VNP-{uuid.uuid4().hex[:12].upper()}"
        signed_url = build_vnpay_payment_url(provider_reference=provider_reference, booking=booking, now=now)

        intent = PaymentIntent.objects.create(
            booking=booking,
            provider='VNPAY',
            provider_reference=provider_reference,
            amount=booking.total_amount,
            currency=booking.currency,
            status='PENDING',
            qr_payload=signed_url,
            expires_at=booking.hold_expires_at,
        )
        booking.status = 'PENDING_PAYMENT'
        booking.save(update_fields=['status', 'updated_at'])
        return intent


def process_vnpay_ipn(*, params: dict, verify_signature: bool = True):
    if verify_signature and not verify_vnpay_signature(params):
        raise PaymentError('Invalid VNPay signature (API-07).')

    expected_tmn = os.environ.get('VNPAY_TMN_CODE')
    if expected_tmn and params.get('vnp_TmnCode') and params.get('vnp_TmnCode') != expected_tmn:
        raise PaymentError('vnp_TmnCode merchant mismatch.')

    if params.get('vnp_CurrCode') and params.get('vnp_CurrCode') != 'VND':
        raise PaymentError('Unsupported currency in VNPay callback.')

    provider_ref = params.get('vnp_TxnRef', '')
    event_id = params.get('vnp_TransactionNo') or provider_ref
    response_code = params.get('vnp_ResponseCode', '')
    tx_status = params.get('vnp_TransactionStatus', '00')
    now = timezone.now()

    with transaction.atomic():
        existing_tx = PaymentTransaction.objects.filter(provider='VNPAY', provider_event_id=event_id).first()
        if existing_tx:
            return existing_tx

        intent = (
            PaymentIntent.objects.select_for_update()
            .select_related('booking')
            .filter(provider='VNPAY', provider_reference=provider_ref)
            .first()
        )
        if not intent:
            raise PaymentError('PaymentIntent not found for vnp_TxnRef.')

        # API-07: Verify amount (mandatory when verify_signature=True or when vnp_Amount is supplied)
        if verify_signature and 'vnp_Amount' not in params:
            raise PaymentError('Missing vnp_Amount in verified VNPay IPN.')
        if 'vnp_Amount' in params:
            reported_vnd = Decimal(str(params['vnp_Amount'])) / Decimal('100')
            if reported_vnd != intent.amount:
                raise PaymentError('vnp_Amount mismatch (API-07).')

        booking = Booking.objects.select_for_update().get(id=intent.booking_id)
        is_paid = response_code == '00' and tx_status == '00'

        if not is_paid:
            intent.status = 'FAILED'
            intent.save(update_fields=['status', 'updated_at'])
            return PaymentTransaction.objects.create(
                intent=intent,
                provider='VNPAY',
                provider_event_id=event_id,
                provider_transaction_id=params.get('vnp_TransactionNo', ''),
                amount=intent.amount,
                status='FAILED',
                occurred_at=now,
                verified_at=now,
                raw_event=params,
            )

        allocs = list(InventoryAllocation.objects.select_for_update().filter(booking_item__booking=booking))
        hold_valid = (
            booking.status in ('HOLDING', 'PENDING_PAYMENT')
            and booking.hold_expires_at > now
            and bool(allocs)
            and all(a.status == 'HELD' for a in allocs)
        )

        if hold_valid:
            try:
                with transaction.atomic():
                    InventoryAllocation.objects.filter(id__in=[a.id for a in allocs]).update(
                        status='CONFIRMED', updated_at=now
                    )
            except IntegrityError:
                hold_valid = False

        if not hold_valid:
            intent.status = 'EXCEPTION'
            intent.save(update_fields=['status', 'updated_at'])
            booking.status = 'EXCEPTION'
            booking.save(update_fields=['status', 'updated_at'])
            tx = PaymentTransaction.objects.create(
                intent=intent,
                provider='VNPAY',
                provider_event_id=event_id,
                provider_transaction_id=params.get('vnp_TransactionNo', ''),
                amount=intent.amount,
                status='EXCEPTION',
                occurred_at=now,
                verified_at=now,
                raw_event=params,
            )
            AuditLog.objects.create(
                action='PAYMENT_LATE_EXCEPTION',
                resource_type='Booking',
                resource_id=str(booking.id),
                metadata={'provider_event_id': event_id, 'reason': 'hold_expired_or_lost'},
            )
            OutboxEvent.objects.create(
                event_type='PAYMENT_LATE_EXCEPTION',
                aggregate_id=booking.id,
                payload={'booking_code': booking.booking_code, 'provider_event_id': event_id},
            )
            return tx

        intent.status = 'PAID'
        intent.save(update_fields=['status', 'updated_at'])
        booking.status = 'CONFIRMED'
        booking.save(update_fields=['status', 'updated_at'])

        tx = PaymentTransaction.objects.create(
            intent=intent,
            provider='VNPAY',
            provider_event_id=event_id,
            provider_transaction_id=params.get('vnp_TransactionNo', ''),
            amount=intent.amount,
            status='PAID',
            occurred_at=now,
            verified_at=now,
            raw_event=params,
        )

        for item in booking.items.all():
            t_code = f"TK-{uuid.uuid4().hex[:8].upper()}"
            raw_token = build_signed_qr_token(t_code, str(item.id))
            Ticket.objects.get_or_create(
                booking_item=item,
                defaults={
                    'code': t_code,
                    'qr_token_hash': hashlib.sha256(raw_token.encode('utf-8')).hexdigest(),
                    'issued_at': now,
                    'status': 'ISSUED',
                },
            )
        OutboxEvent.objects.create(
            event_type='TICKET_ISSUED',
            aggregate_id=booking.id,
            payload={'booking_code': booking.booking_code, 'email': booking.contact_email},
            published_at=now,
            attempts=1,
        )
        return tx


def check_in_ticket(*, operator_ids, qr_token: str, actor=None):
    """Verify QR token strictly by hashing with SHA-256 and matching Ticket.qr_token_hash."""
    token_hash = hashlib.sha256(qr_token.encode('utf-8')).hexdigest()
    now = timezone.now()
    with transaction.atomic():
        ticket = (
            Ticket.objects.select_for_update()
            .select_related('booking_item__trip_unit__trip__route')
            .filter(
                qr_token_hash=token_hash,
                booking_item__trip_unit__trip__route__operator_id__in=operator_ids,
            )
            .first()
        )
        if not ticket:
            raise PaymentError('Ticket not found for this operator.')
        if ticket.status != 'ISSUED':
            raise PaymentError(f'Ticket already in status {ticket.status}.')
        ticket.status = 'USED'
        ticket.save(update_fields=['status', 'updated_at'])
        AuditLog.objects.create(
            actor=actor,
            operator_id=ticket.booking_item.trip_unit.trip.route.operator_id,
            action='TICKET_CHECKED_IN',
            resource_type='Ticket',
            resource_id=str(ticket.id),
            metadata={'code': ticket.code, 'checked_in_at': now.isoformat()},
        )
        return ticket
