# Feature Specification: F01 — Authentication & Roles

**Feature Branch**: `002-f01-auth-roles`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-01, FR-02, FR-15`) & SRS v0.3 (`P-04, P-08, S-01`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Registration & Email/Password Login (Priority: P0)
A customer registers with email and password and signs in before holding or purchasing tickets.

**Independent Test**: Register a new customer account, sign in, verify session access to `/me`, and verify unauthenticated hold attempts are blocked.

**Acceptance Scenarios**:
1. **Given** an unauthenticated visitor, **When** they register with a valid email and password and sign in, **Then** they can access authenticated booking flows.
2. **Given** an unauthenticated visitor, **When** they attempt to create a hold, **Then** the system requires login first.

### User Story 2 - Role & Operator Membership Enforcement (Priority: P0)
Users with `Customer`, `Operator owner`, `Operator staff`, `Platform staff`, or `Platform admin` roles access only their authorized portals and tenant-scoped (`operator_id`) data.

**Independent Test**: Attempt cross-operator and cross-customer lookups; verify all unauthorized requests are rejected at the backend.

**Acceptance Scenarios**:
1. **Given** Operator A and Operator B, **When** Operator A requests Operator B's data, **Then** the system denies access (`403`/`404`) and leaks no data.
2. **Given** Customer A and Customer B, **When** Customer A requests Customer B's booking or ticket, **Then** access is denied.

### Edge Cases
- Password recovery, mandatory email verification, and session expiration policy: [NEEDS CLARIFICATION: OPEN-08 — Is email verification mandatory before holding/buying, and what password-recovery/OTP mechanism is required?].

## Requirements *(mandatory)*

### Functional Requirements
- **FR-01** *(P0)*: System MUST support email + password registration, secure authentication, and logout (`P-04`).
- **FR-02** *(P0)*: System MUST enforce role-based and operator-scoped (`operator_membership`) permissions across all 5 roles on every backend request.
- **FR-15** *(P0)*: System MUST enforce strict data-ownership checks when viewing booking history and tickets (`P-08`, `S-01`).

### Key Entities
- **User**: Email (unique), password credential, active status, verification timestamp.
- **Operator & OperatorMembership**: Links users to an operator with scoped role and status.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of unauthenticated hold/booking attempts are rejected.
- **SC-002**: 100% of cross-tenant and cross-customer data access attempts are blocked (`C-02`).

## Assumptions
- UI follows Vé Xuyên Việt desktop-first white & green palette (`P-04` login/register screen).
