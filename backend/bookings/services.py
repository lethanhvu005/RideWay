"""Atomic hold, passenger assignment, custom pickup quoting, and quote acceptance services."""
from datetime import timedelta
from decimal import Decimal
import uuid

from django.db import IntegrityError, transaction
from django.utils import timezone
from psycopg.types.range import Range

from bookings.models import Booking, BookingItem, BookingItemPassenger, BookingPassenger, PickupRequest
from catalog.models import PickupOption, Trip, TripFare, TripStop, TripUnit
from finance.models import PolicyVersion
from inventory.models import InventoryAllocation
from inventory.services import reclaim_expired_holds


class HoldConflictError(Exception):
    pass


class HoldValidationError(Exception):
    pass


class BookingStateError(Exception):
    pass


class BookingValidationError(Exception):
    pass


def get_active_platform_config():
    pv = (
        PolicyVersion.objects.filter(scope='PLATFORM', operator__isnull=True, approved_at__isnull=False)
        .order_by('-effective_at')
        .first()
    )
    return pv.rules_json if pv else {}


def create_atomic_hold(*, customer, trip_id, from_sequence, to_sequence, unit_requests, idempotency_key):
    if not unit_requests or len(unit_requests) > 20:
        raise HoldValidationError('Between 1 and 20 units must be selected.')
    if from_sequence >= to_sequence:
        raise HoldValidationError('from_sequence must be strictly less than to_sequence.')

    now = timezone.now()
    existing = Booking.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        if existing.customer_id != customer.id:
            raise HoldValidationError('Idempotency key belongs to another user.')
        if existing.hold_expires_at <= now or existing.status == 'CANCELLED':
            # API-04: Retry with expired idempotency key returns 409 conflict
            raise HoldConflictError('Previous hold for this idempotency key has expired.')
        return existing

    platform_rules = get_active_platform_config()

    try:
        with transaction.atomic():
            reclaim_expired_holds(now=now)

            trip = Trip.objects.select_related('route', 'route__operator', 'vehicle').get(id=trip_id)
            if trip.status != 'OPEN' or trip.route.operator.status != 'ACTIVE':
                raise HoldValidationError('Trip is not open for booking.')

            origin_stop = TripStop.objects.select_related('route_stop').filter(trip=trip, sequence=from_sequence).first()
            dest_stop = TripStop.objects.select_related('route_stop').filter(trip=trip, sequence=to_sequence).first()
            if not origin_stop or not dest_stop:
                raise HoldValidationError('Invalid origin or destination stop sequence.')
            if not origin_stop.route_stop.allow_pickup or not dest_stop.route_stop.allow_dropoff:
                raise HoldValidationError('Selected stop does not allow boarding or alighting.')

            unit_ids = sorted(str(u['trip_unit_id']) for u in unit_requests)
            locked_units = {
                str(u.id): u
                for u in TripUnit.objects.select_for_update().filter(trip=trip, id__in=unit_ids).order_by('id')
            }
            if len(locked_units) != len(set(unit_ids)):
                raise HoldValidationError('One or more selected units do not belong to this trip or contain duplicates.')

            expires_at = now + timedelta(minutes=10)
            booking = Booking.objects.create(
                customer=customer,
                booking_code=f"VXV-{uuid.uuid4().hex[:8].upper()}",
                status='HOLDING',
                hold_expires_at=expires_at,
                contact_email=customer.email,
                total_amount=Decimal('0.00'),
                currency='VND',
                pricing_snapshot={'source': 'backend_authoritative', 'quote_accepted': True},
                policy_snapshot=platform_rules,
                idempotency_key=idempotency_key,
            )

            total_amount = Decimal('0.00')
            section_range = Range(from_sequence, to_sequence, '[)')

            for req in unit_requests:
                unit = locked_units[str(req['trip_unit_id'])]
                adults = int(req.get('adult_count', 0))
                children = int(req.get('child_count', 0))
                if adults < 1:
                    raise HoldValidationError('Each booked unit requires at least 1 adult.')
                if unit.max_adults is not None and adults > unit.max_adults:
                    raise HoldValidationError(f'Unit {unit.unit_code} exceeds max_adults ({unit.max_adults}).')
                if unit.max_children is not None and children > unit.max_children:
                    raise HoldValidationError(f'Unit {unit.unit_code} exceeds max_children ({unit.max_children}).')

                fare = TripFare.objects.filter(
                    trip=trip, from_sequence=from_sequence, to_sequence=to_sequence, unit_kind=unit.kind
                ).first()
                if not fare:
                    raise HoldValidationError(f'No fare configured for {unit.kind} on selected segment.')

                child_surcharge = Decimal('0.00')
                if children > 0:
                    fixed_child_fee = platform_rules.get('child_surcharge_amount')
                    if fixed_child_fee is None and fare.child_extra_amount is None:
                        raise HoldValidationError('Child surcharge policy is not configured (OPEN-01/02, API-06).')
                    fee_per_child = Decimal(str(fixed_child_fee if fixed_child_fee is not None else fare.child_extra_amount))
                    child_surcharge = fee_per_child * children

                item_total = fare.base_amount + child_surcharge
                total_amount += item_total

                item = BookingItem.objects.create(
                    booking=booking,
                    trip_unit=unit,
                    from_sequence=from_sequence,
                    to_sequence=to_sequence,
                    adult_count=adults,
                    child_count=children,
                    unit_price=fare.base_amount,
                    child_surcharge=child_surcharge,
                    price_snapshot={
                        'base_amount': str(fare.base_amount),
                        'child_surcharge': str(child_surcharge),
                        'unit_code': unit.unit_code,
                    },
                )

                InventoryAllocation.objects.create(
                    trip_unit=unit,
                    booking_item=item,
                    section=section_range,
                    status='HELD',
                    expires_at=expires_at,
                )

            booking.total_amount = total_amount
            booking.save(update_fields=['total_amount', 'updated_at'])
            return booking
    except IntegrityError as exc:
        raise HoldConflictError('One or more selected units are no longer available on this segment.') from exc


