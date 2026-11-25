# 07 — KẾ HOẠCH PHÁT TRIỂN CHỨC NĂNG P1 (P1 FEATURES PLAN)

**Dự án:** RideWay – Vé Xuyên Việt  
**Trạng thái:** Đề xuất kỹ thuật chi tiết chờ phê duyệt trước khi mở rộng Schema & Giao diện (sau khi hoàn tất toàn bộ P0).

---

## 1. QUẢN LÝ TÀI XẾ & LỊCH CHẠY ĐỊNH KỲ (MỤC 9 MASTER PROMPT)

### 1.1. Đánh giá Schema hiện tại và nhu cầu mở rộng
- Hiện tại `catalog.Trip` ([backend/catalog/models.py](file:///c:/ProjectCV/RideWay/backend/catalog/models.py#L42-L68)) mới liên kết với `route` và `vehicle`, chưa có thông tin tài xế điều khiển phương tiện và chưa có cơ chế tạo lịch chạy lặp lại theo tuần/tháng.
- **Đề xuất Model mới tối giản (không trùng lặp):**
  - Thêm duy nhất 1 bảng `drivers` (`fleet.Driver`) thuộc app `fleet`:
    - `operator = ForeignKey('accounts.Operator', on_delete=PROTECT)`
    - `full_name = CharField(max_length=160)`
    - `phone = CharField(max_length=25)`
    - `license_number = CharField(max_length=40)`
    - `license_class = CharField(max_length=16)` (ví dụ: `D`, `E`)
    - `license_expires_at = DateField()`
    - `is_active = BooleanField(default=True)`
    - Ràng buộc: `UniqueConstraint(fields=['operator', 'license_number'], name='uq_operator_driver_license')`.
  - Mở rộng trực tiếp trên `catalog.Trip` (không tạo bảng trung gian thừa):
    - `primary_driver = ForeignKey('fleet.Driver', on_delete=PROTECT, null=True, blank=True, related_name='primary_trips')`
    - `co_driver = ForeignKey('fleet.Driver', on_delete=PROTECT, null=True, blank=True, related_name='co_trips')`
    - `estimated_arrival_at = DateTimeField(null=True, blank=True)`

### 1.2. Kiểm tra trùng lịch Xe / Tài xế & Đổi Xe / Tài xế khi sự cố
- **Kiểm tra trùng lịch:** Khi gán `vehicle`, `primary_driver` hoặc `co_driver` cho một chuyến xe có khoảng thời gian vận hành `[departure_at, estimated_arrival_at]`, service kiểm tra không có chuyến nào khác ở trạng thái `DRAFT` / `OPEN` sử dụng cùng phương tiện hoặc cùng tài xế trong khoảng thời gian giao nhau, đồng thời kiểm tra `driver.license_expires_at >= departure_at.date()`.
- **Đổi phương tiện khi có sự cố (`PATCH /api/v1/operators/me/trips/<id>/swap-vehicle`):**
  - Nếu chuyến xe chưa khởi hành nhưng xe gặp sự cố kỹ thuật, cho phép đổi sang `new_vehicle` thuộc cùng hãng xe và có **cùng `layout_id`** (để toàn bộ mã phòng/giường `TripUnit` và `BookingItem` đã bán được giữ nguyên 100%).
- **Sinh chuyến định kỳ (`POST /api/v1/operators/me/trips/batch-generate`):**
  - Nhận `route_id`, `vehicle_id`, `departure_time` (`HH:MM`), `weekdays` (`[0..6]`), `start_date`, `end_date` và danh sách `fares` mẫu để sinh hàng loạt `Trip`, `TripStop`, `TripUnit`, `TripFare` trong 1 transaction.

---

## 2. QUẢN LÝ VÉ NÂNG CAO & SOÁT VÉ CHECK-IN (MỤC 10 MASTER PROMPT)

- **Những phần đã hoàn thiện ngay trong P0:**
  - Phát hành vé điện tử 1:1 theo `BookingItem` sau khi xác minh VNPay IPN.
  - Mã QR vé ký số HMAC (`build_signed_qr_token`), DB chỉ lưu SHA-256 `qr_token_hash`.
  - Xác thực QR tại Backend (`POST /api/v1/operators/me/check-in`), chống quét lại lần 2, lưu `AuditLog` người thực hiện và thời điểm check-in.
  - Xem danh sách hành khách theo chuyến (`GET /api/v1/operators/me/trips/<id>/passengers`).
  - Tự động hủy hiệu lực vé (`status='CANCELLED'`) khi duyệt hủy vé hoặc hủy chuyến.
- **Mở rộng trong P1:**
  - Thêm cột `checked_in_at = DateTimeField(null=True, blank=True)` và `checked_in_by = ForeignKey('accounts.User', null=True, blank=True, on_delete=SET_NULL)` trực tiếp trên bảng `tickets` để truy vấn nhanh trên bảng vé không cần join `audit_logs`.
  - Hỗ trợ chế độ **"Kiểm tra vé (Verify-only)"** và **"Check-in lên xe"** tại đúng trạm `from_sequence` của hành khách.

---

## 3. HỦY VÉ, HOÀN TIỀN & ĐỐI SOÁT DOANH THU (MỤC 11 MASTER PROMPT)

- **Những phần đã hoàn thiện ngay trong P0:**
  - Gửi yêu cầu hủy vé, kiểm tra trạng thái đơn, lưu snapshot chính sách (`policy_snapshot`).
  - Khi duyệt `APPROVED` yêu cầu hủy, tự động giải phóng `InventoryAllocation` (`RELEASED`), hủy hiệu lực `Ticket` (`CANCELLED`), chuyển `Booking` sang `CANCELLED` và tạo bản ghi `Refund(status='PENDING')`.
  - Duyệt đối soát (`approve_settlement`) bắt buộc có `CommissionAgreement` đã phê duyệt (`T11`) và ràng buộc DB `uq_settlement_line_single_booking_item` chống thanh toán trùng 1 `BookingItem` ở 2 kỳ.
- **Mở rộng trong P1 (sau khi chốt `OPEN-03`, `OPEN-05`, `OPEN-08`):**
  - Tự động tính số tiền hoàn (`Refund.amount`) dựa trên bậc thời gian trong `PolicyVersion.rules_json` (ví dụ: trước 24h hoàn 90%, từ 4h–24h hoàn 70%).
  - Service `generate_operator_settlement(operator_id, period_start, period_end)` tự động gom tất cả `BookingItem` của các chuyến đã `COMPLETED` trong kỳ chưa nằm trong `SettlementLine` để khởi tạo bảng đối soát `DRAFT`.
  - Quản lý trạng thái chi trả công nợ (`APPROVED -> PAID` kèm `payout_reference` và biên lai chuyển khoản).

---

## 4. THÔNG BÁO EMAIL & CHĂM SÓC KHÁCH HÀNG (MỤC 12 MASTER PROMPT)

- **Hệ thống Thông báo qua Transactional Outbox (`content.OutboxEvent`):**
  - Trong P0, các sự kiện `EMAIL_VERIFICATION_REQUESTED`, `PASSWORD_RESET_REQUESTED`, `TICKET_ISSUED`, `BOOKING_CANCELLED`, `TRIP_CANCELLED` đã được ghi vào `outbox_events` trong cùng transaction với dữ liệu nghiệp vụ.
  - Trong P1: Xây dựng management command `python manage.py dispatch_outbox_events` (hoặc Celery worker khi tải > 1.000 đơn/giờ) để gửi email HTML kèm mã vé QR đính kèm và xử lý retry với exponential backoff khi SMTP lỗi tạm thời.
- **Hệ thống Phiếu hỗ trợ & Khiếu nại (`bookings.SupportTicket`):**
  - Bổ sung bảng `support_tickets` (`booking`, `customer`, `assigned_staff`, `category`, `subject`, `description`, `status` trong `OPEN`/`IN_PROGRESS`/`RESOLVED`/`CLOSED`, `resolution_note`) để Nhân viên nền tảng (`Platform Staff`) tiếp nhận và phản hồi khiếu nại của hành khách.

---

## 5. KẾ HOẠCH NÂNG CẤP KIẾN TRÚC FRONTEND (MỤC 13 MASTER PROMPT)

> **Lưu ý:** Trong đợt P0 hiện tại, giao diện Frontend được giữ nguyên theo đúng yêu cầu Mục 13. Dưới đây là kế hoạch nâng cấp Frontend trong P1 sau khi bạn phê duyệt:

1. **Tích hợp `react-router-dom` v7:**
   - Tách SPA thành các route độc lập: `/` (Trang chủ), `/search` (Tìm chuyến & Sơ đồ 2 tầng), `/checkout/:bookingId` (Hành khách & Thanh toán VNPay), `/my-tickets` (Quản lý vé & Lịch sử), `/operator/*` (Dashboard Hãng xe), `/staff/*` (Dashboard Nhân viên), `/admin/*` (Dashboard Admin).
2. **Tích hợp Redux Toolkit & RTK Query (`@reduxjs/toolkit`, `react-redux`):**
   - Tạo `ridewayApi` quản lý toàn bộ 65+ endpoints với cơ chế `providesTags` / `invalidatesTags` tự động đồng bộ sơ đồ ghế, danh sách vé và bảng đối soát.
3. **Hoàn thiện UI 4 Portals (Thương hiệu Vé Xuyên Việt — Trắng & Xanh lá `#63AB45`):**
   - Bổ sung `<input type="date">` chọn ngày khởi hành và bộ lọc khoảng giá/loại phòng trên thanh tìm kiếm.
   - Hiển thị mã QR thật bằng SVG (`qrcode.react`) cho từng vé điện tử.
   - Bổ sung các màn hình CRUD Đội xe, Sơ đồ 2 tầng, Tuyến, Chuyến, Giá chặng, Danh sách hành khách trên `OperatorPortal` và màn hình Duyệt hủy vé / Cấu hình Hoa hồng & Chính sách trên `AdminPortal`.
