# Feature Specification: F08 — Content, Staff & Admin

**Feature Branch**: `009-f08-content-staff-admin`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-13, FR-16, FR-20, FR-21`) & SRS v0.3 (`P-10, S-01, A-01, A-02, A-04, WF-06`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Platform Staff Support & Admin Governance Dashboard (Priority: P0/P1)
Platform staff look up bookings, tickets, and payment statuses to assist customers (`S-01`). Platform admins monitor system KPIs (`A-01`, `WF-06`), approve or suspend operators (`A-02`), review `audit_logs`, and manage notifications (`FR-20`).

**Acceptance Scenarios**:
1. **Given** an admin approves or suspends an operator or resolves an `EXCEPTION`, **When** the action completes, **Then** an immutable `audit_logs` record is created.

### User Story 2 - Travel News, Destinations & CMS (Priority: P1/P2)
Admins manage travel articles, destination guides, operator news, and promotions in the CMS (`A-04`) for display on the public website (`P-10`), plus promotions and customer reviews (`FR-21`, P2).

**Acceptance Scenarios**:
1. **Given** an article in `DRAFT` status, **When** a visitor queries public posts, **Then** only `PUBLISHED` articles are returned.

### Edge Cases
- Trip cancellation/schedule change notifications (`OPEN-10`) and traffic sizing (`OPEN-09`) remain pending confirmation before production sizing.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-13** *(P0)*: System MUST provide Staff (`S-01`) and Admin (`A-01`, `A-02`, `WF-06`) dashboards scoped by role permissions.
- **FR-16** *(P1)*: System MUST provide a CMS (`A-04`) for travel news, destination guides, operator news, and promotions (`P-10`).
- **FR-20** *(P1)*: System MUST provide operational reports, `audit_logs` for sensitive actions, and customer/operator notifications.
- **FR-21** *(P2)*: System MUST support promotions and customer reviews in a later phase.

### Key Entities
- **Post & Destination**: CMS articles (draft/published), slugs, and linked destinations/routes.
- **AuditLog & OutboxEvent**: Immutable audit trail of sensitive actions and reliable event/notification outbox.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of sensitive admin/staff actions generate an `audit_logs` entry.
- **SC-002**: Zero `DRAFT` CMS articles exposed on public endpoints.
