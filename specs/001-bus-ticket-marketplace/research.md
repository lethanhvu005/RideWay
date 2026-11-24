# Phase 0 Research: Vé Xuyên Việt (RideWay)

## 1. Authentication & SPA Session Architecture (`ĐỀ XUẤT` pending security sign-off)
- **Decision**: Same-domain Django Session Cookie (`HttpOnly`, `Secure` in prod, `SameSite=Lax`) + `X-CSRFToken` via `GET /auth/csrf`, matching `contracts/openapi.yaml`.
- **Rationale**: Simplifies browser security without exposing JWTs in `localStorage`, natively integrates with Django's `AuthenticationMiddleware` and `CsrfViewMiddleware`, and supports immediate session revocation.
- **Alternatives Considered**: JWT Bearer tokens (higher token-revocation complexity for 10-minute holds and multi-portal RBAC).

## 2. Segment-Based Inventory & Concurrency Control (`ĐÃ CHỐT`)
- **Decision**: Represent route segments as PostgreSQL `int4range` `[from_sequence, to_sequence)` in `inventory_allocations.section` with `EXCLUDE USING gist (trip_unit_id WITH =, section WITH &&) WHERE (status IN ('HELD', 'CONFIRMED', 'BLOCKED'))`.
- **Rationale**: Enforces zero overlapping double-bookings at the database engine level while allowing adjacent segments (`[0,1)` and `[1,2)`) on the same `trip_unit`.
- **Critical Constraint**: `NOW()` MUST NOT appear in the partial exclusion predicate. Before evaluating new holds, the hold service MUST run inside `transaction.atomic()` to transition expired `HELD` rows (`hold_expires_at <= now()`) to `EXPIRED`, supplemented by a periodic Celery sweep.

## 3. VNPay QR Payment Adapter & Idempotency (`ĐÃ CHỐT` VNPay QR)
- **Decision**: Implement a `VNPayPaymentAdapter` behind a payment service interface. Verify VNPay HMAC-SHA512 checksum on IPN/return callbacks, cross-check via VNPay `querydr` when needed, and enforce idempotency using unique `(provider, provider_event_id)` on `payment_transactions`.
- **Rationale**: Prevents duplicate ticket issuance on repeated IPN retries (`T05`/`C-05`) and isolates provider-specific logic.
- **Late Payment Handling**: If VNPay confirms payment after `hold_expires_at` has passed or inventory was lost, transition booking/payment to `EXCEPTION` (`T06`/`C-06`) for Staff/Admin resolution; never auto-issue tickets.

## 4. Handling `CHỜ CHỐT` Numeric Business Parameters
- **Decision**: Store platform-wide child age threshold, platform-wide fixed child surcharge (`OPEN-01/02`), VNPay pre-expiry cutoff seconds (`OPEN-04`), `policy_versions.rules_json` (`OPEN-05`), `commission_agreements.percentage` (`OPEN-06`), and operator pickup zone surcharges (`OPEN-07`) as explicit database configuration records.
- **Fail-Safe Behavior**: If a required numeric configuration is missing/unapproved, Backend returns `422` (for child/custom-pickup quoting) or holds requests in `PENDING`/`DRAFT` (for refunds/settlements) per Constitution Principle VII.

## 5. Development Order (Dependency Sequence)
1. **Phase A (Foundation & Auth)**: PostgreSQL + `btree_gist`, `accounts.User`, RBAC + `OperatorMembership`, session/CSRF (`F01`).
2. **Phase B (Supply & Catalog)**: Operators, Vehicles, 2-deck Layouts, Routes, Trips, Segment Fares, Pickup Zones (`F02`, `F03`).
3. **Phase C (Customer Search & Atomic Holds)**: Search/Lowest-Price Sort, 2-deck Unit Availability, Atomic 10-min Holds + Passenger Assignment + Snapshots (`F04`, `F05`).
4. **Phase D (Payments, Tickets & Governance)**: VNPay QR, Idempotent IPN, E-Tickets, `EXCEPTION` queue, Policies/Refunds, Settlements, CMS & Audit Logs (`F06`, `F07`, `F08`).
5. **Phase E (Frontend ReactJS)**: White/green desktop-first UI across all 19 screens (`P-01`..`P-10`, `O-01`..`O-04`, `S-01`, `A-01`..`A-04`).
