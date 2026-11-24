---
description: "Task list for Vé Xuyên Việt Multi-Operator Bus Ticket Marketplace"
---

# Tasks: Vé Xuyên Việt Multi-Operator Bus Ticket Marketplace

**Input**: Design documents from `specs/001-bus-ticket-marketplace/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`).

**Organization**: Tasks follow dependency order across Setup, Foundational, User Stories (`US1`–`US5`), and Polish, preserving traceability to `TASK-001`..`TASK-050`, `FR-01`..`FR-21`, `T01`–`T12`, and `OPEN-01`..`OPEN-10` (`BLOCKED` where numeric business parameters are not yet finalized).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`US1`–`US5`)
- **`[BLOCKED: OPEN-xx]`**: Requires business parameter approval before automated financial/quoting execution

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize PostgreSQL, Django apps, and ReactJS white/green theme foundation (`TASK-045`).

- [X] T001 Configure PostgreSQL database settings (`TIME_ZONE = 'UTC'`), `AUTH_USER_MODEL = "accounts.User"`, and `INSTALLED_APPS` (`accounts`, `booking_core`, `rest_framework`) in `backend/backend/settings.py` (`TASK-001`, `TASK-045`)
- [X] T002 Create `backend/accounts/` and `backend/booking_core/` modular monolith app skeletons (`models/`, `services/`, `api/`, `migrations/`, `tests/`) per `plan.md`
- [X] T003 [P] Create `0001_enable_btree_gist.py` migration with `BtreeGistExtension()` in `backend/booking_core/migrations/0001_enable_btree_gist.py` (`TASK-020`)
- [X] T004 [P] Configure Vé Xuyên Việt desktop-first white & green theme tokens (`#FFFFFF`, `#166534`, `#16A34A`, `#F0FDF4`) and API client with CSRF support in `frontend/src/styles/theme.css` and `frontend/src/api/client.ts` (`TASK-018`)

---

## Phase 2: Foundational (Auth, Roles & Tenant Isolation — Blocks All Stories)

**Purpose**: Core authentication, RBAC, and `operator_id` isolation (`FR-01`, `FR-02`, `C-02`).

- [X] T005 Implement custom email-unique `User` model (`data-model.md` `User`) in `backend/accounts/models.py` and run initial migrations (`TASK-001`, `FR-01`)
- [X] T006 Implement `Operator` and `OperatorMembership` models (`data-model.md` `Operator`, `OperatorMembership`) in `backend/booking_core/models/tenancy.py` (`TASK-003`, `FR-02`)
- [X] T007 Implement session/CSRF auth endpoints (`GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me`) plus short-lived email verification & password-reset links (`OPEN-08` Option A) in `backend/accounts/views.py` and `backend/accounts/urls.py` (`TASK-002`, `FR-01`)
- [X] T008 Implement backend RBAC & `operator_id` tenant-scoped permission classes in `backend/booking_core/permissions.py` (`TASK-003`, `FR-02`, `C-02`)
- [ ] T009 [P] Build login, registration, password-reset UI (`P-04`) and role-based route guards in `frontend/src/pages/public/AuthPage.tsx` (`TASK-004`, `P-04`)
- [ ] T010 [P] Write real-PostgreSQL RBAC & cross-tenant IDOR isolation tests (`T07`, `C-02`) in `backend/booking_core/tests/test_permissions.py` (`TASK-005`, `T07`)

**Checkpoint**: Authentication, RBAC, and tenant isolation verified — user stories can proceed.

---

## Phase 3: User Story 1 - Search Trips, Select Units by Segment & Atomic 10-Min Holds (Priority: P1 🎯 MVP)

**Goal**: Operators publish fleet/layouts/routes/trips/fares; customers search lowest-price trips, view 2-deck availability by segment, and execute atomic all-or-nothing 10-minute holds.

**Independent Test**: Run `T01`–`T04` on real PostgreSQL (concurrent overlap -> `409`, adjacent `A→B` + `B→C` -> `201`, 3-unit partial conflict -> rollback, expired hold -> reclaimed).

### Tests for US1 (Real PostgreSQL)

