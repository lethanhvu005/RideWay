"""App 7: finance — PolicyVersion, CancellationRequest, Refund, CommissionAgreement, Settlement, SettlementLine (6 tables)."""
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q
from common import BaseRecord


class PolicyVersion(BaseRecord):
    operator = models.ForeignKey('accounts.Operator', on_delete=models.PROTECT, null=True, blank=True)
    scope = models.CharField(max_length=12, choices=[('PLATFORM', 'Platform'), ('OPERATOR', 'Operator')])
    version = models.CharField(max_length=24)
    rules_json = models.JSONField(default=dict)
    effective_at = models.DateTimeField()
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'policy_versions'
        constraints = [
            models.UniqueConstraint(
                fields=['scope', 'version'],
                condition=Q(operator__isnull=True),
                name='uq_platform_policy_version',
            ),
            models.UniqueConstraint(
                fields=['scope', 'operator', 'version'],
                condition=Q(operator__isnull=False),
                name='uq_operator_policy_version',
            ),
        ]


class CancellationRequest(BaseRecord):
    booking = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=12, choices=[('CANCEL', 'Cancel'), ('CHANGE', 'Change')])
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='PENDING')
    policy_snapshot = models.JSONField(default=dict)

    class Meta:
        db_table = 'cancellation_requests'


class Refund(BaseRecord):
    booking = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT)
    payment_transaction = models.ForeignKey('payments.PaymentTransaction', on_delete=models.PROTECT, null=True, blank=True)
    request = models.ForeignKey(CancellationRequest, on_delete=models.PROTECT, null=True, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20, default='PENDING')
    provider_ref = models.CharField(max_length=120, blank=True)

    class Meta:
        db_table = 'refunds'
        constraints = [
            models.CheckConstraint(condition=Q(amount__gte=0), name='ck_refund_amount_nonneg'),
        ]


class CommissionAgreement(BaseRecord):
    operator = models.ForeignKey('accounts.Operator', on_delete=models.PROTECT)
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'commission_agreements'
        constraints = [
            models.CheckConstraint(
                condition=Q(percentage__gte=0, percentage__lte=100) | Q(percentage__isnull=True),
                name='ck_commission_pct',
            ),
            models.CheckConstraint(
                condition=Q(effective_to__isnull=True) | Q(effective_to__gte=F('effective_from')),
                name='ck_commission_date_order',
            ),
        ]


class Settlement(BaseRecord):
    operator = models.ForeignKey('accounts.Operator', on_delete=models.PROTECT)
    period_start = models.DateField()
    period_end = models.DateField()
    gross_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    payable_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='DRAFT')

    class Meta:
        db_table = 'settlements'
        constraints = [
            models.CheckConstraint(condition=Q(period_end__gte=F('period_start')), name='ck_settlement_period'),
            models.CheckConstraint(condition=Q(gross_amount__gte=0), name='ck_settlement_gross_nonneg'),
        ]


class SettlementLine(BaseRecord):
    settlement = models.ForeignKey(Settlement, on_delete=models.PROTECT)
    booking_item = models.ForeignKey('bookings.BookingItem', on_delete=models.PROTECT)
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2)
    commission_rate_snapshot = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    commission_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'settlement_lines'
        constraints = [
            models.UniqueConstraint(fields=['settlement', 'booking_item'], name='uq_settlement_line'),
            models.UniqueConstraint(fields=['booking_item'], name='uq_settlement_line_single_booking_item'),
        ]
