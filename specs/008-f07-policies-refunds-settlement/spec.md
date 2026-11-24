# Feature Specification: F07 — Policies, Refunds & Settlement

**Feature Branch**: `008-f07-policies-refunds-settlement`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-17, FR-18, FR-19`) & SRS v0.3 (`P-08, O-04, A-03`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Versioned Cancellation/Change Requests & Refunds (Priority: P1)
A customer submits a cancellation or change request from their booking history (`P-08`). Backend evaluates fees against the `policy_version` snapshotted on the booking.

**Acceptance Scenarios**:
1. **Given** a booking with a snapshotted policy version without approved auto-refund rules, **When** a cancellation request is submitted, **Then** the request is held for manual review and MUST NOT auto-refund (`T12`).

### User Story 2 - Operator Commission & Multi-Operator Settlement (Priority: P1)
Admins and operators review period settlements (`O-04`, `A-03`) computed from snapshotted `commission_agreements`.

**Acceptance Scenarios**:
1. **Given** an operator without a configured commission percentage in `commission_agreements`, **When** an admin attempts to approve a final settlement, **Then** final approval is blocked (`T11`).

### Edge Cases
- Cancellation/refund tiers & operator override bounds: [NEEDS CLARIFICATION: OPEN-05 — Define platform cancellation/refund tiers and allowed operator overrides].
- Commission percentage, calculation base & payout cycle: [NEEDS CLARIFICATION: OPEN-06 — Define commission % per operator, base amount, and settlement cycle].

## Requirements *(mandatory)*

### Functional Requirements
- **FR-17** *(P1)*: System MUST support cancellation/change/refund requests evaluated against the booking's snapshotted `policy_version` (`P-08`).
- **FR-18** *(P1)*: System MUST support operator revenue reconciliation, percentage commission calculation, and settlement tracking (`A-03`), blocking final approval when commission rates are missing.
- **FR-19** *(P1)*: System MUST track custom pickup/dropoff fee approvals for settlement reconciliation.

### Key Entities
- **PolicyVersion, CancellationRequest & Refund**: Versioned cancellation/refund rules and refund records.
- **CommissionAgreement, Settlement & SettlementLine**: Operator commission contracts and periodic payout statements.

## Success Criteria *(mandatory)*
- **SC-001**: Zero settlements approved without a valid configured commission agreement (`T11`).
- **SC-002**: Zero automatic refunds executed without an approved policy rule (`T12`).
