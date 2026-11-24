"""App 5: bookings — Booking, BookingItem, BookingPassenger, BookingItemPassenger, PickupRequest (5 tables)."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from common import BaseRecord


class Booking(BaseRecord):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    booking_code = models.CharField(max_length=32, unique=True)
    status = models.CharField(
        max_length=24,
        choices=[
            ('HOLDING', 'Holding'),
            ('PENDING_PAYMENT', 'Pending payment'),
            ('CONFIRMED', 'Confirmed'),
            ('CANCELLED', 'Cancelled'),
            ('EXCEPTION', 'Exception'),
            ('COMPLETED', 'Completed'),
        ],
        default='HOLDING',
    )
    hold_expires_at = models.DateTimeField()
    contact_email = models.EmailField()
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='VND')
    pricing_snapshot = models.JSONField(default=dict)
    policy_snapshot = models.JSONField(default=dict)
    idempotency_key = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'bookings'
        constraints = [
            models.CheckConstraint(condition=Q(total_amount__gte=0), name='ck_booking_total_nonneg'),
        ]
        indexes = [
            models.Index(fields=['customer', '-created_at'], name='ix_booking_customer_created'),
        ]


class BookingItem(BaseRecord):
    booking = models.ForeignKey(Booking, on_delete=models.PROTECT, related_name='items')
    trip_unit = models.ForeignKey('catalog.TripUnit', on_delete=models.PROTECT)
    from_sequence = models.PositiveSmallIntegerField()
    to_sequence = models.PositiveSmallIntegerField()
    adult_count = models.PositiveSmallIntegerField(default=0)
    child_count = models.PositiveSmallIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    child_surcharge = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    price_snapshot = models.JSONField(default=dict)

    class Meta:
        db_table = 'booking_items'
        constraints = [
            models.CheckConstraint(condition=Q(to_sequence__gt=F('from_sequence')), name='ck_item_positive_section'),
            models.CheckConstraint(condition=Q(unit_price__gte=0), name='ck_item_unit_price_nonneg'),
            models.CheckConstraint(condition=Q(child_surcharge__gte=0), name='ck_item_child_surcharge_nonneg'),
        ]


class BookingPassenger(BaseRecord):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='passengers')
    full_name = models.CharField(max_length=160)
    kind = models.CharField(max_length=12, choices=[('ADULT', 'Adult'), ('CHILD', 'Child')])
    birth_date = models.DateField(null=True, blank=True)
    contact_phone = models.CharField(max_length=25, blank=True)

    class Meta:
        db_table = 'booking_passengers'


class BookingItemPassenger(BaseRecord):
    item = models.ForeignKey(BookingItem, on_delete=models.CASCADE)
    passenger = models.ForeignKey(BookingPassenger, on_delete=models.CASCADE)

    class Meta:
        db_table = 'booking_item_passengers'
        constraints = [
            models.UniqueConstraint(fields=['item', 'passenger'], name='uq_item_passenger'),
        ]

    def clean(self):
        if self.item_id and self.passenger_id and self.item.booking_id != self.passenger.booking_id:
            raise ValidationError('BookingItem and BookingPassenger must belong to the same Booking.')


class PickupRequest(BaseRecord):
    booking_item = models.ForeignKey(BookingItem, on_delete=models.PROTECT)
    direction = models.CharField(max_length=8, choices=[('PICKUP', 'Pickup'), ('DROPOFF', 'Dropoff')])
    kind = models.CharField(max_length=12, choices=[('FIXED', 'Fixed'), ('CUSTOM', 'Custom')])
    option = models.ForeignKey('catalog.PickupOption', on_delete=models.PROTECT, null=True, blank=True)
    requested_address = models.TextField(blank=True)
    fee_snapshot = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, default='PENDING')

    class Meta:
        db_table = 'pickup_requests'
        constraints = [
            models.CheckConstraint(
                condition=Q(fee_snapshot__gte=0) | Q(fee_snapshot__isnull=True),
                name='ck_pickup_req_fee_nonneg',
            ),
        ]
