"""Auth, Profile, and Operator Admin APIs mapped to users, operators, operator_memberships."""
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Operator, OperatorMembership
from common import IsOperatorMember, IsPlatformAdmin, api_error
from content.models import AuditLog

User = get_user_model()


class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        full_name = (request.data.get('full_name') or '').strip()
        if not email or len(password) < 8:
            return api_error('Valid email and password (min 8 chars) are required.', 'INVALID_INPUT', status.HTTP_400_BAD_REQUEST, request)
        if User.objects.filter(email=email).exists():
            return api_error('Email is already registered.', 'EMAIL_EXISTS', status.HTTP_409_CONFLICT, request)
        user = User.objects.create_user(email=email, password=password, full_name=full_name)
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

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
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

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()
        payload = {'detail': 'If the email exists, a reset token has been issued.'}
        if user:
            payload['uid'] = urlsafe_base64_encode(force_bytes(user.pk))
            payload['token'] = default_token_generator.make_token(user)
        return Response(payload, status=status.HTTP_201_CREATED)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid') or ''
        token = request.data.get('token') or ''
        new_password = request.data.get('password') or ''
        if len(new_password) < 8:
            return api_error('Password must be at least 8 characters.', 'INVALID_PASSWORD', status.HTTP_400_BAD_REQUEST, request)
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except Exception:
            return api_error('Invalid reset UID.', 'INVALID_UID', status.HTTP_400_BAD_REQUEST, request)
        if not default_token_generator.check_token(user, token):
            return api_error('Invalid or expired reset token.', 'INVALID_TOKEN', status.HTTP_400_BAD_REQUEST, request)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'}, status=status.HTTP_201_CREATED)


class EmailVerificationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        return Response(
            {
                'detail': 'Verification token generated.',
                'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                'token': default_token_generator.make_token(user),
            },
            status=status.HTTP_201_CREATED,
        )


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid') or ''
        token = request.data.get('token') or ''
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except Exception:
            return api_error('Invalid verification UID.', 'INVALID_UID', status.HTTP_400_BAD_REQUEST, request)
        if not default_token_generator.check_token(user, token):
            return api_error('Invalid or expired verification token.', 'INVALID_TOKEN', status.HTTP_400_BAD_REQUEST, request)
        user.email_verified_at = timezone.now()
        user.save(update_fields=['email_verified_at'])
        return Response({'detail': 'Email verified.'}, status=status.HTTP_201_CREATED)


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


class AdminOperatorsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        rows = list(Operator.objects.all().order_by('-created_at').values('id', 'name', 'legal_name', 'contact_email', 'status'))
        return Response({'results': rows})

    def post(self, request):
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