- [ ] T011 [P] [US1] Write real-PostgreSQL concurrency & segment-overlap tests (`T01`, `T02`, `T03`, `T04`, `C-03`, `C-04`) in `backend/booking_core/tests/test_holds_concurrency.py` (`TASK-025`)
- [ ] T012 [P] [US1] Write route/trip/fare & cross-operator reference validation tests in `backend/booking_core/tests/test_catalog.py` (`TASK-009`, `TASK-014`)

### Implementation for US1

- [X] T013 [P] [US1] Create `VehicleType`, `Vehicle`, `SeatLayout`, `LayoutUnit` models (`data-model.md` Fleet & Layouts) in `backend/booking_core/models/fleet.py` (`TASK-006`, `FR-03`)
- [X] T014 [P] [US1] Create `Location`, `Route`, `RouteStop`, `Trip`, `TripStop`, `TripUnit`, `TripFare`, `PickupOption` models (`data-model.md` Routes, Trips & Fares) in `backend/booking_core/models/catalog.py` (`TASK-010`, `FR-04`, `FR-05`)
- [X] T015 [US1] Create `InventoryAllocation` model with `section` (`data-model.md` `InventoryAllocation.section` `int4range`) and `ExclusionConstraint` (`EXCLUDE USING gist (trip_unit_id WITH =, section WITH &&) WHERE (status IN ('HELD', 'CONFIRMED', 'BLOCKED'))`) in `backend/booking_core/models/inventory.py` and generate migration (`TASK-020`, `BR-02`)
- [X] T016 [US1] Implement trip creation service snapshotting `TripStop` and `TripUnit` with cross-tenant `operator_id` validation in `backend/booking_core/services/catalog_service.py` (`TASK-011`, `FR-04`, `FR-05`)
- [X] T017 [US1] Implement public search (`GET /trips` sorted by lowest valid segment fare) and unit availability (`GET /trips/{trip_id}/units`) in `backend/booking_core/api/search_views.py` (`TASK-015`, `TASK-016`, `FR-06`, `FR-07`)
- [X] T018 [US1] Implement atomic all-or-nothing `POST /holds` service (10-minute `hold_expires_at` (`data-model.md` `Booking.hold_expires_at`), in-transaction `HELD -> EXPIRED` reclamation, idempotency key) in `backend/booking_core/services/hold_service.py` and `backend/booking_core/api/booking_views.py` (`TASK-021`, `TASK-022`, `FR-08`)
- [X] T019 [P] [US1] Build public home (`P-01`), search results with cheap-ticket filter (`P-02`), and 2-deck unit layout selector (`P-03`) with loading/error/empty states & non-color badges (`C-07`) in `frontend/src/pages/public/HomePage.tsx`, `SearchResultsPage.tsx`, and `TripDetailPage.tsx` (`TASK-017`, `TASK-019`)

**Checkpoint**: US1 delivers end-to-end search, 2-deck layout selection, and conflict-free 10-minute atomic holds.

---

## Phase 4: User Story 2 - Assign Passengers, VNPay QR 100% Payment & E-Tickets (Priority: P1)

**Goal**: Customers assign passengers within unit capacity, select pickup/dropoff, pay 100% via VNPay QR, and receive 1 e-ticket per `BookingItem` with idempotent webhooks and `EXCEPTION` routing.

**Independent Test**: Run `T05`, `T06`, `T08`, `T09`, `T10`, `T11` (client price ignored, 3 duplicate webhooks -> 1 ticket/item, late payment -> `EXCEPTION`).

### Tests for US2

- [ ] T020 [P] [US2] Write capacity, child surcharge `422`, custom pickup `422`, and client-price-ignore tests (`T08`, `T09`, `T10`, `T11`) in `backend/booking_core/tests/test_booking_quote.py` (`TASK-025`)
- [ ] T021 [P] [US2] Write VNPay duplicate IPN webhook (`T05`, `C-05`) and late-payment `EXCEPTION` (`T06`, `C-06`) tests in `backend/booking_core/tests/test_payment_vnpay.py` (`TASK-033`)

### Implementation for US2

