"""Policy-versioned cancellation/refund and operator commission settlement services."""
from decimal import Decimal
from django.db import transaction

from bookings.models import Booking
from content.models import AuditLog
from finance.models import CancellationRequest, CommissionAgreement, Refund, Settlement, SettlementLine


class SettlementError(Exception):
    pass


def submit_cancellation_request(*, customer, booking_id, kind, reason=''):
    with transaction.atomic():
        booking = Booking.objects.filter(id=booking_id, customer=customer).first()
        if not booking:
            raise SettlementError('Booking not found.')
        if booking.status not in ('CONFIRMED', 'PENDING_PAYMENT'):
            raise SettlementError(f'Booking in status {booking.status} cannot be cancelled/changed.')

        policy = booking.policy_snapshot or {}
        req = CancellationRequest.objects.create(
            booking=booking,
            requested_by=customer,
            kind=kind,
            reason=reason,
            status='PENDING',
            policy_snapshot=policy,
        )
        AuditLog.objects.create(
            actor=customer,
            action='CANCELLATION_REQUESTED',
            resource_type='CancellationRequest',
            resource_id=str(req.id),
            metadata={'booking_id': str(booking.id), 'kind': kind},
        )
        return req


def approve_settlement(*, admin_user, settlement_id):
    with transaction.atomic():
        settlement = Settlement.objects.select_for_update().get(id=settlement_id)
        agreement = (
            CommissionAgreement.objects.filter(
                operator=settlement.operator,
                effective_from__lte=settlement.period_end,
                approved_at__isnull=False,
            )
            .order_by('-effective_from')
            .first()
        )
        if not agreement or agreement.percentage is None:
            raise SettlementError(
                'Commission agreement percentage is not configured (OPEN-06, T11). Cannot approve final settlement.'
            )

        pct = agreement.percentage
        commission_amt = (settlement.gross_amount * pct / Decimal('100')).quantize(Decimal('0.01'))
        settlement.commission_amount = commission_amt
        settlement.payable_amount = settlement.gross_amount - commission_amt
        settlement.status = 'APPROVED'
        settlement.save(update_fields=['commission_amount', 'payable_amount', 'status', 'updated_at'])

        SettlementLine.objects.filter(settlement=settlement).update(commission_rate_snapshot=pct)
        AuditLog.objects.create(
            actor=admin_user,
            operator=settlement.operator,
            action='SETTLEMENT_APPROVED',
            resource_type='Settlement',
            resource_id=str(settlement.id),
            metadata={'percentage': str(pct)},
        )
        return settlement
