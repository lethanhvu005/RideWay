# 06 — BÁO CÁO KẾT QUẢ KIỂM THỬ THỰC TẾ TRÊN POSTGRESQL 16 (TEST REPORT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Môi trường thực thi:** Windows + Docker PostgreSQL 16 (`rideway-postgres` container, database `test_rideway`, extension `btree_gist`)  
**Lệnh thực thi:**
```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test -v 2
```

---

## 1. KẾT QUẢ DJANGO SYSTEM CHECK & MIGRATION CHECK

- `python manage.py check`: **`System check identified no issues (0 silenced).`**
- Toàn bộ 13 migration files của dự án (bao gồm 3 migration P0 mới: `fleet.0002`, `finance.0002`, `content.0002`) áp dụng sạch 100% trên cả database vận hành `rideway` và database kiểm thử `test_rideway` (PostgreSQL 16, không sử dụng SQLite, không dùng `--fake`).

---

## 2. BẢNG KẾT QUẢ 15 BÀI KIỂM THỬ TỰ ĐỘNG TRÊN POSTGRESQL 16

Tổng thời gian chạy: **`Ran 15 tests in 66.272s — OK`**

| STT | Test Case (`module.Class.method`) | Nhóm kiểm thử | Nội dung kiểm chứng trên PostgreSQL 16 thật | Kết quả |
|---|---|---|---|---|
| 1 | `accounts.tests.AccountsSecurityAndConstraintTests.test_csrf_endpoint_sets_cookie_and_returns_token` | Security & CSRF | Gọi `GET /api/v1/auth/csrf`, xác nhận trả `csrfToken` và trình duyệt được gắn cookie `csrftoken` qua `@ensure_csrf_cookie`. | **PASS (`ok`)** |
| 2 | `accounts.tests.AccountsSecurityAndConstraintTests.test_register_enforces_django_password_validators_and_queues_outbox` | Security & Auth | Chặn mật khẩu yếu (`12345678` -> `422 WEAK_PASSWORD`), chấp nhận mật khẩu mạnh, không lộ `uid`/`token` trong response và ghi `OutboxEvent`. | **PASS (`ok`)** |
| 3 | `accounts.tests.AccountsSecurityAndConstraintTests.test_login_logout_and_uniform_error_message` | Security & Auth | Kiểm tra thông báo lỗi đăng nhập đồng nhất chống dò email (401), đăng nhập tạo session, truy vấn `/api/v1/me` và đăng xuất xóa phiên (204). | **PASS (`ok`)** |
| 4 | `accounts.tests.AccountsSecurityAndConstraintTests.test_password_reset_does_not_leak_token_or_account_existence` | Security (P0 Fix) | Kiểm tra `POST /api/v1/auth/password-reset/request` không trả `uid`/`token` trong HTTP JSON, trả phản hồi giống hệt nhau giữa email tồn tại và không tồn tại, gửi token qua `mail.outbox` và đặt lại mật khẩu có kiểm tra `validate_password()`. | **PASS (`ok`)** |
| 5 | `accounts.tests.AccountsSecurityAndConstraintTests.test_email_verification_does_not_leak_token_in_http_response` | Security (P0 Fix) | Kiểm tra `POST /api/v1/auth/email-verification/request` không trả `uid`/`token` trong HTTP JSON, lấy token từ `mail.outbox` để xác minh thành công `email_verified_at`. | **PASS (`ok`)** |
| 6 | `accounts.tests.AccountsSecurityAndConstraintTests.test_operator_registration_self_profile_and_rbac` | RBAC & Multi-Tenant | Kiểm tra đăng ký hãng xe mới (`DRAFT`), chủ hãng (`OWNER`) cập nhật thông tin hãng và thêm nhân viên `STAFF`, chặn `STAFF` tự nâng quyền, phân tách quyền `Platform Staff` vs `Platform Admin`. | **PASS (`ok`)** |
| 7 | `accounts.tests.AccountsSecurityAndConstraintTests.test_postgresql_database_constraints_for_layout_and_finance` | PostgreSQL Constraints | Kiểm chứng trực tiếp các ràng buộc DB mới trên PostgreSQL 16: `uq_layout_unit_grid_coord`, `ck_layout_unit_capacity`, `ck_commission_date_order`, `uq_settlement_line_single_booking_item`. | **PASS (`ok`)** |
| 8 | `fleet.tests.FleetOperatorIsolationTests.test_cross_tenant_layout_blocked_and_bound_layout_immutable` | Multi-Tenant & Fleet | Chặn Hãng B tạo xe bằng sơ đồ của Hãng A (`422 CROSS_TENANT_LAYOUT`), chặn thêm vị trí vào sơ đồ đã gắn với chuyến xe (`409 LAYOUT_IN_USE`). | **PASS (`ok`)** |
| 9 | `catalog.tests.CatalogSearchAndOperatorTests.test_search_exact_segment_price_direction_and_available_units` | Search & Segment Pricing (P0 Fix) | Trên tuyến `A(0) → B(1) → C(2) → D(3)`, tìm `B → D` trả đúng `from_sequence=1, to_sequence=3`, đúng giá chặng `B → D` (`680000.00`), tìm chiều ngược `D → B` trả `0`, đặt `A → B` không làm giảm chỗ `B → D`, đặt `A → C` làm giảm chỗ `B → D`. | **PASS (`ok`)** |
| 10 | `catalog.tests.CatalogSearchAndOperatorTests.test_trip_detail_and_blocked_units_t10` | Catalog & Inventory (`T10`) | Kiểm tra `GET /api/v1/trips/<id>` trả đủ trạm dừng/bảng giá/điểm đón, và `GET /api/v1/trips/<id>/units?exclude_blocked=true` ẩn vị trí `BLOCKED`. | **PASS (`ok`)** |
| 11 | `catalog.tests.CatalogSearchAndOperatorTests.test_route_stop_immutability_and_trip_cancellation_release` | Operator Trip Lifecycle | Chặn thêm điểm dừng vào tuyến đã có chuyến (`409 ROUTE_HAS_TRIPS`); khi hủy chuyến (`CANCELLED`), tự động giải phóng các `InventoryAllocation` về `RELEASED`. | **PASS (`ok`)** |
| 12 | `bookings.tests.AcceptanceMultiAppTests.test_t01_to_t12_and_api_contracts` | Concurrency & Atomic Hold (`T01`–`T12`) | Kiểm chứng chống đặt trùng chặng giao nhau `[0,2)` vs `[1,3)` (`T01`), cho phép đặt chặng liền kề `[0,1)` & `[1,2)` (`T02`), rollback giữ 3 phòng khi 1 phòng xung đột (`T03`), thu hồi hold hết hạn (`T04`), idempotency 3 lần webhook VNPay (`T05`), cô lập hãng xe (`T07`), kiểm tra sức chứa & phụ phí trẻ em (`T08`, `T09`), đối soát hoa hồng (`T11`) và hủy vé (`T12`). | **PASS (`ok`)** |
| 13 | `payments.tests.PaymentsVNPayAndTicketQRTests.test_signed_vnpay_url_ipn_verification_and_hmac_qr_checkin` | VNPay & HMAC QR Ticket (P0 Fix) | Kiểm tra chữ ký HMAC-SHA512 trên URL thanh toán VNPay, từ chối IPN sai số tiền `vnp_Amount`, xác nhận IPN hợp lệ xuất vé, `/me/tickets` chỉ trả `qr_token` (không lộ `qr_token_hash`), chặn tấn công dùng trực tiếp `qr_token_hash` từ DB để check-in, và check-in thành công 1 lần duy nhất bằng `qr_token`. | **PASS (`ok`)** |
| 14 | `payments.tests.PaymentsVNPayAndTicketQRTests.test_t06_late_payment_webhook_after_hold_expired_and_seat_reallocated` | Late Webhook (`T06`) | Khi hold của Khách 1 hết hạn và phòng `P01` đã được Khách 2 giữ, webhook thanh toán trễ của Khách 1 được chuyển an toàn sang `EXCEPTION`, không xuất vé trùng và không làm hỏng hold của Khách 2. | **PASS (`ok`)** |
| 15 | `finance.tests.FinanceCancellationAndSettlementTests.test_approved_cancellation_releases_inventory_and_cancels_ticket` | Cancellation Release (P0 Fix) | Khi nhân viên duyệt `APPROVED` yêu cầu hủy vé của Khách 1, `InventoryAllocation` chuyển sang `RELEASED`, `Ticket` chuyển sang `CANCELLED`, `Booking` chuyển sang `CANCELLED`, và Khách 2 lập tức đặt lại được đúng phòng đó trên cùng đoạn chặng. | **PASS (`ok`)** |
