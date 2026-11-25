# 05 — BÁO CÁO KẾT QUẢ TRIỂN KHAI CÁC HẠNG MỤC P0 (P0 IMPLEMENTATION REPORT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Phạm vi thực hiện:** Phase 2 (P0 Security & Database), Phase 3 (P0 Booking & Search), Phase 4 (P0 Payment, Ticket & Cancellation Release), Phase 5 (P0 Operator Management).

---

## 1. TỔNG HỢP CÁC FILE ĐÃ CHỈNH SỬA & MIGRATIONS MỚI

### 1.1. Danh sách File Mã nguồn đã sửa / bổ sung
1. [backend/backend/settings.py](file:///c:/ProjectCV/RideWay/backend/backend/settings.py):
   - Đọc `DJANGO_DEBUG` và `DJANGO_ALLOWED_HOSTS` từ biến môi trường; bắt buộc có `DJANGO_SECRET_KEY` khi `DEBUG=False`.
   - Bật DRF Rate Limiting (`AnonRateThrottle`, `UserRateThrottle`, `ScopedRateThrottle`) cho `login`, `register`, `password_reset`, `holds`.
   - Cấu hình `EMAIL_BACKEND` và `DEFAULT_FROM_EMAIL`.
2. [backend/common/__init__.py](file:///c:/ProjectCV/RideWay/backend/common/__init__.py):
   - Nâng cấp `custom_exception_handler` bắt `DjangoValidationError` (422 `VALIDATION_ERROR`), `IntegrityError` (409 `CONFLICT`) và `KeyError`/`ValueError`/`TypeError`/`DecimalException` (400 `INVALID_INPUT`), chuẩn hóa về `{"detail", "code", "request_id"}`.
3. [backend/accounts/views.py](file:///c:/ProjectCV/RideWay/backend/accounts/views.py) & [backend/accounts/urls.py](file:///c:/ProjectCV/RideWay/backend/accounts/urls.py):
   - Gắn `@method_decorator(ensure_csrf_cookie, name='dispatch')` cho `CsrfTokenView`.
   - Gọi `validate_password()` theo `AUTH_PASSWORD_VALIDATORS` của Django khi đăng ký và đặt lại mật khẩu.
   - Loại bỏ hoàn toàn `uid` và `token` khỏi HTTP JSON response của `PasswordResetRequestView` và `EmailVerificationRequestView`; trả phản hồi đồng nhất chống dò email và đẩy sự kiện vào `OutboxEvent` + gửi qua `send_mail()`.
   - Bổ sung 3 API quản lý hãng xe: `POST /api/v1/operators/register`, `GET/PATCH /api/v1/operators/me`, `GET/POST /api/v1/operators/me/memberships`.
4. [backend/fleet/models.py](file:///c:/ProjectCV/RideWay/backend/fleet/models.py), [backend/fleet/views.py](file:///c:/ProjectCV/RideWay/backend/fleet/views.py), [backend/fleet/urls.py](file:///c:/ProjectCV/RideWay/backend/fleet/urls.py):
   - Bổ sung ràng buộc `uq_layout_unit_grid_coord` và `ck_layout_unit_capacity` trên `LayoutUnit`.
   - Chặn sửa sơ đồ ghế đã gắn chuyến (`409 LAYOUT_IN_USE`).
   - Bổ sung `PATCH /api/v1/operators/me/vehicles/<uuid:vehicle_id>` để cập nhật xe có kiểm tra cô lập hãng.
5. [backend/catalog/views.py](file:///c:/ProjectCV/RideWay/backend/catalog/views.py) & [backend/catalog/urls.py](file:///c:/ProjectCV/RideWay/backend/catalog/urls.py):
   - Viết lại thuật toán `TripSearchView` (`GET /api/v1/trips`): kiểm tra đúng chiều chạy `from_stop.sequence < to_stop.sequence`, kiểm tra `allow_pickup=True` tại điểm lên và `allow_dropoff=True` tại điểm xuống, tính đúng giá vé trên đoạn `[from_sequence, to_sequence)` (`BR-05`), tính đúng số vị trí còn trống `available_units` trên đoạn đó, và hỗ trợ lọc theo hãng, loại xe, `unit_kind`, ngày đi, khung giờ khởi hành, khoảng giá.
   - Bổ sung `GET /api/v1/trips/<uuid:trip_id>` (`TripDetailView`), `PATCH /api/v1/operators/me/routes/<uuid:route_id>`, `PATCH /api/v1/operators/me/trips/<uuid:trip_id>`, `GET /api/v1/operators/me/trips/<uuid:trip_id>/passengers`.
   - Chặn thêm điểm dừng vào tuyến đã có chuyến (`409 ROUTE_HAS_TRIPS`).
   - Khi hãng xe hủy chuyến (`status='CANCELLED'`), tự động giải phóng các `InventoryAllocation` về `RELEASED` và hủy vé `Ticket` về `CANCELLED`.
6. [backend/bookings/services.py](file:///c:/ProjectCV/RideWay/backend/bookings/services.py) & [backend/bookings/views.py](file:///c:/ProjectCV/RideWay/backend/bookings/views.py):
   - Bắt buộc `assign_passengers_and_pickup` phải gán hành khách hợp lệ phủ kín 100% các `BookingItem` trong đơn.
   - Hỗ trợ `PickupOption` cả loại `FIXED` và `ZONE`.
   - Kiểm tra `booking.hold_expires_at > now` khi hãng xe báo giá đón riêng và khi khách chấp nhận báo giá.
7. [backend/payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py) & [backend/payments/views.py](file:///c:/ProjectCV/RideWay/backend/payments/views.py):
   - Sinh URL thanh toán VNPay Sandbox có chữ ký HMAC-SHA512 chuẩn (`build_vnpay_payment_url`) từ cấu hình môi trường (`VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`).
   - Đối chiếu chặt chữ ký IPN, `vnp_TmnCode`, `vnp_CurrCode`, `vnp_Amount`, `vnp_ResponseCode == '00'`, `vnp_TransactionStatus == '00'` và xử lý an toàn trường hợp thanh toán đến muộn sau khi hold hết hạn (`T06` -> `EXCEPTION`).
   - Sinh `qr_token` ký số HMAC (`build_signed_qr_token`) trả cho chủ vé qua `/api/v1/me/tickets`, xóa `qr_token_hash` khỏi API response, và bắt buộc `check_in_ticket` luôn băm SHA-256 trước khi đối chiếu với DB.
8. [backend/finance/models.py](file:///c:/ProjectCV/RideWay/backend/finance/models.py), [backend/finance/services.py](file:///c:/ProjectCV/RideWay/backend/finance/services.py), [backend/finance/views.py](file:///c:/ProjectCV/RideWay/backend/finance/views.py):
   - Bổ sung ràng buộc `ck_commission_date_order` và `uq_settlement_line_single_booking_item`.
   - Hoàn thiện `decide_cancellation_request`: khi duyệt `APPROVED` yêu cầu hủy vé, tự động giải phóng `InventoryAllocation` sang `RELEASED`, vô hiệu hóa `Ticket` sang `CANCELLED` và cập nhật `Booking` sang `CANCELLED` trong cùng transaction.
9. [backend/content/models.py](file:///c:/ProjectCV/RideWay/backend/content/models.py):
   - Bổ sung chỉ mục `ix_audit_resource_lookup` và `ix_outbox_unpublished`.

### 1.2. Danh sách Migrations mới đã tạo và áp dụng trên PostgreSQL 16
1. [backend/fleet/migrations/0002_layoutunit_uq_layout_unit_grid_coord_and_more.py](file:///c:/ProjectCV/RideWay/backend/fleet/migrations/0002_layoutunit_uq_layout_unit_grid_coord_and_more.py)
2. [backend/finance/migrations/0002_commissionagreement_ck_commission_date_order_and_more.py](file:///c:/ProjectCV/RideWay/backend/finance/migrations/0002_commissionagreement_ck_commission_date_order_and_more.py)
3. [backend/content/migrations/0002_auditlog_ix_audit_resource_lookup_and_more.py](file:///c:/ProjectCV/RideWay/backend/content/migrations/0002_auditlog_ix_audit_resource_lookup_and_more.py)
