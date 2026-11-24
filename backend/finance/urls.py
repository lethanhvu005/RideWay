from django.urls import path
from .views import (
    AdminCancellationDecisionView,
    AdminCancellationRequestsView,
    AdminCommissionAgreementsView,
    AdminPoliciesView,
    AdminRefundExecuteView,
    AdminRefundsView,
    AdminSettlementApproveView,
    AdminSettlementsView,
    CancellationRequestCreateView,
    OperatorPoliciesView,
    OperatorSettlementsView,
)

urlpatterns = [
    path('bookings/<uuid:booking_id>/cancellation-requests', CancellationRequestCreateView.as_view(), name='cancellation-create'),
    path('operators/me/settlements', OperatorSettlementsView.as_view(), name='operator-settlements'),
    path('operators/me/policies', OperatorPoliciesView.as_view(), name='operator-policies'),
    path('admin/settlements', AdminSettlementsView.as_view(), name='admin-settlements'),
    path('admin/settlements/<uuid:settlement_id>/approve', AdminSettlementApproveView.as_view(), name='admin-settlement-approve'),
    path('admin/policies', AdminPoliciesView.as_view(), name='admin-policies'),
    path('admin/commission-agreements', AdminCommissionAgreementsView.as_view(), name='admin-commission-agreements'),
    path('admin/cancellation-requests', AdminCancellationRequestsView.as_view(), name='admin-cancellation-requests'),
    path('admin/cancellation-requests/<uuid:request_id>/decision', AdminCancellationDecisionView.as_view(), name='admin-cancellation-decision'),
    path('admin/refunds', AdminRefundsView.as_view(), name='admin-refunds'),
    path('admin/refunds/<uuid:refund_id>/execute', AdminRefundExecuteView.as_view(), name='admin-refund-execute'),
]
