# 09 — ĐIỀU KIỆN SẴN SÀNG TRIỂN KHAI PRODUCTION (DEPLOYMENT READINESS)

**Dự án:** RideWay – Vé Xuyên Việt  

---

## 1. CHECKLIST KỸ THUẬT ĐÃ ĐẠT ĐƯỢC SAU ĐỢT HOÀN THIỆN P0

- [x] **Cơ sở dữ liệu PostgreSQL 16:** Toàn bộ 34 bảng nghiệp vụ cùng extension `btree_gist` và bộ ràng buộc `ExclusionConstraint`, `UniqueConstraint`, `CheckConstraint` đã được migrate và kiểm chứng thực tế.
- [x] **Bảo mật Xác thực & Tài khoản:**
  - [x] Không trả `uid`/`token` khôi phục mật khẩu hoặc xác minh email qua HTTP response.
  - [x] Phản hồi đồng nhất chống dò tài khoản email (Anti-Enumeration).
  - [x] Áp dụng đầy đủ `AUTH_PASSWORD_VALIDATORS` của Django.
  - [x] Bật `@ensure_csrf_cookie`, `SESSION_COOKIE_HTTPONLY = True`, `SameSite = 'Lax'`.
  - [x] Bật DRF Rate Limiting (`AnonRateThrottle`, `UserRateThrottle`, `ScopedRateThrottle`) cho `login`, `register`, `password_reset`, `holds`.
  - [x] Bắt buộc biến môi trường `DJANGO_SECRET_KEY` khi `DJANGO_DEBUG=False`.
- [x] **Toàn vẹn Tìm kiếm & Đặt chỗ theo chặng:**
  - [x] Tìm kiếm chuyến kiểm tra đúng thứ tự chặng `from_stop.sequence < to_stop.sequence` và cờ `allow_pickup`/`allow_dropoff`.
  - [x] Tính giá thấp nhất và số chỗ còn trống đúng trên đoạn `[from_sequence, to_sequence)` được tìm kiếm.
  - [x] Giữ nhiều vị trí nguyên tử (All-or-Nothing) trong 10 phút với khóa chống deadlock và `Idempotency-Key`.
  - [x] Bắt buộc gán đầy đủ hành khách cho tất cả các vị trí trong đơn trước khi tạo yêu cầu thanh toán.
- [x] **An toàn Thanh toán VNPay & Vé điện tử QR:**
  - [x] Sinh URL thanh toán VNPay có chữ ký HMAC-SHA512 chuẩn từ biến môi trường.
  - [x] Xác minh chữ ký IPN, mã tham chiếu `vnp_TxnRef`, số tiền `vnp_Amount * 100`, mã phản hồi `vnp_ResponseCode == '00'` và chống xử lý trùng callback.
  - [x] Xử lý an toàn thanh toán đến muộn sau khi hết hạn giữ chỗ (`EXCEPTION` + `AuditLog` + `OutboxEvent`).
  - [x] Mã QR vé điện tử ký số HMAC, DB chỉ lưu bản băm SHA-256 `qr_token_hash`, ẩn `qr_token_hash` khỏi API khách hàng và bắt buộc băm SHA-256 khi check-in.
  - [x] Giải phóng tồn kho `InventoryAllocation` (`RELEASED`) và vô hiệu hóa vé (`CANCELLED`) ngay khi duyệt hủy vé hoặc hủy chuyến.

---

## 2. BIẾN MÔI TRƯỜNG BẮT BUỘC TRƯỚC KHI TRIỂN KHAI PRODUCTION

Khi triển khai lên máy chủ Production/Staging, cần thiết lập đầy đủ các biến môi trường sau:

```env
# 1. Django Core & Security
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<chuỗi-ngẫu-nhiên-tối-thiểu-64-ký-tự>
DJANGO_ALLOWED_HOSTS=vexuyenviet.vn,api.vexuyenviet.vn
DJANGO_SESSION_SECURE=True
DJANGO_CSRF_SECURE=True

# 2. PostgreSQL 16 Database
PGDATABASE=rideway
PGUSER=rideway_app
PGPASSWORD=<mật-khẩu-db-mạnh>
PGHOST=postgres
PGPORT=5432

# 3. VNPay Payment Gateway
VNPAY_TMN_CODE=<mã-website-do-vnpay-cấp>
VNPAY_HASH_SECRET=<chuỗi-bí-mật-hmac-sha512-do-vnpay-cấp>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://vexuyenviet.vn/payment/vnpay-return

# 4. SMTP Email Server
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_DEFAULT_FROM_EMAIL=no-reply@vexuyenviet.vn
```

---

## 3. ĐIỀU KIỆN NGHIỆP VỤ CẦN CHỐT TRƯỚC KHI MỞ BÁN TIỀN THẬT

1. **Tài khoản Merchant VNPay (`OPEN-02`):** Cần điền `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` thực tế từ cổng VNPay Sandbox/Production và cấu hình IPN URL trên trang quản trị VNPay trỏ về `POST /api/v1/webhooks/payments/vnpay`.
2. **Chính sách Phụ phí trẻ em & Thời hạn hủy vé (`OPEN-01`, `OPEN-03`, `OPEN-05`):** Admin cần phê duyệt bản ghi `PolicyVersion(scope='PLATFORM')` chứa thông số `child_surcharge_amount` và `cutoff_seconds` chính thức.
3. **Thỏa thuận hoa hồng từng hãng xe (`OPEN-08`):** Admin cần tạo và phê duyệt `CommissionAgreement` cho từng hãng xe trước khi thực hiện kỳ quyết toán (`Settlement`) đầu tiên.
