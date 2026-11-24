"""Inventory expiration sweep service (BR-04)."""
from django.utils import timezone
from bookings.models import Booking
from inventory.models import InventoryAllocation


def reclaim_expired_holds(now=None):
    """Transition expired HELD allocations to EXPIRED inside an active transaction."""
    now = now or timezone.now()
    expired_allocs = InventoryAllocation.objects.filter(status='HELD', expires_at__lte=now)
    booking_ids = list(
        expired_allocs.exclude(booking_item__isnull=True).values_list('booking_item__booking_id', flat=True)
    )
    count = expired_allocs.update(status='EXPIRED', updated_at=now)
    if booking_ids:
        Booking.objects.filter(
            id__in=booking_ids,
            status__in=['HOLDING', 'PENDING_PAYMENT'],
            hold_expires_at__lte=now,
        ).update(status='CANCELLED', updated_at=now)
    return count
