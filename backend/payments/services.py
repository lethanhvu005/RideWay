"""VNPay QR payment intent, IPN signature verification, idempotent ticket issuance & check-in."""
from decimal import Decimal
import hashlib
import hmac
import os
import urllib.parse
import uuid

from django.db import transaction
from django.utils import timezone

from bookings.models import Booking, PickupRequest
from bookings.services import get_active_platform_config
from content.models import AuditLog
from inventory.models import InventoryAllocation
from payments.models import PaymentIntent, PaymentTransaction, Ticket


class PaymentError(Exception):
    pass


def _vnpay_hmac_sha512(secret_key: str, data_str: str) -> str:
    return hmac.new(secret_key.encode('utf-8'), data_str.encode('utf-8'), hashlib.sha512).hexdigest()


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


def create_vnpay_payment_intent(*, customer, booking_id):
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

        # API-12 / API-13: Block payment if CUSTOM pickup is pending quote or quote not accepted
        if PickupRequest.objects.filter(booking_item__booking=booking, status__in=['PENDING', 'QUOTED']).exists():
            raise PaymentError('Custom pickup fee must be quoted and accepted before payment (API-12/API-13).')
        if not (booking.pricing_snapshot or {}).get('quote_accepted', True):
            raise PaymentError('Customer must accept final quote before payment (API-13).')

        intent = PaymentIntent.objects.create(
            booking=booking,
            provider='VNPAY',
            provider_reference=f"VNP-{uuid.uuid4().hex[:12].upper()}",
            amount=booking.total_amount,
            currency=booking.currency,
            status='PENDING',
            qr_payload=f"VNPAY_QR:{booking.booking_code}:{booking.total_amount}",
            expires_at=booking.hold_expires_at,
        )
        booking.status = 'PENDING_PAYMENT'
        booking.save(update_fields=['status', 'updated_at'])
        return intent


def process_vnpay_ipn(*, params: dict, verify_signature: bool = True):
    if verify_signature and not verify_vnpay_signature(params):
        raise PaymentError('Invalid VNPay signature (API-07).')

    provider_ref = params.get('vnp_TxnRef', '')
    event_id = params.get('vnp_TransactionNo') or provider_ref
    response_code = params.get('vnp_ResponseCode', '')
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

        # API-07: Verify amount if vnp_Amount is supplied (VNPay sends amount * 100)
        if 'vnp_Amount' in params:
            reported_vnd = Decimal(str(params['vnp_Amount'])) / Decimal('100')
            if reported_vnd != intent.amount:
                raise PaymentError('vnp_Amount mismatch (API-07).')

        booking = Booking.objects.select_for_update().get(id=intent.booking_id)
        is_paid = response_code == '00'

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
            return tx

        InventoryAllocation.objects.filter(id__in=[a.id for a in allocs]).update(status='CONFIRMED', updated_at=now)
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
            raw_token = f"{booking.booking_code}:{item.id}:{uuid.uuid4().hex}"
            Ticket.objects.get_or_create(
                booking_item=item,
                defaults={
                    'code': f"TK-{uuid.uuid4().hex[:8].upper()}",
                    'qr_token_hash': hashlib.sha256(raw_token.encode('utf-8')).hexdigest(),
                    'issued_at': now,
                    'status': 'ISSUED',
                },
            )
        return tx


def check_in_ticket(*, operator_ids, qr_token: str):
    token_hash = (
        qr_token
        if len(qr_token) == 64
        else hashlib.sha256(qr_token.encode('utf-8')).hexdigest()
    )
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
        return ticket
