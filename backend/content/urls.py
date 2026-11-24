from django.urls import path
from .views import (
    AdminAuditLogsView,
    AdminDestinationCreateView,
    AdminPostPatchView,
    AdminPostsView,
    AdminReportsSummaryView,
    DestinationListView,
    HealthLiveView,
    HealthReadyView,
    PostDetailView,
    PostListView,
)

urlpatterns = [
    path('destinations', DestinationListView.as_view(), name='destinations'),
    path('posts', PostListView.as_view(), name='post-list'),
    path('posts/<slug:slug>', PostDetailView.as_view(), name='post-detail'),
    path('admin/destinations', AdminDestinationCreateView.as_view(), name='admin-destinations'),
    path('admin/posts', AdminPostsView.as_view(), name='admin-posts'),
    path('admin/posts/<uuid:post_id>', AdminPostPatchView.as_view(), name='admin-post-patch'),
    path('admin/audit-logs', AdminAuditLogsView.as_view(), name='admin-audit-logs'),
    path('admin/reports/summary', AdminReportsSummaryView.as_view(), name='admin-reports-summary'),
    path('health/live', HealthLiveView.as_view(), name='health-live'),
    path('health/ready', HealthReadyView.as_view(), name='health-ready'),
]
