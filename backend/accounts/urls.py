from django.urls import path
from .views import (
    AdminOperatorMembershipsView,
    AdminOperatorStatusView,
    AdminOperatorsView,
    CsrfTokenView,
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    LoginView,
    LogoutView,
    MeProfilePatchView,
    MeView,
    MyOperatorsView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
)

urlpatterns = [
    path('auth/csrf', CsrfTokenView.as_view(), name='auth-csrf'),
    path('auth/register', RegisterView.as_view(), name='auth-register'),
    path('auth/login', LoginView.as_view(), name='auth-login'),
    path('auth/logout', LogoutView.as_view(), name='auth-logout'),
    path('auth/password-reset/request', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('auth/email-verification/request', EmailVerificationRequestView.as_view(), name='email-verify-request'),
    path('auth/email-verification/confirm', EmailVerificationConfirmView.as_view(), name='email-verify-confirm'),
    path('me', MeView.as_view(), name='auth-me'),
    path('me/profile', MeProfilePatchView.as_view(), name='me-profile'),
    path('me/operators', MyOperatorsView.as_view(), name='me-operators'),
    path('admin/operators', AdminOperatorsView.as_view(), name='admin-operators'),
    path('admin/operators/<uuid:operator_id>/status', AdminOperatorStatusView.as_view(), name='admin-operator-status'),
    path('admin/operators/<uuid:operator_id>/memberships', AdminOperatorMembershipsView.as_view(), name='admin-operator-memberships'),
]
