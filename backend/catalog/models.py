"""App 3: catalog — Location, Route, RouteStop, Trip, TripStop, TripUnit, TripFare, PickupOption (8 tables)."""
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from common import BaseRecord


class Location(BaseRecord):
    name = models.CharField(max_length=160)
    province = models.CharField(max_length=120, blank=True)
    address = models.TextField(blank=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    class Meta:
        db_table = 'locations'


class Route(BaseRecord):
    operator = models.ForeignKey('accounts.Operator', on_delete=models.PROTECT)
    name = models.CharField(max_length=180)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'routes'


class RouteStop(BaseRecord):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='stops')
    location = models.ForeignKey(Location, on_delete=models.PROTECT)
    sequence = models.PositiveSmallIntegerField()
    allow_pickup = models.BooleanField(default=True)
    allow_dropoff = models.BooleanField(default=True)

    class Meta:
        db_table = 'route_stops'
        constraints = [
            models.UniqueConstraint(fields=['route', 'sequence'], name='uq_route_stop_sequence'),
        ]


class Trip(BaseRecord):
    route = models.ForeignKey(Route, on_delete=models.PROTECT)
    vehicle = models.ForeignKey('fleet.Vehicle', on_delete=models.PROTECT)
    departure_at = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('DRAFT', 'Draft'),
            ('OPEN', 'Open'),
            ('CLOSED', 'Closed'),
            ('CANCELLED', 'Cancelled'),
            ('COMPLETED', 'Completed'),
        ],
        default='DRAFT',
    )

    class Meta:
        db_table = 'trips'
        indexes = [
            models.Index(fields=['status', 'departure_at'], name='ix_trip_status_departure'),
            models.Index(fields=['route'], name='ix_trip_route'),
        ]

    def clean(self):
        if self.route_id and self.vehicle_id and self.route.operator_id != self.vehicle.operator_id:
            raise ValidationError('Trip route and vehicle must belong to the same operator.')


class TripStop(BaseRecord):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stops')
    route_stop = models.ForeignKey(RouteStop, on_delete=models.PROTECT)
    sequence = models.PositiveSmallIntegerField()
    scheduled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'trip_stops'
        constraints = [
            models.UniqueConstraint(fields=['trip', 'sequence'], name='uq_trip_stop_sequence'),
        ]


class TripUnit(BaseRecord):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='units')
    layout_unit = models.ForeignKey('fleet.LayoutUnit', on_delete=models.PROTECT)
    unit_code = models.CharField(max_length=16)
    kind = models.CharField(max_length=18)
    price_mode = models.CharField(max_length=15, default='WHOLE_UNIT')
    max_adults = models.PositiveSmallIntegerField(null=True, blank=True)
    max_children = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'trip_units'
        constraints = [
            models.UniqueConstraint(fields=['trip', 'unit_code'], name='uq_trip_unit_code'),
        ]


class TripFare(BaseRecord):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE)
    from_sequence = models.PositiveSmallIntegerField()
    to_sequence = models.PositiveSmallIntegerField()
    unit_kind = models.CharField(max_length=18)
    base_amount = models.DecimalField(max_digits=14, decimal_places=2)
    child_extra_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='VND')

    class Meta:
        db_table = 'trip_fares'
        constraints = [
            models.CheckConstraint(condition=Q(to_sequence__gt=F('from_sequence')), name='ck_fare_positive_section'),
            models.CheckConstraint(condition=Q(base_amount__gt=0), name='ck_fare_base_positive'),
            models.UniqueConstraint(
                fields=['trip', 'from_sequence', 'to_sequence', 'unit_kind'],
                name='uq_trip_segment_unit_fare',
            ),
        ]
        indexes = [
            models.Index(fields=['trip', 'from_sequence', 'to_sequence', 'unit_kind'], name='ix_trip_fare_lookup'),
        ]


class PickupOption(BaseRecord):
    operator = models.ForeignKey('accounts.Operator', on_delete=models.PROTECT)
    route_stop = models.ForeignKey(RouteStop, on_delete=models.PROTECT)
    name = models.CharField(max_length=180)
    kind = models.CharField(max_length=16, choices=[('FIXED', 'Fixed'), ('ZONE', 'Zone')])
    fee = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'pickup_options'
        constraints = [
            models.CheckConstraint(condition=Q(fee__gte=0) | Q(fee__isnull=True), name='ck_pickup_option_fee_nonneg'),
        ]
