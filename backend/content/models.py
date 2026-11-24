"""App 8: content — Destination, Post, AuditLog, OutboxEvent (4 tables)."""
from django.conf import settings
from django.db import models
from common import BaseRecord


class Destination(BaseRecord):
    name = models.CharField(max_length=180)
    slug = models.SlugField(unique=True, max_length=200)
    intro = models.TextField(blank=True)
    cover_image_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        db_table = 'destinations'


class Post(BaseRecord):
    title = models.CharField(max_length=240)
    slug = models.SlugField(unique=True, max_length=250)
    summary = models.TextField(blank=True)
    body = models.TextField()
    category = models.CharField(max_length=32, default='TRAVEL')
    destination = models.ForeignKey(Destination, on_delete=models.SET_NULL, null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        db_table = 'posts'
        indexes = [
            models.Index(fields=['-published_at'], name='ix_post_published_at'),
        ]


class AuditLog(BaseRecord):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    operator = models.ForeignKey('accounts.Operator', on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=70)
    resource_type = models.CharField(max_length=60)
    resource_id = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = 'audit_logs'


class OutboxEvent(BaseRecord):
    event_type = models.CharField(max_length=80)
    aggregate_id = models.UUIDField()
    payload = models.JSONField(default=dict)
    published_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'outbox_events'
