# 04 — BÁO CÁO KIỂM TOÁN & GIA CỐ BẢO MẬT (SECURITY AUDIT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Phạm vi kiểm toán:** Xác thực, Quản lý phiên, Phân quyền đa nhà xe (Multi-Tenant RBAC), Bảo mật Token/QR, Chữ ký cổng thanh toán VNPay, Chống Brute-Force & Bảo vệ cấu hình.

---

## 1. DANH MỤC LỖ HỔNG ĐÃ PHÁT HIỆN VÀ BIỆN PHÁP KHẮC PHỤC TRONG P0

### 1.1. Lộ Token khôi phục mật khẩu và xác minh email qua API công khai (Critical - CVSS 9.8)
- **Hiện trạng trước khi sửa:**
  - `PasswordResetRequestView.post` ([backend/accounts/views.py](file:///c:/ProjectCV/RideWay/backend/accounts/views.py#L89-L92)) trả trực tiếp `payload['uid']` và `payload['token']` trong JSON response khi email tồn tại.
  - `EmailVerificationRequestView.post` ([backend/accounts/views.py](file:///c:/ProjectCV/RideWay/backend/accounts/views.py#L121-L127)) trả trực tiếp `uid` và `token` trong JSON response.
  - Hậu quả: Kẻ tấn công chỉ cần biết địa chỉ email của bất kỳ người dùng hoặc Admin nào là có thể gọi `/api/v1/auth/password-reset/request` để lấy ngay `uid` + `token` hợp lệ và đổi mật khẩu chiếm đoạt tài khoản (Account Takeover), đồng thời phân biệt được email nào có tồn tại trong hệ thống (User Enumeration).
- **Biện pháp khắc phục đã triển khai:**
  - Xóa hoàn toàn `uid` và `token` khỏi HTTP response của cả hai endpoint.
  - Mọi yêu cầu tới `/api/v1/auth/password-reset/request` luôn trả về cùng một mã HTTP `200 OK` và cùng một thông điệp `{"detail": "If an active account with that email exists, password reset instructions have been sent."}` bất kể email có tồn tại hay không.
  - Token chỉ được ghi vào bảng `outbox_events` (`OutboxEvent`) và gửi qua kênh Email (`django.core.mail.send_mail`).

### 1.2. Lộ mã băm QR vé điện tử (`qr_token_hash`) và Bypass băm SHA-256 khi soát vé (High - CVSS 8.1)
- **Hiện trạng trước khi sửa:**
  - `MyTicketsView.get` ([backend/payments/views.py](file:///c:/ProjectCV/RideWay/backend/payments/views.py#L86)) trả trực tiếp cột `qr_token_hash` từ DB cho client.
  - `check_in_ticket` ([backend/payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L189-L193)) chứa nhánh `if len(qr_token) == 64: token_hash = qr_token` cho phép dùng trực tiếp chuỗi băm SHA-256 trong DB làm mã soát vé.
- **Biện pháp khắc phục đã triển khai:**
  - Sử dụng chữ ký mật mã HMAC (`django.core.signing.Signer(salt='rideway.ticket.qr')`) thông qua hàm `build_signed_qr_token(ticket_code, booking_item_id)` để sinh `qr_token` cho chủ vé.
  - Trong DB (`tickets.qr_token_hash`) chỉ lưu giá trị băm một chiều `sha256(qr_token)`.
  - API `/api/v1/me/tickets` chỉ trả `qr_token` (không bao giờ trả `qr_token_hash`).
  - Hàm `check_in_ticket` luôn tính `token_hash = hashlib.sha256(qr_token.encode('utf-8')).hexdigest()` trước khi truy vấn DB; nếu kẻ tấn công đánh cắp được bản băm `qr_token_hash` từ bản sao lưu DB và gửi vào API check-in, hệ thống sẽ băm lần nữa và từ chối!

### 1.3. Kiểm tra độ mạnh mật khẩu theo Django Password Validators (Medium)
- **Hiện trạng trước khi sửa:**
  - `RegisterView` và `PasswordResetConfirmView` chỉ kiểm tra `len(password) < 8`, cho phép đặt các mật khẩu phổ biến như `12345678` hoặc `password`.
- **Biện pháp khắc phục đã triển khai:**
  - Gọi `django.contrib.auth.password_validation.validate_password(password, user=user)` tại cả hai luồng Đăng ký và Đặt lại mật khẩu, kích hoạt đầy đủ 4 bộ kiểm tra (`UserAttributeSimilarityValidator`, `MinimumLengthValidator`, `CommonPasswordValidator`, `NumericPasswordValidator`).

### 1.4. Giới hạn tần suất gọi API (Rate Limiting / Throttling) chống Brute-Force & Inventory DoS (High)
- **Hiện trạng trước khi sửa:**
  - Chưa cấu hình `DEFAULT_THROTTLE_CLASSES` và `DEFAULT_THROTTLE_RATES` trong `settings.py`.
- **Biện pháp khắc phục đã triển khai:**
  - Bật `AnonRateThrottle`, `UserRateThrottle`, `ScopedRateThrottle` với các ngưỡng bảo vệ riêng cho `login`, `register`, `password_reset`, `holds`.

### 1.5. Cô lập dữ liệu đa nhà xe (Multi-Tenant Isolation) & Kiểm soát phân quyền RBAC
- Mọi truy vấn đọc/ghi của nhà xe (`/api/v1/operators/me/*`) đều lọc bắt buộc qua `operator_id__in=get_active_operator_ids(request.user, request=request)`.
- Kiểm tra chéo (Cross-tenant validation) trên mọi thao tác liên kết:
  - Tạo phương tiện (`Vehicle`): `layout.operator_id == operator_id`.
  - Tạo chuyến (`Trip`): `route.operator_id == vehicle.operator_id == operator_id` (`API-15`).
  - Tạo điểm đón (`PickupOption`): `route_stop.route.operator_id == operator_id`.
  - Soát vé (`check_in_ticket`) & Báo giá đón riêng (`operator_quote_pickup`): chỉ thao tác được trên vé và yêu cầu đón thuộc chuyến xe của hãng mình.

### 1.6. Bảo vệ cấu hình môi trường & CSRF Session
- `CsrfTokenView` được gắn `@method_decorator(ensure_csrf_cookie, name='dispatch')`.
- `SESSION_COOKIE_HTTPONLY = True`, `SESSION_COOKIE_SAMESITE = 'Lax'`, `CSRF_COOKIE_SAMESITE = 'Lax'`.
- `DEBUG` và `ALLOWED_HOSTS` trong `settings.py` được đọc từ biến môi trường (`DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`); khi `DEBUG=False`, hệ thống bắt buộc phải có `DJANGO_SECRET_KEY` từ biến môi trường.