- [X] T022 [P] [US2] Create `Booking`, `BookingItem` (`data-model.md` `BookingItem.child_surcharge`), `BookingPassenger`, `BookingItemPassenger`, `PickupRequest` (`data-model.md` `PickupRequest.requested_address`) models in `backend/booking_core/models/booking.py` (`TASK-023`, `FR-09`, `FR-10`, `FR-19`)
- [X] T023 [P] [US2] Create `PaymentIntent`, `PaymentTransaction` (`data-model.md` `PaymentTransaction.provider_event_id` unique), and `Ticket` (`data-model.md` `Ticket.qr_token_hash`) models in `backend/booking_core/models/payment.py` (`TASK-029`, `TASK-030`, `FR-11`, `FR-12`)
- [ ] T024 [US2] **[BLOCKED: OPEN-01, OPEN-02, OPEN-07 numeric config]** Implement `PUT /bookings/{booking_id}/passengers` service: per-unit capacity validation, platform-wide child config lookup (fail `422` if unconfigured), pickup zone surcharge vs out-of-zone `PickupRequest` (`OPEN-07` Option A), and price/policy snapshot in `backend/booking_core/services/booking_service.py` (`TASK-023`, `TASK-026`, `TASK-013`, `FR-09`, `FR-10`, `FR-19`)
- [ ] T025 [US2] **[BLOCKED: OPEN-04 numeric cutoff]** Implement `VNPayPaymentAdapter` (`POST /bookings/{booking_id}/payment-intents`, `GET /bookings/{booking_id}/payment-status`, `POST /webhooks/payments/vnpay`) with signature verification, idempotent transaction recording, atomic `Ticket` issuance (1 per `BookingItem`), and `EXCEPTION` routing on late/ambiguous confirmations in `backend/booking_core/services/payment_service.py` (`TASK-027`..`TASK-031`, `FR-11`, `FR-12`, `FR-14`)
- [ ] T026 [P] [US2] Build checkout stepper with backend-synced `HoldTimer`, passenger assignment form (`P-05`), VNPay QR payment view (`P-06`), and e-ticket confirmation (`P-07`) in `frontend/src/pages/public/CheckoutPage.tsx` and `PaymentQRPage.tsx` (`TASK-024`, `TASK-032`)

**Checkpoint**: US2 completes full VNPay QR checkout and duplicate-safe e-ticket issuance.

---

## Phase 5: User Story 3 - Customer Booking History & E-Ticket Lookup (Priority: P1)

**Goal**: Authenticated customers view their bookings, payment statuses, and e-tickets with strict ownership enforcement (`FR-15`).

**Independent Test**: Customer A views `/me/bookings` and `/me/tickets`; Customer A accessing Customer B's `/bookings/{id}` is rejected.

- [X] T027 [US3] Implement `GET /me/bookings`, `GET /bookings/{booking_id}`, and `GET /me/tickets` with strict `customer_id` ownership checks in `backend/booking_core/api/customer_views.py` (`FR-15`)
- [ ] T028 [P] [US3] Build "My Tickets & Bookings" UI (`P-08`) in `frontend/src/pages/public/MyBookingsPage.tsx` (`TASK-032`, `P-08`)

---

## Phase 6: User Story 4 - Operator Portal (Priority: P1)

**Goal**: Operators manage their own vehicles, 2-deck layouts, routes, trips, fares, and passenger manifests isolated by `operator_id` (`FR-03`..`FR-05`, `FR-13`).

**Independent Test**: Operator A manages fleet/trips/manifests; Operator B receives `403`/`404` on Operator A's IDs (`T07`).

- [X] T029 [US4] Implement operator endpoints (`GET/POST /operators/me/vehicles`, `GET/POST /operators/me/trips`, `GET /operators/me/booking-items`, plus layout/route/fare CRUD) filtered by `operator_id` in `backend/booking_core/api/operator_views.py` (`TASK-007`, `TASK-011`, `FR-03`, `FR-04`, `FR-05`)
- [ ] T030 [P] [US4] Build Operator Dashboard (`O-01`), Fleet & 2-Deck Layout Manager (`O-02`), Route/Trip/Fare Manager (`O-03`), and Booking/Check-in List (`O-04`) in `frontend/src/pages/operator/` (`TASK-008`, `TASK-012`, `TASK-042`)

---

## Phase 7: User Story 5 - Policies, Refunds, Settlements, Content, Staff & Admin (Priority: P2)

