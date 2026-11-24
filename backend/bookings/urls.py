from django.urls import path
from .views import (
    BookingAcceptQuoteView,
    BookingDetailView,
    BookingPassengersView,
    HoldCreateView,
    MyBookingsView,
    OperatorBookingItemsView,
    OperatorPickupQuoteView,
    OperatorPickupRequestsView,
)

urlpatterns = [
    path('holds', HoldCreateView.as_view(), name='hold-create'),
    path('bookings/<uuid:booking_id>/passengers', BookingPassengersView.as_view(), name='booking-passengers'),
    path('bookings/<uuid:booking_id>/accept-quote', BookingAcceptQuoteView.as_view(), name='booking-accept-quote'),
    path('bookings/<uuid:booking_id>', BookingDetailView.as_view(), name='booking-detail'),
    path('me/bookings', MyBookingsView.as_view(), name='my-bookings'),
    path('operators/me/booking-items', OperatorBookingItemsView.as_view(), name='operator-booking-items'),
    path('operators/me/pickup-requests', OperatorPickupRequestsView.as_view(), name='operator-pickup-requests'),
    path('operators/me/pickup-requests/<uuid:pickup_id>/quote', OperatorPickupQuoteView.as_view(), name='operator-pickup-quote'),
]