def assign_passengers_and_pickup(*, customer, booking_id, passengers_data, item_assignments, pickup_data=None):
    now = timezone.now()
    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(id=booking_id, customer=customer).first()
        if not booking:
            raise BookingStateError('Booking not found.')
        if booking.status not in ('HOLDING', 'PENDING_PAYMENT') or booking.hold_expires_at <= now:
            raise BookingStateError('Booking hold has expired or is no longer editable.')

        items = {
            str(it.id): it
            for it in BookingItem.objects.select_related('trip_unit', 'trip_unit__trip__route').filter(booking=booking)
        }
        if not items:
            raise BookingStateError('Booking has no items.')

        BookingItemPassenger.objects.filter(item__booking=booking).delete()
        BookingPassenger.objects.filter(booking=booking).delete()
        PickupRequest.objects.filter(booking_item__booking=booking).delete()

        created_passengers = {}
        for idx, p in enumerate(passengers_data):
            key = str(p.get('client_ref', idx))
            created_passengers[key] = BookingPassenger.objects.create(
                booking=booking,
                full_name=p['full_name'].strip(),
                kind=p['kind'],
                birth_date=p.get('birth_date'),
                contact_phone=(p.get('contact_phone') or '').strip(),
            )

        for assign in item_assignments:
            item = items.get(str(assign['booking_item_id']))
            if not item:
                raise BookingValidationError('Invalid booking_item_id for this booking.')
            adults = 0
            children = 0
            for ref in assign.get('passenger_refs', []):
                pax = created_passengers.get(str(ref))
                if not pax:
                    raise BookingValidationError(f'Unknown passenger reference: {ref}')
                if pax.kind == 'ADULT':
                    adults += 1
                else:
                    children += 1
                BookingItemPassenger.objects.create(item=item, passenger=pax)

            unit = item.trip_unit
            if unit.max_adults is not None and adults > unit.max_adults:
                raise BookingValidationError(f'Unit {unit.unit_code} exceeds max_adults ({unit.max_adults}).')
            if unit.max_children is not None and children > unit.max_children:
                raise BookingValidationError(f'Unit {unit.unit_code} exceeds max_children ({unit.max_children}).')
            if adults != item.adult_count or children != item.child_count:
                raise BookingValidationError('Assigned passenger counts must match held item counts.')

        pickup_fee_total = Decimal('0.00')
        has_unaccepted_custom = False
        if pickup_data:
            first_item = next(iter(items.values()))
            operator_id = first_item.trip_unit.trip.route.operator_id
            for req in pickup_data:
                direction = req['direction']
                kind = req['kind']
                if kind == 'FIXED':
                    opt = PickupOption.objects.filter(
                        id=req.get('option_id'), operator_id=operator_id, is_active=True
                    ).first()
                    if not opt:
                        raise BookingValidationError('Invalid or inactive pickup option.')
                    fee = opt.fee or Decimal('0.00')
                    pickup_fee_total += fee
                    PickupRequest.objects.create(
                        booking_item=first_item,
                        direction=direction,
                        kind='FIXED',
                        option=opt,
                        fee_snapshot=fee,
                        status='ACCEPTED',
                    )
                else:
                    addr = (req.get('requested_address') or '').strip()
                    if not addr:
                        raise BookingValidationError('Custom pickup/dropoff requires requested_address.')
                    has_unaccepted_custom = True
                    PickupRequest.objects.create(
                        booking_item=first_item,
                        direction=direction,
                        kind='CUSTOM',
                        requested_address=addr,
                        fee_snapshot=None,
                        status='PENDING',
                    )

        base_total = sum((it.unit_price + it.child_surcharge) for it in items.values())
        booking.total_amount = base_total + pickup_fee_total
        snap = dict(booking.pricing_snapshot or {})
        snap['quote_accepted'] = not has_unaccepted_custom
        booking.pricing_snapshot = snap
        booking.status = 'PENDING_PAYMENT'
        booking.save(update_fields=['total_amount', 'pricing_snapshot', 'status', 'updated_at'])
        return booking


