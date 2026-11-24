# Data Model & PostgreSQL Design Analysis: Vé Xuyên Việt (34 Tables / 296 Fields)

**Status**: Design Review v1.0 (Aligned with SRS v0.4, Data Dictionary v0.4, and `backend/booking_core/models.py`).
**Rule**: `bookings`, `inventory_allocations`, `payment_transactions`, and `tickets` invariants are binding; `CHỜ CHỐT` items (`DB-01`..`DB-08` / `Q01`..`Q08`) remain nullable or gated until approved.

## 1. Domain Entity Groups (7 Groups, 34 Tables)

| Group | Tables | Core Responsibilities |
|---|---|---|
| **1. Accounts & RBAC** | `users`, `operators`, `operator_memberships` | Email auth (`AUTH_USER_MODEL = "accounts.User"`), operator tenancy scope |
| **2. Fleet & Layouts** | `vehicle_types`, `seat_layouts`, `layout_units`, `vehicles` | Limousine (20–22 cabins), Sleeper (24–34 beds), 1–2 decks, unit capacity |
| **3. Routes, Trips & Fares** | `locations`, `routes`, `route_stops`, `trips`, `trip_stops`, `trip_units`, `trip_fares`, `pickup_options` | Ordered stops, trip unit/stop snapshots, segment fares, fixed/zone pickups |
| **4. Bookings & Inventory** | `bookings`, `booking_items`, `booking_passengers`, `booking_item_passengers`, `inventory_allocations`, `pickup_requests` | Atomic 10-min holds, `int4range` `[from_sequence, to_sequence)`, per-unit passenger assignment |
| **5. Payments, Tickets & Refunds** | `payment_intents`, `payment_transactions`, `tickets`, `cancellation_requests`, `refunds` | 100% QR payment, idempotent webhook `(provider, provider_event_id)`, 1 `Ticket` per `BookingItem` |
| **6. Policies & Settlements** | `policy_versions`, `commission_agreements`, `settlements`, `settlement_lines` | Versioned cancellation/refund rules, % commission contracts, periodic reconciliation |
| **7. Content & Audit** | `destinations`, `posts`, `audit_logs`, `outbox_events` | Travel news/CMS, immutable audit trail, transactional outbox |

## 2. Gap Analysis: Current `models.py` vs. PostgreSQL Design v1.0

| Table / Group | Current State in `models.py` | Required P0/P1 Enhancement | Status |
|---|---|---|---|
| `inventory_allocations` | `ExclusionConstraint` (`trip_unit =`, `section &&`) + `ix_hold_expiry` | Add `CheckConstraint` `section` lower < upper; keep `NOW()` out of partial predicate | `P0` |
| `trip_fares` | `CheckConstraint(to_sequence > from_sequence)` only | Add `CheckConstraint(base_amount > 0)` + `UniqueConstraint(trip, from_sequence, to_sequence, unit_kind)` *(if single active fare per segment)* | `P0` (`DB-04` pending) |
| `trips` ↔ `routes` ↔ `vehicles` | Separate FKs; no DB-level same-operator guard | Enforce `route.operator == vehicle.operator == vehicle.layout.operator` in service + optional DB trigger/composite FK | `P0` |
| `trip_stops` / `trip_units` | Separate FKs to `route_stop` / `layout_unit` | Enforce `route_stop.route == trip.route` and `layout_unit.layout == trip.vehicle.layout` | `P0` |
| `bookings` / `booking_items` | `ck_item_positive_section` only | Add `total_amount >= 0`, `unit_price >= 0`, `child_surcharge >= 0`, `adult_count + child_count >= 1` | `P0` |
| `booking_item_passengers` | `uq_item_passenger` | Enforce `item.booking_id == passenger.booking_id` in service + optional DB trigger | `P0` |
| `pickup_requests` | `fee_snapshot`, `status` | Proposed `quote_revision` & `accepted_at` to freeze custom pickup fees before payment | `P1` (`DB-06` pending) |
| `commission_agreements` | `ck_commission_pct` (`0..100` or `NULL`) | Add `ExclusionConstraint` on `(operator =, daterange(effective_from, effective_to, '[]') &&)` where `approved_at IS NOT NULL` | `P1` |
| `settlement_lines` | `uq_settlement_line` `(settlement, booking_item)` | Prevent settling the same `booking_item` across multiple approved settlements | `P1` |

## 3. Recommended Query Indexes (Verify with `EXPLAIN ANALYZE`)

- `trips`: `(status, departure_at)`, `(route_id)`
- `route_stops`: `(route_id, sequence)` *(already covered by `uq_route_stop_sequence`)*
- `trip_stops`: `(trip_id, sequence)` *(already covered by `uq_trip_stop_sequence`)*
- `trip_fares`: `(trip_id, from_sequence, to_sequence, unit_kind)`
- `inventory_allocations`: GiST (`exclude_active_unit_sections`) + `(status, expires_at)` (`ix_hold_expiry`)
- `bookings`: `(customer_id, -created_at)`, `booking_code` (unique)
- `payment_intents`: `(booking_id, -created_at)`
- `posts`: `(-published_at)`, `slug` (unique)

## 4. Core State Machines

- **Booking**: `HOLDING` → `PENDING_PAYMENT` → `CONFIRMED` → `COMPLETED` (branches: `CANCELLED`, `EXCEPTION`).
- **InventoryAllocation**: `HELD` → `CONFIRMED` | `EXPIRED` | `RELEASED` (admin: `BLOCKED`).
- **PaymentIntent / Transaction**: `CREATED` → `PENDING` → `PAID` | `FAILED` | `EXCEPTION` (refunds: `REFUND_PENDING` → `REFUNDED`).
- **Ticket**: `ISSUED` → `USED` | `CANCELLED`.
- **PickupRequest**: `PENDING` → `ACCEPTED` | `DECLINED`.
- **Settlement**: `DRAFT` → `REVIEW` → `APPROVED` → `PAID`.
