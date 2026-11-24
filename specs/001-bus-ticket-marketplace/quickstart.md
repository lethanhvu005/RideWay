# Quickstart & Validation Guide: Vé Xuyên Việt

## 1. Prerequisites
- Python 3.14+ (`venv/` activated) with Django, DRF, `psycopg`
- PostgreSQL 16+ with `btree_gist` capability
- Node.js 20+ for `frontend/` (React 19 + TypeScript + Vite)

## 2. Database & Backend Setup
1. Configure `DATABASES['default']` in `backend/backend/settings.py` to point to PostgreSQL (`TIME_ZONE = 'UTC'`).
2. Register `accounts` and `booking_core` in `INSTALLED_APPS` and set `AUTH_USER_MODEL = "accounts.User"` **before** running the initial migration.
3. Ensure `0001_enable_btree_gist` (`BtreeGistExtension()`) runs prior to `inventory_allocations` constraint creation:
   ```powershell
   .\venv\Scripts\python.exe backend\manage.py makemigrations
   .\venv\Scripts\python.exe backend\manage.py migrate
   ```

## 3. Frontend Setup & Checks
```powershell
cd frontend
npm run lint
npm run build
```

## 4. Mandatory Acceptance & Concurrency Verification (`T01`–`T12` / `C-01`–`C-08`)
Run automated integration tests against **real PostgreSQL** (never SQLite) to verify:
- **T01 / C-03**: Concurrent `POST /holds` on same `trip_unit` + overlapping segment → 1 succeeds (`201`), 1 fails (`409`).
- **T02**: Adjacent segments `A→B` and `B→C` on same `trip_unit` → both succeed.
- **T03 / C-04**: Multi-unit hold (3 units, 1 conflicting) → full atomic rollback (0 units held).
- **T04 / C-04**: Expired 10-minute hold reclaimed in-transaction before new hold succeeds.
- **T05 / C-05**: 3 duplicate VNPay IPN webhooks → 1 `PaymentTransaction`, 1 `Ticket` per `BookingItem`.
- **T06 / C-06**: Late VNPay confirmation after hold expiry → `Booking`/`Payment` marked `EXCEPTION`, 0 tickets issued.
- **T07 / C-02**: Operator A accessing Operator B's trip/booking → `403`/`404`, zero data leaked.
- **T08–T12**: Capacity rejection (`3 adults` in double cabin), `422` when child surcharge unconfigured, unapproved custom pickup fee not added, settlement approval blocked without commission %, manual review when refund policy missing.
