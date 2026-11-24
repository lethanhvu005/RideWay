"""Content, CMS, AuditLog, Admin Summary Reports, and Health Check APIs (4 DB tables)."""
from django.db import connection
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Operator
from bookings.models import Booking
from catalog.models import Trip
from common import IsPlatformAdmin, api_error
from content.models import AuditLog, Destination, Post


class DestinationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        rows = list(
            Destination.objects.filter(is_published=True)
            .order_by('name')
            .values('id', 'name', 'slug', 'intro', 'cover_image_url')
        )
        return Response({'results': rows})


class AdminDestinationCreateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        dest = Destination.objects.create(
            name=request.data['name'].strip(),
            slug=request.data['slug'].strip(),
            intro=request.data.get('intro', ''),
            cover_image_url=request.data.get('cover_image_url', ''),
            is_published=bool(request.data.get('is_published', False)),
        )
        return Response({'id': str(dest.id), 'slug': dest.slug}, status=status.HTTP_201_CREATED)


class PostListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        rows = list(
            Post.objects.filter(published_at__isnull=False, published_at__lte=now)
            .order_by('-published_at')
            .values('id', 'title', 'slug', 'summary', 'category', 'published_at')[:30]
        )
        return Response({'results': rows})


class PostDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        now = timezone.now()
        post = Post.objects.filter(slug=slug, published_at__isnull=False, published_at__lte=now).first()
        if not post:
            return api_error('Post not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        return Response({
            'id': str(post.id),
            'title': post.title,
            'slug': post.slug,
            'summary': post.summary,
            'body': post.body,
            'category': post.category,
            'published_at': post.published_at,
        })


class AdminPostsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        rows = list(
            Post.objects.all().order_by('-created_at').values(
                'id', 'title', 'slug', 'summary', 'category', 'published_at', 'created_at'
            )
        )
        return Response({'results': rows})

    def post(self, request):
        publish = bool(request.data.get('publish', False))
        p = Post.objects.create(
            title=request.data['title'].strip(),
            slug=request.data['slug'].strip(),
            summary=request.data.get('summary', ''),
            body=request.data['body'],
            category=request.data.get('category', 'TRAVEL'),
            destination_id=request.data.get('destination_id'),
            published_at=timezone.now() if publish else None,
            author=request.user,
        )
        return Response({'id': str(p.id), 'published_at': p.published_at}, status=status.HTTP_201_CREATED)


class AdminPostPatchView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, post_id):
        p = Post.objects.filter(id=post_id).first()
        if not p:
            return api_error('Post not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        for field in ('title', 'summary', 'body', 'category'):
            if field in request.data:
                setattr(p, field, request.data[field])
        if 'publish' in request.data:
            p.published_at = timezone.now() if request.data['publish'] else None
        p.save()
        return Response({'id': str(p.id), 'published_at': p.published_at})


class AdminAuditLogsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = AuditLog.objects.all().order_by('-created_at')
        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        rows = list(
            qs.values('id', 'actor_id', 'operator_id', 'action', 'resource_type', 'resource_id', 'metadata', 'created_at')[:100]
        )
        return Response({'results': rows})


class AdminReportsSummaryView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        gross = Booking.objects.filter(status='CONFIRMED').aggregate(total=Sum('total_amount'))['total'] or 0
        return Response({
            'active_operators': Operator.objects.filter(status='ACTIVE').count(),
            'open_trips': Trip.objects.filter(status='OPEN').count(),
            'confirmed_bookings': Booking.objects.filter(status='CONFIRMED').count(),
            'exception_bookings': Booking.objects.filter(status='EXCEPTION').count(),
            'confirmed_gross_vnd': str(gross),
        })


class HealthLiveView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'status': 'live'})


class HealthReadyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            return Response({'status': 'ready', 'database': 'ok'})
        except Exception as exc:
            return api_error(f'Database unavailable: {exc}', 'DB_NOT_READY', status.HTTP_503_SERVICE_UNAVAILABLE, request)
