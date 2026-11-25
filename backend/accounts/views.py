"""Auth, Profile, Operator Self-Service, and Operator Admin APIs mapped to users, operators, operator_memberships."""
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Operator, OperatorMembership
from common import (
    IsOperatorManagerOrOwner,
    IsOperatorMember,
    IsPlatformAdmin,
    IsPlatformStaffOrAdmin,
    api_error,
    get_active_operator_ids,
)
from content.models import AuditLog, OutboxEvent

User = get_user_model()


def _queue_account_email(*, event_type: str, user, subject: str, body: str, extra_payload: dict | None = None):
    payload = {'email': user.email, 'subject': subject, **(extra_payload or {})}
    OutboxEvent.objects.create(
        event_type=event_type,
        aggregate_id=user.id,
        payload=payload,
        published_at=timezone.now(),
        attempts=1,
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@vexuyenviet.vn'),
        recipient_list=[user.email],
        fail_silently=True,
    )


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        full_name = (request.data.get('full_name') or '').strip()
        if not email or not password:
            return api_error(
                'Valid email and password are required.',
                'INVALID_INPUT',
                status.HTTP_400_BAD_REQUEST,
                request,
            )
        try:
            validate_email(email)
        except DjangoValidationError:
            return api_error('Invalid email address format.', 'INVALID_EMAIL', status.HTTP_400_BAD_REQUEST, request)

        candidate = User(email=email, full_name=full_name)
        try:
            validate_password(password, user=candidate)
        except DjangoValidationError as exc:
            return api_error('; '.join(exc.messages), 'WEAK_PASSWORD', status.HTTP_422_UNPROCESSABLE_ENTITY, request)

        if User.objects.filter(email=email).exists():
            return api_error('Unable to register with the provided email.', 'EMAIL_EXISTS', status.HTTP_409_CONFLICT, request)

        with transaction.atomic():
            user = User.objects.create_user(email=email, password=password, full_name=full_name)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            _queue_account_email(
                event_type='EMAIL_VERIFICATION_REQUESTED',
                user=user,
                subject='[Vé Xuyên Việt] Xác minh địa chỉ email',
                body=f'Chào {user.full_name or user.email},\nMã xác minh email của bạn: uid={uid} token={token}',
                extra_payload={'uid': uid},
            )
            AuditLog.objects.create(
                actor=user,
                action='USER_REGISTERED',
                resource_type='User',
                resource_id=str(user.id),
            )

        login(request, user)
        return Response(
            {
                'detail': 'Registered successfully.',
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'email_verified': False,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        if not email or not password:
            return api_error('Email and password are required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        user = authenticate(request, username=email, password=password)
        if not user or not user.is_active:
            return api_error('Invalid email or password.', 'AUTH_FAILED', status.HTTP_401_UNAUTHORIZED, request)
        login(request, user)
        return Response(
            {
                'detail': 'Logged in.',
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'email_verified': user.email_verified_at is not None,
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'password_reset'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        user = User.objects.filter(email=email, is_active=True).first() if email else None
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            _queue_account_email(
                event_type='PASSWORD_RESET_REQUESTED',
                user=user,
                subject='[Vé Xuyên Việt] Khôi phục mật khẩu',
                body=f'Yêu cầu đặt lại mật khẩu cho {user.email}: uid={uid} token={token}',
                extra_payload={'uid': uid},
            )
        # Uniform response: never leak whether email exists and never return uid/token in HTTP response
        return Response(
            {'detail': 'If the email exists, password reset instructions have been sent.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'password_reset'

    def post(self, request):
        uid = request.data.get('uid') or ''
        token = request.data.get('token') or ''
        new_password = request.data.get('password') or ''
        if not uid or not token or not new_password:
            return api_error('uid, token, and password are required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:
            return api_error('Invalid or expired reset token.', 'INVALID_TOKEN', status.HTTP_400_BAD_REQUEST, request)
        if not default_token_generator.check_token(user, token):
            return api_error('Invalid or expired reset token.', 'INVALID_TOKEN', status.HTTP_400_BAD_REQUEST, request)
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return api_error('; '.join(exc.messages), 'WEAK_PASSWORD', status.HTTP_422_UNPROCESSABLE_ENTITY, request)

        with transaction.atomic():
            user.set_password(new_password)
            user.save(update_fields=['password'])
            AuditLog.objects.create(
                actor=user,
                action='PASSWORD_RESET_COMPLETED',
                resource_type='User',
                resource_id=str(user.id),
            )
        return Response({'detail': 'Password updated.'}, status=status.HTTP_200_OK)


class EmailVerificationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        _queue_account_email(
            event_type='EMAIL_VERIFICATION_REQUESTED',
            user=user,
            subject='[Vé Xuyên Việt] Xác minh địa chỉ email',
            body=f'Xác minh địa chỉ email {user.email}: uid={uid} token={token}',
            extra_payload={'uid': uid},
        )
        return Response(
            {'detail': 'Verification instructions have been sent to your email.'},
            status=status.HTTP_200_OK,
        )


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid') or ''
        token = request.data.get('token') or ''
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:
            return api_error('Invalid or expired verification token.', 'INVALID_TOKEN', status.HTTP_400_BAD_REQUEST, request)
        if not default_token_generator.check_token(user, token):
            return api_error('Invalid or expired verification token.', 'INVALID_TOKEN', status.HTTP_400_BAD_REQUEST, request)
        user.email_verified_at = timezone.now()
        user.save(update_fields=['email_verified_at'])
        AuditLog.objects.create(
            actor=user,
            action='EMAIL_VERIFIED',
            resource_type='User',
            resource_id=str(user.id),
        )
        return Response({'detail': 'Email verified.'}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        memberships = list(
            OperatorMembership.objects.filter(user=user, is_active=True).values(
                'operator_id', 'role', 'operator__name', 'operator__status'
            )
        )
        return Response({
            'id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'email_verified': user.email_verified_at is not None,
            'email_verified_at': user.email_verified_at,
            'memberships': memberships,
        })


class MeProfilePatchView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        if 'full_name' in request.data:
            user.full_name = (request.data.get('full_name') or '').strip()
            user.save(update_fields=['full_name'])
        return Response({'id': str(user.id), 'email': user.email, 'full_name': user.full_name})


class MyOperatorsView(APIView):
    permission_classes = [IsOperatorMember]

    def get(self, request):
        rows = list(
            OperatorMembership.objects.filter(user=request.user, is_active=True).values(
                'operator_id', 'operator__name', 'operator__status', 'role'
            )
        )
        return Response({'results': rows})


class OperatorRegisterView(APIView):
    """Allow an authenticated user to apply/register a new bus operator (status=DRAFT) and become OWNER."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return api_error('Operator name is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        with transaction.atomic():
            op = Operator.objects.create(
                name=name,
                legal_name=(request.data.get('legal_name') or '').strip(),
                contact_email=(request.data.get('contact_email') or request.user.email).strip(),
                status='DRAFT',
            )
            OperatorMembership.objects.create(
                user=request.user,
                operator=op,
                role='OWNER',
                is_active=True,
            )
            AuditLog.objects.create(
                actor=request.user,
                operator=op,
                action='OPERATOR_APPLIED',
                resource_type='Operator',
                resource_id=str(op.id),
            )
        return Response(
            {'id': str(op.id), 'name': op.name, 'status': op.status, 'role': 'OWNER'},
            status=status.HTTP_201_CREATED,
        )


class OperatorSelfProfileView(APIView):
    """View or update the currently scoped operator's profile information."""

    permission_classes = [IsOperatorMember]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, request=request)
        if not op_ids:
            return api_error('No active operator membership.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        op = Operator.objects.filter(id=op_ids[0]).first()
        return Response({
            'id': str(op.id),
            'name': op.name,
            'legal_name': op.legal_name,
            'contact_email': op.contact_email,
            'status': op.status,
        })

    def patch(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Only operator OWNER or MANAGER may update operator profile.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        op = Operator.objects.filter(id=op_ids[0]).first()
        for field in ('name', 'legal_name', 'contact_email'):
            if field in request.data:
                val = (request.data.get(field) or '').strip()
                if field == 'name' and not val:
                    return api_error('Operator name cannot be empty.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
                setattr(op, field, val)
        op.save()
        AuditLog.objects.create(
            actor=request.user,
            operator=op,
            action='OPERATOR_PROFILE_UPDATED',
            resource_type='Operator',
            resource_id=str(op.id),
        )
        return Response({
            'id': str(op.id),
            'name': op.name,
            'legal_name': op.legal_name,
            'contact_email': op.contact_email,
            'status': op.status,
        })


class OperatorSelfMembershipsView(APIView):
    """Allow operator OWNER/MANAGER to list staff and OWNER to add/update operator memberships."""

    permission_classes = [IsOperatorManagerOrOwner]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        if not op_ids:
            return api_error('Forbidden.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        rows = list(
            OperatorMembership.objects.filter(operator_id=op_ids[0])
            .select_related('user')
            .order_by('created_at')
            .values('id', 'user_id', 'user__email', 'user__full_name', 'role', 'is_active')
        )
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER'], request=request)
        if not op_ids:
            return api_error('Only operator OWNER can manage staff roles.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        operator_id = op_ids[0]
        role = request.data.get('role')
        if role not in ('OWNER', 'MANAGER', 'STAFF'):
            return api_error('Invalid membership role.', 'INVALID_ROLE', status.HTTP_400_BAD_REQUEST, request)
        target_user = None
        if request.data.get('user_id'):
            target_user = User.objects.filter(id=request.data['user_id']).first()
        elif request.data.get('email'):
            target_user = User.objects.filter(email=str(request.data['email']).strip().lower()).first()
        if not target_user:
            return api_error('Target user not found.', 'USER_NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        is_active = bool(request.data.get('is_active', True))
        m, _ = OperatorMembership.objects.update_or_create(
            operator_id=operator_id,
            user=target_user,
            defaults={'role': role, 'is_active': is_active},
        )
        AuditLog.objects.create(
            actor=request.user,
            operator_id=operator_id,
            action='OPERATOR_MEMBERSHIP_UPDATED',
            resource_type='OperatorMembership',
            resource_id=str(m.id),
            metadata={'user_id': str(target_user.id), 'role': role, 'is_active': is_active},
        )
        return Response({'id': str(m.id), 'user_id': str(target_user.id), 'role': m.role, 'is_active': m.is_active}, status=status.HTTP_201_CREATED)


class AdminOperatorsView(APIView):
    permission_classes = [IsPlatformStaffOrAdmin]

    def get(self, request):
        qs = Operator.objects.all().order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        rows = list(qs.values('id', 'name', 'legal_name', 'contact_email', 'status'))
        return Response({'results': rows})

    def post(self, request):
        if not request.user.is_superuser:
            return api_error('Only platform admin can create operators directly.', 'FORBIDDEN', status.HTTP_403_FORBIDDEN, request)
        name = (request.data.get('name') or '').strip()
        if not name:
            return api_error('Operator name is required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        op = Operator.objects.create(
            name=name,
            legal_name=(request.data.get('legal_name') or '').strip(),
            contact_email=(request.data.get('contact_email') or '').strip(),
            status='DRAFT',
        )
        AuditLog.objects.create(actor=request.user, operator=op, action='OPERATOR_CREATED', resource_type='Operator', resource_id=str(op.id))
        return Response({'id': str(op.id), 'status': op.status}, status=status.HTTP_201_CREATED)


class AdminOperatorStatusView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, operator_id):
        op = Operator.objects.filter(id=operator_id).first()
        if not op:
            return api_error('Operator not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        new_status = request.data.get('status')
        if new_status not in ('DRAFT', 'ACTIVE', 'SUSPENDED'):
            return api_error('Invalid operator status.', 'INVALID_STATUS', status.HTTP_400_BAD_REQUEST, request)
        op.status = new_status
        op.save(update_fields=['status', 'updated_at'])
        AuditLog.objects.create(
            actor=request.user, operator=op, action='OPERATOR_STATUS_CHANGED',
            resource_type='Operator', resource_id=str(op.id), metadata={'status': new_status},
        )
        return Response({'detail': 'Operator status updated.', 'id': str(op.id), 'status': op.status})


class AdminOperatorMembershipsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, operator_id):
        op = Operator.objects.filter(id=operator_id).first()
        if not op:
            return api_error('Operator not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        user_id = request.data.get('user_id')
        role = request.data.get('role')
        if role not in ('OWNER', 'MANAGER', 'STAFF'):
            return api_error('Invalid membership role.', 'INVALID_ROLE', status.HTTP_400_BAD_REQUEST, request)
        m, _ = OperatorMembership.objects.update_or_create(
            operator=op, user_id=user_id, defaults={'role': role, 'is_active': True}
        )
        AuditLog.objects.create(
            actor=request.user, operator=op, action='MEMBERSHIP_ASSIGNED',
            resource_type='OperatorMembership', resource_id=str(m.id), metadata={'user_id': str(user_id), 'role': role},
        )
        return Response({'id': str(m.id), 'role': m.role}, status=status.HTTP_201_CREATED)
