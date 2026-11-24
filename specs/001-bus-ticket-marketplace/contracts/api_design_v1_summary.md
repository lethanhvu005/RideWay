# Thiết kế API theo từng App & Bảng Database (Modular Monolith — 8 Django Apps / 34 Bảng / 78 Thao tác)

**Cấu trúc Backend**: `backend/` được chia thành **8 Django Apps độc lập theo miền nghiệp vụ** + module dùng chung [`common/`](file:///c:/ProjectCV/RideWay/backend/common/__init__.py) (chuẩn hóa lỗi `{"detail", "code", "request_id"}` và phân quyền đa hãng có hỗ trợ `X-Operator-Id`).

---

## 1. App `accounts` — Tài khoản, Xác thực & Phân quyền Hãng (3 bảng / 16 thao tác)
- **Models**: [`backend/accounts/models.py`](file:///c:/ProjectCV/RideWay/backend/accounts/models.py)
  - `users` (`User`), `operators` (`Operator`), `operator_memberships` (`OperatorMembership` — `uq_operator_user`)
- **APIs**: [`backend/accounts/views.py`](file:///c:/ProjectCV/RideWay/backend/accounts/views.py) • [`backend/accounts/urls.py`](file:///c:/ProjectCV/RideWay/backend/accounts/urls.py)
  - `GET /api/v1/auth/csrf` → cấp CSRF token cho SPA
  - `POST /api/v1/auth/register` → đăng ký `users` + tạo session
  - `POST /api/v1/auth/login` → đăng nhập `users`
  - `POST /api/v1/auth/logout` → xóa session
  - `POST /api/v1/auth/password-reset/request` & `POST /api/v1/auth/password-reset/confirm` → đặt lại mật khẩu
  - `POST /api/v1/auth/email-verification/request` & `POST /api/v1/auth/email-verification/confirm` → xác minh `users.email_verified_at`
  - `GET /api/v1/me` & `PATCH /api/v1/me/profile` → hồ sơ cá nhân + danh sách `operator_memberships`
  - `GET /api/v1/me/operators` → liệt kê các hãng mà tài khoản có membership hoạt động
  - `GET/POST /api/v1/admin/operators` → Admin xem/tạo `operators` (`DRAFT`) + ghi `audit_logs`
  - `PATCH /api/v1/admin/operators/{operator_id}/status` → duyệt `ACTIVE` / khóa `SUSPENDED`
  - `POST /api/v1/admin/operators/{operator_id}/memberships` → gán `OWNER`/`MANAGER`/`STAFF` vào `operator_memberships`

---

## 2. App `fleet` — Phương tiện & Sơ đồ chỗ 2 tầng (4 bảng / 8 thao tác)
- **Models**: [`backend/fleet/models.py`](file:///c:/ProjectCV/RideWay/backend/fleet/models.py)
  - `vehicle_types` (`VehicleType`), `seat_layouts` (`SeatLayout` — `ck_layout_deck_count`), `layout_units` (`LayoutUnit` — `uq_layout_unit_code`), `vehicles` (`Vehicle` — `uq_registration_operator`)
- **APIs**: [`backend/fleet/views.py`](file:///c:/ProjectCV/RideWay/backend/fleet/views.py) • [`backend/fleet/urls.py`](file:///c:/ProjectCV/RideWay/backend/fleet/urls.py)
  - `GET /api/v1/vehicle-types` & `POST /api/v1/admin/vehicle-types` → danh mục `vehicle_types`
  - `GET/POST /api/v1/operators/me/vehicles` → quản lý `vehicles` (bắt buộc `layout.operator_id == vehicle.operator_id`)
  - `GET/POST /api/v1/operators/me/layouts` → quản lý `seat_layouts` (1–2 tầng)
  - `GET/POST /api/v1/operators/me/layouts/{layout_id}/units` → quản lý `layout_units` (`CABIN`/`BED`/`SEAT`, `max_adults`, `max_children`)

---

## 3. App `catalog` — Địa điểm, Tuyến, Chuyến, Giá chặng & Điểm đón/trả (8 bảng / 17 thao tác)
- **Models**: [`backend/catalog/models.py`](file:///c:/ProjectCV/RideWay/backend/catalog/models.py)
  - `locations` (`Location`), `routes` (`Route`), `route_stops` (`RouteStop`), `trips` (`Trip`), `trip_stops` (`TripStop`), `trip_units` (`TripUnit`), `trip_fares` (`TripFare` — `uq_trip_segment_unit_fare`), `pickup_options` (`PickupOption`)
- **APIs**: [`backend/catalog/views.py`](file:///c:/ProjectCV/RideWay/backend/catalog/views.py) • [`backend/catalog/urls.py`](file:///c:/ProjectCV/RideWay/backend/catalog/urls.py)
  - `GET /api/v1/locations` & `POST /api/v1/admin/locations` → danh mục `locations`
  - `GET /api/v1/trips` → tìm chuyến mở bán, lọc theo chặng/ngày/hãng, sắp xếp giá thấp nhất (`min_price`)
  - `GET /api/v1/trips/{trip_id}/units` → trạng thái tồn chỗ thực tế của `trip_units` trên đoạn `[from_sequence, to_sequence)`
  - `GET/POST /api/v1/operators/me/routes` & `GET/POST /api/v1/operators/me/routes/{route_id}/stops` → quản lý `routes` & `route_stops`
  - `GET/POST /api/v1/operators/me/trips` → tạo `trips` (`DRAFT`), kiểm tra `route.operator == vehicle.operator` (`API-15`) và snapshot `trip_stops` + `trip_units`
  - `GET/POST /api/v1/operators/me/trips/{trip_id}/fares` → cấu hình `trip_fares` (chặn trùng giá `API-16`)
  - `PATCH /api/v1/operators/me/trips/{trip_id}/status` → mở bán `OPEN` khi đủ stops/units/fares và hãng `ACTIVE`
  - `GET/POST /api/v1/operators/me/pickup-options` → cấu hình `pickup_options` (`FIXED`/`ZONE`)
  - `GET /api/v1/admin/trips` → Admin giám sát toàn bộ `trips`

---

## 4. App `inventory` — Tồn chỗ theo chặng `int4range` & GiST Exclusion (1 bảng)
- **Models & Migration**: [`backend/inventory/models.py`](file:///c:/ProjectCV/RideWay/backend/inventory/models.py) • [`0001_enable_btree_gist.py`](file:///c:/ProjectCV/RideWay/backend/inventory/migrations/0001_enable_btree_gist.py)
  - `inventory_allocations` (`InventoryAllocation`): `EXCLUDE USING gist (trip_unit_id WITH =, section WITH &&) WHERE (status IN ('HELD', 'CONFIRMED', 'BLOCKED'))` + `ix_hold_expiry`
- **Service**: [`backend/inventory/services.py`](file:///c:/ProjectCV/RideWay/backend/inventory/services.py) (`reclaim_expired_holds` thu hồi `HELD -> EXPIRED` trong transaction trước khi giữ chỗ mới).

---

## 5. App `bookings` — Giữ chỗ 10 phút, Đơn vé, Hành khách & Đón/trả (5 bảng / 8 thao tác)
- **Models**: [`backend/bookings/models.py`](file:///c:/ProjectCV/RideWay/backend/bookings/models.py)
  - `bookings` (`Booking`), `booking_items` (`BookingItem`), `booking_passengers` (`BookingPassenger`), `booking_item_passengers` (`BookingItemPassenger`), `pickup_requests` (`PickupRequest`)
- **Services & APIs**: [`backend/bookings/services.py`](file:///c:/ProjectCV/RideWay/backend/bookings/services.py) • [`backend/bookings/views.py`](file:///c:/ProjectCV/RideWay/backend/bookings/views.py) • [`backend/bookings/urls.py`](file:///c:/ProjectCV/RideWay/backend/bookings/urls.py)
  - `POST /api/v1/holds` → giữ nguyên tử 1–20 chỗ trong 10 phút (`Idempotency-Key` bắt buộc, khóa `TripUnit` theo thứ tự cố định chống deadlock, chặn `422` nếu có trẻ em nhưng chưa cấu hình phụ phí `API-06`)
  - `PUT /api/v1/bookings/{booking_id}/passengers` → gán hành khách vào từng `booking_items` đúng sức chứa (`API-05`), tạo `pickup_requests` (`FIXED` hoặc `CUSTOM`)
  - `POST /api/v1/bookings/{booking_id}/accept-quote` → khách xác nhận tổng tiền sau khi hãng báo giá đón/trả riêng (`API-13`)
  - `GET /api/v1/bookings/{booking_id}` & `GET /api/v1/me/bookings` → tra cứu đơn chính chủ
  - `GET /api/v1/operators/me/booking-items` → danh sách chỗ đã bán của hãng
  - `GET /api/v1/operators/me/pickup-requests` & `PATCH /api/v1/operators/me/pickup-requests/{pickup_id}/quote` → hãng báo giá phụ phí đón/trả địa chỉ riêng

---

## 6. App `payments` — Thanh toán VNPay QR, Webhook Idempotent & Vé điện tử (3 bảng / 6 thao tác)
- **Models**: [`backend/payments/models.py`](file:///c:/ProjectCV/RideWay/backend/payments/models.py)
  - `payment_intents` (`PaymentIntent`), `payment_transactions` (`PaymentTransaction` — `uq_payment_provider_event`), `tickets` (`Ticket` — 1-1 `booking_item`, `qr_token_hash`)
- **Services & APIs**: [`backend/payments/services.py`](file:///c:/ProjectCV/RideWay/backend/payments/services.py) • [`backend/payments/views.py`](file:///c:/ProjectCV/RideWay/backend/payments/views.py) • [`backend/payments/urls.py`](file:///c:/ProjectCV/RideWay/backend/payments/urls.py)
  - `POST /api/v1/bookings/{booking_id}/payment-intents` → tạo yêu cầu thanh toán VNPay QR 100% (chặn nếu `pickup_requests` chưa báo giá/chưa `accept-quote` `API-12`/`API-13` hoặc vi phạm cutoff `OPEN-04`)
  - `GET /api/v1/bookings/{booking_id}/payment-status` → trạng thái thanh toán đã được Backend xác minh
  - `GET/POST /api/v1/webhooks/payments/{provider}` → nhận IPN VNPay, kiểm tra chữ ký HMAC-SHA512 + `vnp_Amount` (`API-07`), chống xử lý lặp (`API-08`), phát hành 1 `Ticket`/`BookingItem` hoặc chuyển `EXCEPTION` nếu hết hạn hold (`API-09`)
  - `GET /api/v1/me/tickets` → danh sách vé điện tử của khách
  - `POST /api/v1/operators/me/check-in` → nhân viên hãng quét `qr_token` chuyển vé `ISSUED -> USED` đúng 1 lần

---

## 7. App `finance` — Chính sách, Hủy/Đổi, Hoàn tiền & Đối soát Hoa hồng (6 bảng / 13 thao tác)
- **Models**: [`backend/finance/models.py`](file:///c:/ProjectCV/RideWay/backend/finance/models.py)
  - `policy_versions` (`PolicyVersion`), `cancellation_requests` (`CancellationRequest`), `refunds` (`Refund`), `commission_agreements` (`CommissionAgreement`), `settlements` (`Settlement`), `settlement_lines` (`SettlementLine`)
- **Services & APIs**: [`backend/finance/services.py`](file:///c:/ProjectCV/RideWay/backend/finance/services.py) • [`backend/finance/views.py`](file:///c:/ProjectCV/RideWay/backend/finance/views.py) • [`backend/finance/urls.py`](file:///c:/ProjectCV/RideWay/backend/finance/urls.py)
  - `POST /api/v1/bookings/{booking_id}/cancellation-requests` → gửi yêu cầu hủy/đổi kèm snapshot chính sách (`T12`)
  - `GET /api/v1/operators/me/settlements` & `GET/POST /api/v1/operators/me/policies` → đối soát & dự thảo chính sách hãng
  - `GET /api/v1/admin/settlements` & `POST /api/v1/admin/settlements/{settlement_id}/approve` → duyệt đối soát (chặn `422` nếu thiếu `%` hoa hồng `T11`)
  - `GET/POST /api/v1/admin/policies` & `GET/POST /api/v1/admin/commission-agreements` → quản trị phiên bản chính sách và hợp đồng hoa hồng
  - `GET /api/v1/admin/cancellation-requests` & `POST /api/v1/admin/cancellation-requests/{request_id}/decision` → duyệt/từ chối yêu cầu hủy/đổi
  - `GET /api/v1/admin/refunds` & `POST /api/v1/admin/refunds/{refund_id}/execute` → danh sách hoàn tiền (thao tác chuyển tiền thật giữ trạng thái `422 POLICY_BLOCKED` cho tới khi chốt `OPEN-03/05`)

---

## 8. App `content` — Điểm đến, Tin tức CMS, Audit Log, Báo cáo & Health Check (4 bảng / 10 thao tác)
- **Models**: [`backend/content/models.py`](file:///c:/ProjectCV/RideWay/backend/content/models.py)
  - `destinations` (`Destination`), `posts` (`Post`), `audit_logs` (`AuditLog`), `outbox_events` (`OutboxEvent`)
- **APIs**: [`backend/content/views.py`](file:///c:/ProjectCV/RideWay/backend/content/views.py) • [`backend/content/urls.py`](file:///c:/ProjectCV/RideWay/backend/content/urls.py)
  - `GET /api/v1/destinations`, `GET /api/v1/posts`, `GET /api/v1/posts/{slug}` → chỉ trả bài viết/điểm đến đã xuất bản
  - `POST /api/v1/admin/destinations`, `GET/POST /api/v1/admin/posts`, `PATCH /api/v1/admin/posts/{post_id}` → quản trị CMS
  - `GET /api/v1/admin/audit-logs` & `GET /api/v1/admin/reports/summary` → nhật ký bảo mật và tổng hợp KPI hệ thống
  - `GET /api/v1/health/live` & `GET /api/v1/health/ready` → kiểm tra trạng thái sống và kết nối PostgreSQL
