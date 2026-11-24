"""App 2: fleet — VehicleType, SeatLayout, LayoutUnit, Vehicle (4 tables)."""
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from common import BaseRecord


class VehicleType(BaseRecord):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)

    class Meta:
        db_table = 'vehicle_types'


class SeatLayout(BaseRecord):
    operator = models.ForeignKey('accounts.Operator', on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    deck_count = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = 'seat_layouts'
        constraints = [
            models.CheckConstraint(condition=Q(deck_count__gte=1, deck_count__lte=2), name='ck_layout_deck_count'),
        ]


class LayoutUnit(BaseRecord):
    layout = models.ForeignKey(SeatLayout, on_delete=models.CASCADE, related_name='units')
    unit_code = models.CharField(max_length=16)
    kind = models.CharField(max_length=18, choices=[('CABIN', 'Cabin'), ('BED', 'Bed'), ('SEAT', 'Seat')])
    deck = models.PositiveSmallIntegerField(default=1)
    row_number = models.PositiveSmallIntegerField()
    column_number = models.PositiveSmallIntegerField()
    price_mode = models.CharField(
        max_length=15,
        choices=[('WHOLE_UNIT', 'Whole unit'), ('PER_PERSON', 'Per person')],
        default='WHOLE_UNIT',
    )
    max_adults = models.PositiveSmallIntegerField(null=True, blank=True)
    max_children = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'layout_units'
        constraints = [
            models.UniqueConstraint(fields=['layout', 'unit_code'], name='uq_layout_unit_code'),
            models.CheckConstraint(condition=Q(deck__gte=1, deck__lte=2), name='ck_layout_unit_deck'),
        ]


class Vehicle(BaseRecord):
    operator = models.ForeignKey('accounts.Operator', on_delete=models.PROTECT)
    type = models.ForeignKey(VehicleType, on_delete=models.PROTECT)
    layout = models.ForeignKey(SeatLayout, on_delete=models.PROTECT)
    registration = models.CharField(max_length=30)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = 'vehicles'
        constraints = [
            models.UniqueConstraint(fields=['operator', 'registration'], name='uq_registration_operator'),
        ]

    def clean(self):
        if self.layout_id and self.operator_id and self.layout.operator_id != self.operator_id:
            raise ValidationError('Vehicle layout must belong to the same operator.')