def operator_quote_pickup(*, operator_ids, pickup_id, fee_amount):
    with transaction.atomic():
        pr = (
            PickupRequest.objects.select_for_update()
            .select_related('booking_item__booking', 'booking_item__trip_unit__trip__route')
            .filter(id=pickup_id, booking_item__trip_unit__trip__route__operator_id__in=operator_ids)
            .first()
        )
        if not pr:
            raise BookingStateError('PickupRequest not found for this operator.')
        fee = Decimal(str(fee_amount))
        if fee < 0:
            raise BookingValidationError('Fee must be >= 0.')
        pr.fee_snapshot = fee
        pr.status = 'QUOTED'
        pr.save(update_fields=['fee_snapshot', 'status', 'updated_at'])

        booking = Booking.objects.select_for_update().get(id=pr.booking_item.booking_id)
        items = list(booking.items.all())
        base_total = sum((it.unit_price + it.child_surcharge) for it in items)
        pickup_fees = sum(
            (p.fee_snapshot or Decimal('0.00'))
            for p in PickupRequest.objects.filter(booking_item__booking=booking)
        )
        booking.total_amount = base_total + pickup_fees
        snap = dict(booking.pricing_snapshot or {})
        snap['quote_accepted'] = False
        booking.pricing_snapshot = snap
        booking.save(update_fields=['total_amount', 'pricing_snapshot', 'updated_at'])
        return pr, booking


def accept_booking_quote(*, customer, booking_id, expected_total_amount):
    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(id=booking_id, customer=customer).first()
        if not booking:
            raise BookingStateError('Booking not found.')
        pending_pickups = PickupRequest.objects.filter(booking_item__booking=booking, status='PENDING').exists()
        if pending_pickups:
            raise BookingValidationError('Custom pickup has not been quoted by operator yet (API-12).')
        expected = Decimal(str(expected_total_amount))
        if expected != booking.total_amount:
            raise BookingValidationError(f'Expected total {expected} does not match current total {booking.total_amount}.')
        PickupRequest.objects.filter(booking_item__booking=booking, status='QUOTED').update(status='ACCEPTED')
        snap = dict(booking.pricing_snapshot or {})
        snap['quote_accepted'] = True
        booking.pricing_snapshot = snap
        booking.save(update_fields=['pricing_snapshot', 'updated_at'])
        return booking
