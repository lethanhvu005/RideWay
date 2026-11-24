"""App 4: inventory — InventoryAllocation with PostgreSQL int4range GiST ExclusionConstraint (1 table)."""
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import IntegerRangeField, RangeOperators
from django.db import models
from django.db.models import Q
from common import BaseRecord


class InventoryAllocation(BaseRecord):
    """[lower, upper) stop sequence; held rows must be released explicitly when expired."""

    trip_unit = models.ForeignKey('catalog.TripUnit', on_delete=models.PROTECT)
    booking_item = models.ForeignKey('bookings.BookingItem', on_delete=models.PROTECT, null=True, blank=True)
    section = IntegerRangeField()
    status = models.CharField(
        max_length=16,
        choices=[
            ('HELD', 'Held'),
            ('CONFIRMED', 'Confirmed'),
            ('BLOCKED', 'Blocked'),
            ('EXPIRED', 'Expired'),
            ('RELEASED', 'Released'),
        ],
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'inventory_allocations'
        constraints = [
            ExclusionConstraint(
                name='exclude_active_unit_sections',
                expressions=[('trip_unit', RangeOperators.EQUAL), ('section', RangeOperators.OVERLAPS)],
                condition=Q(status__in=['HELD', 'CONFIRMED', 'BLOCKED']),
            ),
        ]
        indexes = [
            models.Index(fields=['status', 'expires_at'], name='ix_hold_expiry'),
        ]
