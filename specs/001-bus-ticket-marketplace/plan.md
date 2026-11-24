# Implementation Plan: Vé Xuyên Việt Multi-Operator Bus Ticket Marketplace

**Branch**: `001-bus-ticket-marketplace` | **Date**: 2026-11-24 | **Spec**: [spec.md](file:///c:/ProjectCV/RideWay/specs/001-bus-ticket-marketplace/spec.md)

**Input**: Feature specification from `specs/001-bus-ticket-marketplace/spec.md`, Constitution `v2.2.0`, and SRS v0.4 reference artifacts (`ERD_full.mmd`, `data_dictionary.json`, `openapi.yaml`, `django_reference/`).

## Summary

Vé Xuyên Việt is a multi-operator long-distance bus ticket marketplace supporting segment-based booking (`[from_sequence, to_sequence)`), multi-unit 10-minute atomic holds, 100% upfront VNPay QR payment with idempotent webhook verification, automatic e-ticket issuance, and four role-scoped portals (Customer, Operator, Platform Staff, Platform Admin). The implementation uses a **Modular Monolith** with **Django + Django REST Framework** and **PostgreSQL** (`btree_gist` exclusion constraints) on the backend, and a desktop-first **ReactJS + TypeScript + Vite** SPA (white & green palette) on the frontend.

## Technical Context

**Language/Version**: Python 3.14.3 (Backend), TypeScript 7.x / React 19.3.1 (Frontend)
**Primary Dependencies**: Django 6.1.3 + Django REST Framework (`ĐỀ XUẤT` DRF), `psycopg`, `drf-spectacular` (`ĐỀ XUẤT`), Redis + Celery (`ĐỀ XUẤT` for async hold sweep/notifications; NOT inventory source of truth), Vite 8.3.6
**Storage**: PostgreSQL (`ĐÃ CHỐT`) with `btree_gist` extension (`int4range` + `ExclusionConstraint`); UTC timestamps in DB, `Asia/Ho_Chi_Minh` display; `NUMERIC`/`Decimal` in VND
**Testing**: Django `TestCase`/`TransactionTestCase` or `pytest-django` against **real PostgreSQL** (mandatory for `GiST` exclusion & concurrency tests `T01`–`T12` / `C-01`–`C-08`); `oxlint` + `tsc -b` for Frontend
**Target Platform**: Linux/Docker + Nginx + HTTPS/TLS (`ĐỀ XUẤT` deployment); Desktop-first responsive web browsers
**Project Type**: Web application (`backend/` + `frontend/` Modular Monolith)
**Performance Goals**: `CHỜ CHỐT` (`OPEN-09`: 1,000 visits unit & peak concurrency not yet finalized; no unverified SLA claims permitted per Constitution VI/VII)
**Constraints**: Backend-enforced RBAC & `operator_id` tenant isolation; atomic all-or-nothing 10-minute holds (`NOW()` forbidden in partial constraint predicate); 100% VNPay QR verification + idempotent webhooks; no guessed defaults for `OPEN-01`..`OPEN-10` numeric configs
**Scale/Scope**: Reference scale 50 operators, 50 routes; 34 tables (296 fields); 24 API paths / 26 operations; 19 UI screens across 8 feature domains (`F01`–`F08`)

## Constitution Check

*GATE: Passed pre-research and post-design against Constitution v2.2.0.*

- **Principle I (Source of Truth & Traceability)**: All endpoints, models, and tasks trace to `FR-01`..`FR-21`, `BR-01`..`BR-12`, and `contracts/openapi.yaml` (`C-01`).
- **Principle II (Tech & Architecture)**: Confirmed stack (Django, ReactJS, PostgreSQL) respected; proposed choices (DRF, Modular Monolith, Redis/Celery, session cookie + CSRF, Docker/Nginx) explicitly tagged `ĐỀ XUẤT`. Zero pricing/inventory/permission logic in React.
- **Principle III (Transaction Safety & Data Consistency)**: PostgreSQL `EXCLUDE USING gist` on `(trip_unit_id WITH =, section WITH &&) WHERE (status IN ('HELD', 'CONFIRMED', 'BLOCKED'))`; atomic all-or-nothing holds; expired `HELD -> EXPIRED` sweep inside transaction; VNPay QR 100% verification + idempotency; late payments routed to `EXCEPTION`.
- **Principle IV (Authorization & Data Protection)**: Email/password auth before hold/order; backend `operator_id` filtering & IDOR checks on every endpoint (`C-02`); `audit_logs` on sensitive actions; no provider secrets on frontend.
- **Principle V (Design & Usability)**: Vé Xuyên Việt desktop-first white & green (`#FFFFFF`, `#166534`, `#16A34A`, `#F0FDF4`); loading/error/empty states & non-color status indicators (`C-07`); MONA Tour layout rhythm without copying proprietary assets.
- **Principle VI (Quality, Testing & Ops)**: Real PostgreSQL tests planned for `C-03`..`C-06` (`T01`–`T12`); `C-08` requires code + test + review + run evidence.
- **Principle VII (Pending Decisions & Prohibitions)**: `OPEN-01`..`OPEN-10` numeric values remain `CHỜ CHỐT` (configured dynamically by Admin, fail-safe `422`/manual hold if missing); no v0.3 blue, no deposit/COD, no assumed 1,000 visits/day.
- **Principle VIII (Workflow)**: Spec-Kit sequence followed; `django_reference/` treated strictly as blueprint, not production code.

## Project Structure

### Documentation (this feature)

```text
specs/001-bus-ticket-marketplace/
├── spec.md                              # Clarified master specification
├── plan.md                              # This file
├── research.md                          # Phase 0 architectural & integration decisions
├── data-model.md                        # 34-table PostgreSQL & state machine model
├── quickstart.md                        # PostgreSQL & test validation guide
├── checklists/
│   └── requirements.md                  # Spec quality checklist (16/16)
└── contracts/
    ├── openapi.yaml                     # OpenAPI 3.0.3 (24 paths, 26 operations)
    └── inventory_constraint_example.sql # Reference GiST exclusion SQL
```

### Source Code (repository root)

```text
backend/
├── manage.py
├── backend/                             # Project settings, root URLs, WSGI/ASGI
├── accounts/                            # F01: Custom User, auth, session/CSRF, verification
└── booking_core/                        # F02–F08: Modular domain services, models, migrations
    ├── models/                          # Split or modularized 33 domain models
    ├── migrations/                      # 0001_enable_btree_gist + schema migrations
    ├── permissions.py                   # Role + operator_id tenant-scoped permissions
    ├── services/                        # Atomic holds, pricing, VNPay, tickets, settlement
    ├── api/                             # DRF views, serializers, routers (/api/v1/...)
    └── tests/                           # Real-PostgreSQL integration & concurrency tests (T01–T12)

frontend/
├── index.html
├── package.json
└── src/
    ├── api/                             # Typed API client + CSRF handling
    ├── components/                      # SeatLayout2Deck, HoldTimer, StatusBadge, filters
    ├── pages/
    │   ├── public/                      # P-01..P-10 (Search, Trip, Checkout, QR, Tickets, CMS)
    │   ├── operator/                    # O-01..O-04 (Fleet, Layouts, Routes/Trips, Bookings)
    │   ├── staff/                       # S-01 (Support lookup & exceptions)
    │   └── admin/                       # A-01..A-04 (Operators, Settlements, CMS, Audit)
    └── styles/                          # White & green theme tokens
```

**Structure Decision**: Web application split into `backend/` (Django Modular Monolith) and `frontend/` (ReactJS + TypeScript + Vite SPA), matching the existing repository directories.

## Complexity Tracking

No unjustified Constitution violations. All proposed technical choices (`DRF`, `Redis + Celery`, `sessionCookie + CSRF`) are isolated behind clean Django boundaries so they can be swapped if architectural sign-off changes.
