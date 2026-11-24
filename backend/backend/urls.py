from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('fleet.urls')),
    path('api/v1/', include('catalog.urls')),
    path('api/v1/', include('bookings.urls')),
    path('api/v1/', include('payments.urls')),
    path('api/v1/', include('finance.urls')),
    path('api/v1/', include('content.urls')),
]
