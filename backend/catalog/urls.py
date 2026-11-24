from django.urls import path
from .views import (
    AdminLocationCreateView,
    AdminTripsView,
    LocationListView,
    OperatorPickupOptionsView,
    OperatorRouteStopsView,
    OperatorRoutesView,
    OperatorTripFaresView,
    OperatorTripStatusView,
    OperatorTripsView,
    TripSearchView,
    TripUnitsView,
)

urlpatterns = [
    path('locations', LocationListView.as_view(), name='locations'),
    path('admin/locations', AdminLocationCreateView.as_view(), name='admin-locations'),
    path('trips', TripSearchView.as_view(), name='trip-search'),
    path('trips/<uuid:trip_id>/units', TripUnitsView.as_view(), name='trip-units'),
    path('operators/me/routes', OperatorRoutesView.as_view(), name='operator-routes'),
    path('operators/me/routes/<uuid:route_id>/stops', OperatorRouteStopsView.as_view(), name='operator-route-stops'),
    path('operators/me/trips', OperatorTripsView.as_view(), name='operator-trips'),
    path('operators/me/trips/<uuid:trip_id>/fares', OperatorTripFaresView.as_view(), name='operator-trip-fares'),
    path('operators/me/trips/<uuid:trip_id>/status', OperatorTripStatusView.as_view(), name='operator-trip-status'),
    path('operators/me/pickup-options', OperatorPickupOptionsView.as_view(), name='operator-pickup-options'),
    path('admin/trips', AdminTripsView.as_view(), name='admin-trips'),
]
