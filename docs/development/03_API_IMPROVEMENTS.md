# 03 — DANH SÁCH CẢI TIẾN & BỔ SUNG REST API (API IMPROVEMENTS)

**Dự án:** RideWay – Vé Xuyên Việt  
**Tiêu chuẩn thiết kế:** RESTful API `/api/v1/*`, JSON Error Format `{"detail", "code", "request_id"}`, Session + CSRF Auth, Multi-Tenant Isolation qua `OperatorMembership` & `X-Operator-Id`.

---

## 1. CÁC API HIỆN CÓ ĐƯỢC SỬA LỖI & NÂNG CẤP TRONG P0

| STT | Method & Endpoint | Vấn đề trước khi sửa | Nội dung nâng cấp trong P0 |
|---|---|---|---|
| 1 | `GET /api/v1/auth/csrf` | Chưa ép trình duyệt lưu cookie `csrftoken` nếu chưa có. | Gắn `@method_decorator(ensure_csrf_cookie, name='dispatch')` để luôn thiết lập cookie `csrftoken`. |
| 2 | `POST /api/v1/auth/register` | Chỉ kiểm tra `len(password) < 8`; chưa áp dụng `AUTH_PASSWORD_VALIDATORS`; chưa ghi `OutboxEvent`. | Gọi `validate_password(password, user=...)`, áp dụng `ScopedRateThrottle` (`auth`), và tạo `OutboxEvent(event_type='USER_REGISTERED')` để gửi email xác minh. |
| 3 | `POST /api/v1/auth/login` | Chưa giới hạn tần suất thử đăng nhập. | Áp dụng `ScopedRateThrottle` (`login`) chống brute-force mật khẩu; tái tạo session key an toàn. |
| 4 | `POST /api/v1/auth/password-reset/request` | **Lỗi P0:** Trả trực tiếp `uid` và `token` trong JSON response khi email tồn tại. | Xóa hoàn toàn `uid` và `token` khỏi HTTP response; luôn trả thông báo đồng nhất HTTP 200 (chống dò tài khoản email); lưu sự kiện vào `OutboxEvent` và gửi qua Django Email backend (`mail.outbox`). |
| 5 | `POST /api/v1/auth/password-reset/confirm` | Chưa kiểm tra `validate_password()` và chưa ghi `AuditLog`. | Gọi `validate_password()`, cập nhật mật khẩu, ghi `AuditLog(action='PASSWORD_RESET_COMPLETED')`. |
| 6 | `POST /api/v1/auth/email-verification/request` | **Lỗi P0:** Trả trực tiếp `uid` và `token` trong JSON response. | Xóa `uid` và `token` khỏi HTTP response; ghi `OutboxEvent` và gửi email xác minh qua Django Email backend. |
| 7 | `GET /api/v1/trips` | **Lỗi P0:** Không kiểm tra chiều chạy `from_stop.sequence < to_stop.sequence`, không kiểm tra `allow_pickup`/`allow_dropoff`, tính `min_price` trên toàn chuyến thay vì đúng đoạn chặng khách chọn, chưa trả về số chỗ trống. | Dùng `Subquery` xác định `from_sequence < to_sequence` với `allow_pickup=True` và `allow_dropoff=True`; tính đúng `min_price` trên đoạn `[from_sequence, to_sequence)`; bổ sung lọc `unit_kind`, `min_price`, `max_price`, `departure_from`, `departure_to`; trả kèm `from_sequence`, `to_sequence`, `departure_at`, `boarding_at` và `available_units`. |
| 8 | `GET /api/v1/trips/<trip_id>/units` | Chưa trả `child_extra_amount` và chưa tách trạng thái vị trí bị khóa bảo trì `BLOCKED` (`T10`). | Trả thêm `child_extra_amount` cho từng vị trí và loại bỏ (hoặc đánh dấu rõ `status: 'BLOCKED'`, `available: False`) các vị trí bị khóa không bán. |
| 9 | `PUT /api/v1/bookings/<booking_id>/passengers` | Chưa kiểm tra mọi `BookingItem` trong đơn đều được gán hành khách; chưa hỗ trợ `PickupOption.kind == 'ZONE'`. | Bắt buộc `item_assignments` phải phủ đủ 100% các `BookingItem` của đơn đặt; hỗ trợ chọn `PickupOption` cả loại `FIXED` và `ZONE`. |
| 10 | `POST /api/v1/bookings/<booking_id>/payment-intents` | Cho phép tạo yêu cầu thanh toán ngay cả khi đơn chưa nhập danh sách hành khách; `qr_payload` mới là chuỗi giả lập. | Chặn tạo `PaymentIntent` nếu đơn chưa gán đủ hành khách cho các phòng/giường; sinh URL thanh toán VNPay Sandbox chuẩn có chữ ký HMAC-SHA512 (`vnp_SecureHash`). |
| 11 | `GET/POST /api/v1/webhooks/payments/vnpay` | Kiểm tra `vnp_Amount` đang là tùy chọn; thiếu kiểm tra `vnp_TmnCode` và `vnp_TransactionStatus`. | Kiểm tra chữ ký HMAC-SHA512, `vnp_TmnCode` (khi cấu hình), bắt buộc đối chiếu `vnp_Amount`, kiểm tra `vnp_ResponseCode == '00'` và `vnp_TransactionStatus` (mặc định `'00'`), xử lý an toàn late webhook bằng savepoint chống `IntegrityError`. |
| 12 | `GET /api/v1/me/tickets` | **Lỗi P0:** Trả trực tiếp cột `qr_token_hash` trong DB ra JSON response. | Không trả `qr_token_hash`; trả `qr_token` được ký số HMAC (`build_signed_qr_token`) để hiển thị mã QR cho hành khách. |
| 13 | `POST /api/v1/operators/me/check-in` | **Lỗi P0:** Cho phép truyền chuỗi 64 ký tự hex để khớp trực tiếp với `qr_token_hash` mà không qua bước băm SHA-256; chưa lưu `AuditLog` người và thời điểm check-in. | Xóa nhánh bypass 64 ký tự; bắt buộc luôn băm `sha256(qr_token)` để tra cứu `qr_token_hash`, kiểm tra vé thuộc đúng nhà xe, cập nhật `status='USED'` và ghi `AuditLog(action='TICKET_CHECKED_IN')` kèm người thực hiện & thời điểm. |
| 14 | `POST /api/v1/admin/cancellation-requests/<id>/decision` | **Lỗi P0:** Khi duyệt `APPROVED`, chưa giải phóng `InventoryAllocation`, chưa hủy `Ticket` và chưa cập nhật `Booking.status`. | Cho phép `IsPlatformStaffOrAdmin` duyệt; khi `APPROVED` yêu cầu `CANCEL`, tự động chuyển `InventoryAllocation` sang `RELEASED`, `Ticket` sang `CANCELLED` và `Booking` sang `CANCELLED` trong cùng transaction. |

