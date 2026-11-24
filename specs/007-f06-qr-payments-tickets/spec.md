# Feature Specification: F06 — QR Payments & Tickets

**Feature Branch**: `007-f06-qr-payments-tickets`
**Created**: 2026-11-24
**Status**: Draft
**Input**: SRS v0.4 (`FR-11, FR-12, FR-14, FR-15`) & SRS v0.3 (`P-06, P-07, P-08, A-03, WF-04`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 100% QR Payment, Idempotent Webhook & Automatic E-Ticket Issuance (Priority: P0)
While the 10-minute hold is active, the customer generates a 100% QR payment (`P-06`, `WF-04`). Upon verified provider confirmation, Backend locks the booking, confirms inventory, and issues exactly one e-ticket per `BookingItem` (`P-07`, `P-08`).

**Independent Test**: Run `T05` (3 duplicate webhooks -> 1 payment & 1 ticket per item) and `T06` (late payment after hold expiration -> `EXCEPTION`, no ticket).

**Acceptance Scenarios**:
1. **Given** an active hold with a 100% QR payment intent, **When** the provider sends the same valid confirmation webhook 3 times, **Then** only one payment transaction is recorded and one e-ticket per `BookingItem` is issued (`T05`, `C-05`).
2. **Given** a booking whose hold expired before confirmation arrived, **When** a late payment confirmation arrives, **Then** the booking transitions to `EXCEPTION`, no e-tickets are issued, and it appears in Admin/Staff exception queues (`A-03`, `T06`, `C-06`).

### Edge Cases
- QR provider selection and hold cutoff window: [NEEDS CLARIFICATION: OPEN-03, OPEN-04 — Select QR payment provider/webhook mechanism and cutoff rule when payment is initiated near the end of the 10-minute hold].

## Requirements *(mandatory)*

### Functional Requirements
- **FR-11** *(P0)*: System MUST create 100% upfront QR payment intents and verify provider signatures/transaction status (`P-06`).
- **FR-12** *(P0)*: System MUST automatically issue one e-ticket per `BookingItem` when payment and hold are valid, preventing duplicate issuance (`P-07`).
- **FR-14** *(P0)*: System MUST route late or ambiguous payments to `EXCEPTION` without auto-confirming tickets (`A-03`, `C-06`).
- **FR-15** *(P0)*: Customers MUST be able to view their e-tickets and payment status (`P-08`), enforced by ownership checks (`C-02`).

### Key Entities
- **PaymentIntent & PaymentTransaction**: 100% payment requests and idempotent provider events (`provider`, `provider_event_id`).
- **Ticket**: Issued e-ticket (1 per `BookingItem`, hashed QR token, status `ISSUED`/`USED`/`CANCELLED`).

## Success Criteria *(mandatory)*
- **SC-001**: 100% of duplicate webhooks produce at most one payment transaction and one e-ticket per booked unit (`C-05`).
- **SC-002**: 100% of late payments after hold loss enter `EXCEPTION` with zero unauthorized tickets (`C-06`).
