"""App 6: payments — PaymentIntent, PaymentTransaction, Ticket (3 tables)."""
from django.db import models
from django.db.models import Q
from common import BaseRecord


class PaymentIntent(BaseRecord):
    booking = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT)
    provider = models.CharField(max_length=60)
    provider_reference = models.CharField(max_length=120, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default='VND')
    status = models.CharField(max_length=20, default='CREATED')
    qr_payload = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_intents'
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'provider_reference'],
                condition=~Q(provider_reference=''),
                name='uq_provider_intent',
            ),
            models.CheckConstraint(condition=Q(amount__gt=0), name='ck_payment_intent_amount_pos'),
        ]
        indexes = [
            models.Index(fields=['booking', '-created_at'], name='ix_payment_intent_booking'),
        ]


class PaymentTransaction(BaseRecord):
    intent = models.ForeignKey(PaymentIntent, on_delete=models.PROTECT)
    provider = models.CharField(max_length=60)
    provider_event_id = models.CharField(max_length=120)
    provider_transaction_id = models.CharField(max_length=120, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20)
    occurred_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    raw_event = models.JSONField(default=dict)

    class Meta:
        db_table = 'payment_transactions'
        constraints = [
            models.UniqueConstraint(fields=['provider', 'provider_event_id'], name='uq_payment_provider_event'),
            models.CheckConstraint(condition=Q(amount__gte=0), name='ck_payment_tx_amount_nonneg'),
        ]


class Ticket(BaseRecord):
    booking_item = models.OneToOneField('bookings.BookingItem', on_delete=models.PROTECT)
    code = models.CharField(max_length=40, unique=True)
    qr_token_hash = models.CharField(max_length=128, unique=True)
    issued_at = models.DateTimeField()
    status = models.CharField(max_length=14, default='ISSUED')

    class Meta:
        db_table = 'tickets'
