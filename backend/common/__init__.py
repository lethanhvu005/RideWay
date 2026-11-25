"""Shared base models, permissions, and DRF exception handler across domain apps."""
from decimal import DecimalException
import uuid
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, models
from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import exception_handler


class BaseRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


def custom_exception_handler(exc, context):
    """Standardize DRF and domain errors to {'detail', 'code', 'request_id'} per API Design v1.0 §3."""
    request = context.get('request')
    req_id = (
        request.headers.get('X-Request-Id')
        if request and hasattr(request, 'headers')
        else None
    ) or str(uuid.uuid4())
    response = exception_handler(exc, context)
    if response is not None:
        detail = response.data.get('detail') if isinstance(response.data, dict) else str(response.data)
        code = response.data.get('code') if isinstance(response.data, dict) else getattr(exc, 'default_code', 'ERROR')
        response.data = {
            'detail': detail or 'Request failed.',
            'code': str(code).upper(),
            'request_id': req_id,
        }
        return response

    if isinstance(exc, DjangoValidationError):
        msg = '; '.join(exc.messages) if hasattr(exc, 'messages') else str(exc)
        return Response(
            {'detail': msg, 'code': 'VALIDATION_ERROR', 'request_id': req_id},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    if isinstance(exc, IntegrityError):
        return Response(
            {
                'detail': 'Database constraint violation or duplicate record.',
                'code': 'CONFLICT',
                'request_id': req_id,
            },
            status=status.HTTP_409_CONFLICT,
        )
    if isinstance(exc, (KeyError, ValueError, TypeError, DecimalException)):
        return Response(
            {
                'detail': f'Invalid or missing input parameter: {exc}',
                'code': 'INVALID_INPUT',
                'request_id': req_id,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


def api_error(detail: str, code: str, http_status=status.HTTP_400_BAD_REQUEST, request=None):
    req_id = (
        request.headers.get('X-Request-Id')
        if request and hasattr(request, 'headers')
        else None
    ) or str(uuid.uuid4())
    return Response({'detail': detail, 'code': code, 'request_id': req_id}, status=http_status)


def get_active_operator_ids(user, roles=None, request=None):
    """Return active operator UUIDs for user; respects X-Operator-Id header if authorized."""
    if not user or not user.is_authenticated:
        return []
    from accounts.models import OperatorMembership

    qs = OperatorMembership.objects.filter(user=user, is_active=True)
    if roles:
        qs = qs.filter(role__in=roles)
    op_ids = list(qs.values_list('operator_id', flat=True))
    if request is not None:
        header_op = request.headers.get('X-Operator-Id') or request.data.get('operator_id') if hasattr(request, 'data') and isinstance(request.data, dict) else None
        if header_op:
            matching = [oid for oid in op_ids if str(oid) == str(header_op)]
            return matching
    return op_ids


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsPlatformStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


class IsOperatorMember(BasePermission):
    def has_permission(self, request, view):
        return bool(get_active_operator_ids(request.user))


class IsOperatorManagerOrOwner(BasePermission):
    def has_permission(self, request, view):
        return bool(get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER']))
