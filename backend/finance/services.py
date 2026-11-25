"""Policy-versioned cancellation/refund and operator commission settlement services."""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from bookings.models import Booking
from content.models import AuditLog, OutboxEvent
from finance.models import CancellationRequest, CommissionAgreement, Refund, Settlement, SettlementLine
from inventory.models import InventoryAllocation
from payments.models import Ticket


class SettlementError(Exception):
    pass


def submit_cancellation_request(*, customer, booking_id, kind, reason=''):
    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(id=booking_id, customer=customer).first()
        if not booking:
            raise SettlementError('Booking not found.')
        if booking.status not in ('CONFIRMED', 'PENDING_PAYMENT'):
            raise SettlementError(f'Booking in status {booking.status} cannot be cancelled/changed.')
        if CancellationRequest.objects.filter(booking=booking, status='PENDING').exists():
            raise SettlementError('A pending cancellation/change request already exists for this booking.')

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


def decide_cancellation_request(*, actor, request_id, decision: str, approved_refund_amount=None):
    """
    Approve or reject a CancellationRequest.
    When APPROVED for CANCEL, atomically releases InventoryAllocation rows (RELEASED),
    invalidates Tickets (CANCELLED), and transitions Booking to CANCELLED (FR-13).
    """
    if decision not in ('APPROVED', 'REJECTED'):
        raise SettlementError('decision must be APPROVED or REJECTED.')
    now = timezone.now()
    with transaction.atomic():
        cr = (
            CancellationRequest.objects.select_for_update()
            .select_related('booking')
            .filter(id=request_id)
            .first()
        )
        if not cr:
            raise CancellationRequest.DoesNotExist('CancellationRequest not found.')
        if cr.status != 'PENDING':
            raise SettlementError(f'CancellationRequest already in status {cr.status}.')

        booking = Booking.objects.select_for_update().get(id=cr.booking_id)
        if decision == 'APPROVED' and cr.kind == 'CANCEL':
            if Ticket.objects.filter(booking_item__booking=booking, status='USED').exists():
                raise SettlementError('Cannot cancel booking when one or more tickets have already been used.')
            InventoryAllocation.objects.filter(
                booking_item__booking=booking,
                status__in=['HELD', 'CONFIRMED'],
            ).update(status='RELEASED', updated_at=now)
            Ticket.objects.filter(
                booking_item__booking=booking,
                status='ISSUED',
            ).update(status='CANCELLED', updated_at=now)
            booking.status = 'CANCELLED'
            booking.save(update_fields=['status', 'updated_at'])

        cr.status = decision
        cr.save(update_fields=['status', 'updated_at'])

        refund_id = None
        if decision == 'APPROVED' and approved_refund_amount is not None:
            rf = Refund.objects.create(
                booking=booking,
                request=cr,
                amount=Decimal(str(approved_refund_amount)),
                status='PENDING',
            )
            refund_id = str(rf.id)

        AuditLog.objects.create(
            actor=actor,
            action='CANCELLATION_DECIDED',
            resource_type='CancellationRequest',
            resource_id=str(cr.id),
            metadata={'decision': decision, 'refund_id': refund_id, 'booking_status': booking.status},
        )
        OutboxEvent.objects.create(
            event_type='CANCELLATION_DECIDED',
            aggregate_id=booking.id,
            payload={'booking_code': booking.booking_code, 'decision': decision, 'refund_id': refund_id},
            published_at=now,
            attempts=1,
        )
        return cr, refund_id


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
