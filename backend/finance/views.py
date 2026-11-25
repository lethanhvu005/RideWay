"""Finance, Policies, Cancellation, Refund, and Settlement APIs (6 DB tables)."""
from decimal import Decimal
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common import IsOperatorManagerOrOwner, IsPlatformAdmin, IsPlatformStaffOrAdmin, api_error, get_active_operator_ids
from content.models import AuditLog
from finance.models import CancellationRequest, CommissionAgreement, PolicyVersion, Refund, Settlement
from finance.services import (
    SettlementError,
    approve_settlement,
    decide_cancellation_request,
    submit_cancellation_request,
)


class CancellationRequestCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            req = submit_cancellation_request(
                customer=request.user,
                booking_id=booking_id,
                kind=request.data.get('kind', 'CANCEL'),
                reason=request.data.get('reason', ''),
            )
        except SettlementError as exc:
            return api_error(str(exc), 'CANCELLATION_ERROR', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response({'id': str(req.id), 'status': req.status}, status=status.HTTP_201_CREATED)


class OperatorSettlementsView(APIView):
    permission_classes = [IsOperatorManagerOrOwner]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        rows = list(
            Settlement.objects.filter(operator_id__in=op_ids).values(
                'id', 'period_start', 'period_end', 'gross_amount', 'commission_amount', 'payable_amount', 'status'
            )
        )
        return Response({'results': rows})


class OperatorPoliciesView(APIView):
    permission_classes = [IsOperatorManagerOrOwner]

    def get(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        rows = list(
            PolicyVersion.objects.filter(operator_id__in=op_ids).values(
                'id', 'scope', 'version', 'rules_json', 'effective_at', 'approved_at'
            )
        )
        return Response({'results': rows})

    def post(self, request):
        op_ids = get_active_operator_ids(request.user, roles=['OWNER', 'MANAGER'], request=request)
        pv = PolicyVersion.objects.create(
            operator_id=op_ids[0],
            scope='OPERATOR',
            version=request.data['version'],
            rules_json=request.data.get('rules_json', {}),
            effective_at=request.data['effective_at'],
            approved_at=None,
        )
        return Response({'id': str(pv.id), 'version': pv.version, 'approved': False}, status=status.HTTP_201_CREATED)


class AdminSettlementsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        rows = list(
            Settlement.objects.all().values(
                'id', 'operator_id', 'period_start', 'period_end', 'gross_amount', 'commission_amount', 'payable_amount', 'status'
            )
        )
        return Response({'results': rows})


class AdminSettlementApproveView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, settlement_id):
        try:
            s = approve_settlement(admin_user=request.user, settlement_id=settlement_id)
        except Settlement.DoesNotExist:
            return api_error('Settlement not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        except SettlementError as exc:
            return api_error(str(exc), 'COMMISSION_UNCONFIGURED', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response(
            {
                'id': str(s.id),
                'status': s.status,
                'commission_amount': str(s.commission_amount),
                'payable_amount': str(s.payable_amount),
            },
            status=status.HTTP_201_CREATED,
        )


class AdminPoliciesView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        rows = list(
            PolicyVersion.objects.all().values(
                'id', 'operator_id', 'scope', 'version', 'rules_json', 'effective_at', 'approved_at'
            )
        )
        return Response({'results': rows})

    def post(self, request):
        pv = PolicyVersion.objects.create(
            operator_id=request.data.get('operator_id'),
            scope=request.data.get('scope', 'PLATFORM'),
            version=request.data['version'],
            rules_json=request.data.get('rules_json', {}),
            effective_at=request.data['effective_at'],
            approved_at=request.data.get('approved_at'),
        )
        return Response({'id': str(pv.id), 'version': pv.version}, status=status.HTTP_201_CREATED)


class AdminCommissionAgreementsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        rows = list(
            CommissionAgreement.objects.all().values(
                'id', 'operator_id', 'percentage', 'effective_from', 'effective_to', 'approved_at'
            )
        )
        return Response({'results': rows})

    def post(self, request):
        ca = CommissionAgreement.objects.create(
            operator_id=request.data['operator_id'],
            percentage=Decimal(str(request.data['percentage'])) if request.data.get('percentage') is not None else None,
            effective_from=request.data['effective_from'],
            effective_to=request.data.get('effective_to'),
            approved_at=request.data.get('approved_at'),
        )
        return Response({'id': str(ca.id), 'percentage': str(ca.percentage) if ca.percentage is not None else None}, status=status.HTTP_201_CREATED)


class AdminCancellationRequestsView(APIView):
    permission_classes = [IsPlatformStaffOrAdmin]

    def get(self, request):
        rows = list(
            CancellationRequest.objects.all().order_by('-created_at').values(
                'id', 'booking_id', 'requested_by_id', 'kind', 'reason', 'status', 'created_at'
            )[:100]
        )
        return Response({'results': rows})


class AdminCancellationDecisionView(APIView):
    permission_classes = [IsPlatformStaffOrAdmin]

    def post(self, request, request_id):
        decision = request.data.get('decision')
        if decision not in ('APPROVED', 'REJECTED'):
            return api_error('decision must be APPROVED or REJECTED.', 'INVALID_DECISION', status.HTTP_400_BAD_REQUEST, request)
        try:
            cr, refund_id = decide_cancellation_request(
                actor=request.user,
                request_id=request_id,
                decision=decision,
                approved_refund_amount=request.data.get('approved_refund_amount'),
            )
        except CancellationRequest.DoesNotExist:
            return api_error('CancellationRequest not found.', 'NOT_FOUND', status.HTTP_404_NOT_FOUND, request)
        except SettlementError as exc:
            return api_error(str(exc), 'CANCELLATION_DECISION_ERROR', status.HTTP_422_UNPROCESSABLE_ENTITY, request)
        return Response({'id': str(cr.id), 'status': cr.status, 'refund_id': refund_id}, status=status.HTTP_201_CREATED)


class AdminRefundsView(APIView):
    permission_classes = [IsPlatformStaffOrAdmin]

    def get(self, request):
        rows = list(
            Refund.objects.all().order_by('-created_at').values(
                'id', 'booking_id', 'request_id', 'amount', 'status', 'provider_ref', 'created_at'
            )[:100]
        )
        return Response({'results': rows})


class AdminRefundExecuteView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, refund_id):
        return api_error(
            'Live provider refund execution is blocked until OPEN-03/OPEN-05 refund policy and provider contract are finalized.',
            'POLICY_BLOCKED',
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            request,
        )