**Goal**: Versioned cancellation/refunds, operator commission settlements, CMS, Staff exception handling, and Admin governance (`FR-13`, `FR-16`..`FR-21`).

**Independent Test**: Run `T11` (settlement blocked without commission %), `T12` (refund held when policy missing), draft CMS post hidden from public, audit log created on admin actions.

### Tests for US5

- [ ] T031 [P] [US5] Write `T11` (missing commission %), `T12` (missing refund rule), CMS draft-hiding, and `AuditLog` tests in `backend/booking_core/tests/test_governance.py` (`TASK-039`, `TASK-044`)

### Implementation for US5

- [X] T032 [P] [US5] Create `PolicyVersion` (`data-model.md` `PolicyVersion.rules_json`), `CancellationRequest`, `Refund`, `CommissionAgreement` (`data-model.md` `CommissionAgreement.percentage`), `Settlement`, `SettlementLine` models in `backend/booking_core/models/settlement.py` (`TASK-035`..`TASK-037`, `FR-17`, `FR-18`)
- [X] T033 [P] [US5] Create `Destination`, `Post`, `AuditLog`, `OutboxEvent` models (`data-model.md` Content & Observability) in `backend/booking_core/models/content.py` (`TASK-040`, `FR-16`, `FR-20`)
- [ ] T034 [US5] **[BLOCKED: OPEN-05, OPEN-06 numeric config]** Implement `POST /bookings/{booking_id}/cancellation-requests`, manual refund approval, and periodic `Settlement` calculation (`GET /operators/me/settlements`, `GET /admin/settlements`) blocking final approval if commission/policy is unconfigured in `backend/booking_core/services/settlement_service.py` and `backend/booking_core/api/settlement_views.py` (`TASK-034`..`TASK-037`, `FR-17`, `FR-18`)
- [X] T035 [US5] Implement Staff/Admin endpoints (`GET /admin/operators`, exception resolution, reports, audit logs) and public CMS endpoints (`GET /posts`, `GET /posts/{slug}`) in `backend/booking_core/api/admin_views.py` and `content_views.py` (`TASK-040`, `TASK-043`, `FR-13`, `FR-16`, `FR-20`)
- [ ] T036 [P] [US5] Build Public News/Destinations (`P-09`, `P-10`), Staff Support (`S-01`), and Admin Portals (`A-01`..`A-04`) in `frontend/src/pages/staff/` and `frontend/src/pages/admin/` (`TASK-038`, `TASK-041`, `TASK-042`)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, OpenAPI sync, observability, and full `T01`–`T12` QA (`TASK-045`..`TASK-050`).

- [ ] T037 [P] Sync `drf-spectacular` generated schema with `specs/001-bus-ticket-marketplace/contracts/openapi.yaml` and `data-model.md` (`TASK-049`)
- [ ] T038 [P] Security review: CSRF/CORS, VNPay signature & rate limiting, PII minimization in logs, no secrets in frontend (`TASK-047`)
- [ ] T039 [P] Configure structured logging (`request_id`), `AuditLog` coverage, Celery periodic expired-hold sweep, and PostgreSQL backup/restore check (`TASK-048`)
- [ ] T040 Run full `T01`–`T12` real-PostgreSQL acceptance suite, `frontend` lint/build (`npm run lint && npm run build`), and `quickstart.md` validation (`TASK-046`, `TASK-050`, `C-08`)

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3 (US1 MVP)** → **Phase 4 (US2)** → **Phase 5 (US3)** & **Phase 6 (US4)** (can run in parallel) → **Phase 7 (US5)** → **Phase 8 (Polish)**.
- Tasks marked **`[BLOCKED: OPEN-xx]`** (`T024`, `T025`, `T034`) can have their structural models/endpoints/fail-safe `422` guards built immediately, while automated financial calculation awaits Admin configuration of `OPEN-01..07`.

## Implementation Strategy

- **MVP Scope**: Complete Phases 1–4 (`T001`–`T026`) for end-to-end search, 2-deck selection, 10-minute atomic holds, VNPay QR payment, and automatic e-ticket issuance, verified by `T01`–`T11` on real PostgreSQL.