---

## 2. CÁC API BỔ SUNG MỚI TRONG P0 (HOÀN THIỆN TÌM KIẾM & QUẢN LÝ HÃNG XE)

| STT | Method & Endpoint mới | Permission | Chức năng nghiệp vụ |
|---|---|---|---|
| 1 | `GET /api/v1/trips/<uuid:trip_id>` | `AllowAny` | Xem chi tiết chuyến xe: thông tin hãng, loại xe, sơ đồ, danh sách trạm dừng (`stops` kèm thứ tự & cờ đón/trả), bảng giá theo chặng (`fares`) và các điểm đón/trả (`pickup_options`). |
| 2 | `POST /api/v1/operators/register` | `IsAuthenticated` | Người dùng đăng ký mở hãng xe mới (tạo `Operator(status='DRAFT')` và gắn người tạo làm `OperatorMembership(role='OWNER')` để chờ Admin duyệt `ACTIVE`). |
| 3 | `GET/PATCH /api/v1/operators/me` | `IsOperatorMember` | Xem và cập nhật thông tin hãng xe hiện tại (`name`, `legal_name`, `contact_email` — chỉ `OWNER`/`MANAGER` được cập nhật). |
| 4 | `GET/POST/PATCH /api/v1/operators/me/memberships` | `IsOperatorManagerOrOwner` | Chủ hãng xe (`OWNER`) xem danh sách nhân viên của hãng, thêm nhân viên mới theo email/`user_id` (`MANAGER`, `STAFF`) hoặc khóa/mở khóa nhân viên. |
| 5 | `PATCH /api/v1/operators/me/vehicles/<uuid:vehicle_id>` | `IsOperatorManagerOrOwner` | Cập nhật biển số, loại xe, sơ đồ (nếu xe chưa gắn chuyến đang chạy) hoặc trạng thái hoạt động (`active`) của phương tiện. |
| 6 | `PATCH /api/v1/operators/me/routes/<uuid:route_id>` | `IsOperatorManagerOrOwner` | Cập nhật tên tuyến đường hoặc trạng thái `is_active` của tuyến. |
| 7 | `PATCH /api/v1/operators/me/trips/<uuid:trip_id>` | `IsOperatorManagerOrOwner` | Cập nhật giờ khởi hành (`departure_at`) hoặc đổi phương tiện (`vehicle_id` cùng sơ đồ & cùng hãng) khi chuyến đang ở trạng thái `DRAFT`. |
| 8 | `GET /api/v1/operators/me/trips/<uuid:trip_id>/passengers` | `IsOperatorMember` | Xem danh sách hành khách đã đặt chỗ / đã lên xe (`CHECKED_IN` / `USED`) trên chuyến xe của hãng kèm mã phòng, chặng đi/đến và trạng thái vé. |
