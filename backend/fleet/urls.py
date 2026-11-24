from django.urls import path
from .views import (
    AdminVehicleTypeCreateView,
    OperatorLayoutUnitsView,
    OperatorLayoutsView,
    OperatorVehiclesView,
    VehicleTypeListView,
)

urlpatterns = [
    path('vehicle-types', VehicleTypeListView.as_view(), name='vehicle-types'),
    path('admin/vehicle-types', AdminVehicleTypeCreateView.as_view(), name='admin-vehicle-types'),
    path('operators/me/vehicles', OperatorVehiclesView.as_view(), name='operator-vehicles'),
    path('operators/me/layouts', OperatorLayoutsView.as_view(), name='operator-layouts'),
    path('operators/me/layouts/<uuid:layout_id>/units', OperatorLayoutUnitsView.as_view(), name='operator-layout-units'),
]
