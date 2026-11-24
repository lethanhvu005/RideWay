from django.urls import path
from .views import (
    MyTicketsView,
    OperatorCheckInView,
    PaymentIntentCreateView,
    PaymentStatusView,
    PaymentWebhookView,
)

urlpatterns = [
    path('bookings/<uuid:booking_id>/payment-intents', PaymentIntentCreateView.as_view(), name='payment-intent-create'),
    path('bookings/<uuid:booking_id>/payment-status', PaymentStatusView.as_view(), name='payment-status'),
    path('webhooks/payments/<str:provider>', PaymentWebhookView.as_view(), name='payment-webhook'),
    path('me/tickets', MyTicketsView.as_view(), name='my-tickets'),
    path('operators/me/check-in', OperatorCheckInView.as_view(), name='operator-check-in'),
]
