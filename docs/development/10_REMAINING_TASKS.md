# 10 — CÔNG VIỆC CÒN LẠI, PHỤ THUỘC & TIÊU CHÍ NGHIỆM THU (REMAINING TASKS)

**Dự án:** RideWay – Vé Xuyên Việt  
**Phạm vi:** Các hạng mục thuộc giai đoạn **P1** và **P2** cùng các cấu hình phụ thuộc quyết định nghiệp vụ sau khi giai đoạn **P0 Backend & Database** đã hoàn tất.

---

## 1. BẢNG CÔNG VIỆC P1 (CẦN PHÊ DUYỆT ĐỂ TRIỂN KHAI TIẾP)

| Mã Task | Phân hệ | Công việc cần thực hiện | Phụ thuộc | Tiêu chí nghiệm thu (Acceptance Criteria) |
|---|---|---|---|---|
| **P1-01** | `fleet`, `catalog` | Tạo model `fleet.Driver` (bảng `drivers`), gắn `primary_driver`/`co_driver` vào `catalog.Trip`, kiểm tra chống trùng lịch chạy xe/tài xế và API sinh chuyến định kỳ hàng loạt (`/operators/me/trips/batch-generate`). | Hoàn tất P0 + Phê duyệt tạo bảng `drivers` | Hãng xe tạo được hồ sơ tài xế, phân công vào chuyến xe, hệ thống chặn (409/422) nếu tài xế hết hạn GPLX hoặc trùng giờ chạy chuyến khác. |
| **P1-02** | `content`, `inventory` | Xây dựng tiến trình chạy nền (`python manage.py process_outbox_and_holds`) tự động quét `reclaim_expired_holds()` mỗi 60 giây và gửi email HTML cho các bản ghi `OutboxEvent(published_at__isnull=True)`. | Hoàn tất P0 + Cấu hình SMTP | Đơn giữ chỗ quá 10 phút tự động chuyển sang `CANCELLED`/`EXPIRED` ngay cả khi không có lượt đặt mới; email vé điện tử được gửi tự động. |
| **P1-03** | `finance` | Xây dựng service `generate_operator_settlement` (`POST /api/v1/admin/settlements/generate`) tự động tổng hợp các `BookingItem` hoàn thành trong kỳ vào `Settlement` + `SettlementLine` và API xác nhận chi trả (`PAID`). | Hoàn tất P0 + Chốt `OPEN-08` (`CommissionAgreement`) | Gom đúng 100% `BookingItem` đã hoàn thành chưa đối soát trong kỳ; không bao giờ đưa 1 `BookingItem` vào 2 kỳ đối soát. |
| **P1-04** | `bookings`, `content` | Tạo model `SupportTicket` (bảng `support_tickets`) và API để khách hàng gửi phiếu yêu cầu hỗ trợ/khiếu nại, nhân viên nền tảng (`Platform Staff`) tiếp nhận và xử lý. | Hoàn tất P0 + Phê duyệt tạo bảng `support_tickets` | Khách tạo phiếu hỗ trợ gắn với mã đơn `booking_code`; `Platform Staff` (`is_staff=True`) cập nhật trạng thái `IN_PROGRESS` / `RESOLVED`. |
| **P1-05** | `frontend` | Cài đặt `react-router-dom` v7, `@reduxjs/toolkit`, `react-redux`, `qrcode.react`; tách URL routes cho từng màn hình và quản lý state/cache qua RTK Query (`ridewayApi`). | Hoàn tất P0 Backend + Phê duyệt sửa Frontend | `tsc -b && vite build` thành công; người dùng truy cập trực tiếp từng URL (`/`, `/my-tickets`, `/operator`, `/admin`) và dùng nút Back/Forward chuẩn. |
| **P1-06** | `frontend` | Cập nhật UI 4 Portals kết nối với toàn bộ các API P0 mới: ô chọn ngày đi trên thanh tìm kiếm, hiển thị `available_units` theo chặng, hiển thị QR SVG thật từ `qr_token`, và giao diện quản lý hãng/nhân viên/hành khách theo chuyến. | `P1-05` | Toàn bộ thao tác của Khách hàng, Hãng xe, Nhân viên và Admin thực hiện trọn vẹn trên giao diện Web responsive. |

---

## 2. BẢNG CÔNG VIỆC P2 (MỞ RỘNG THƯƠNG MẠI & HẠ TẦNG)

| Mã Task | Phân hệ | Công việc cần thực hiện | Phụ thuộc | Tiêu chí nghiệm thu (Acceptance Criteria) |
|---|---|---|---|---|
| **P2-01** | `bookings`, `frontend` | Hỗ trợ đặt vé khứ hồi (chọn chuyến đi + chuyến về, giữ chỗ nguyên tử cả 2 lượt trong 1 đơn, thanh toán gộp 1 mã VNPay QR). | Hoàn tất P1 | Giữ chỗ thành công cả 2 chiều hoặc rollback toàn bộ nếu 1 chiều hết chỗ. |
| **P2-02** | `bookings`, `finance` | Tự động hóa luồng đổi vé / đổi chuyến (`CancellationRequest.kind == 'CHANGE'`) kèm tính toán chênh lệch giá vé. | Chốt `OPEN-04` | Chuyển hành khách sang chuyến/phòng mới và giải phóng phòng cũ nguyên tử. |
| **P2-03** | `finance`, `bookings` | Hệ thống mã giảm giá (`Voucher`) theo sàn hoặc theo hãng xe. | Hoàn tất P1 | Áp dụng mã giảm giá hợp lệ khi thanh toán và ghi nhận chính xác vào kỳ đối soát. |
| **P2-04** | `content`, `catalog` | Đánh giá chuyến đi đã hoàn thành (`Ticket.status == 'USED'`) và lưu danh sách tuyến yêu thích. | Hoàn tất P1 | Chỉ khách hàng có vé `USED` mới gửi được đánh giá sao và nhận xét. |
| **P2-05** | `docker-compose.yml`, CI/CD | Đóng gói đầy đủ 4 containers (`postgres`, `backend`, `worker`, `frontend`) trong `docker-compose.yml` và cấu hình GitHub Actions CI. | Hoàn tất P1 | `docker compose up --build` khởi chạy toàn bộ hệ thống và CI tự động chạy test PostgreSQL trên mọi Pull Request. |
