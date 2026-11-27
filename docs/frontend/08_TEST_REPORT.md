# 08 — BÁO CÁO KIỂM THỬ FRONTEND ĐA TRANG (TEST REPORT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Thời điểm kiểm thử:** 27/11/2026

---

## 1. Kết quả Kiểm thử Build & Kiểu dữ liệu TypeScript

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả |
|---|---|---|
| Kiểm tra kiểu TypeScript (`tsc -b`) | `.\node_modules\.bin\tsc -b` | **PASS (0 errors)** |
| Đóng gói Production (`vite build`) | `.\node_modules\.bin\vite build` | **PASS** (Tạo `dist/index.html` & bundles CSS/JS thành công) |
| Kiểm tra cấu hình Django Backend | `python manage.py check` | **PASS (0 issues)** |

---

## 2. Kết quả Kiểm thử Điều hướng, Luồng Đặt vé & Phân quyền

| Mã Kịch bản | Nội dung kiểm thử | Đường dẫn / API kiểm tra | Kết quả |
|---|---|---|---|
| **NAV-01** | Điều hướng Menu Header giữa các trang độc lập (không cuộn `#section`) | `/`, `/xe-khach`, `/may-bay`, `/tau-hoa`, `/thue-xe`, `/diem-den`, `/hang-xe`, `/tin-tuc` | **PASS** |
| **NAV-02** | Truy cập trực tiếp URL (Deep Linking), F5 Refresh & Nút Back/Forward | `/xe-khach/tim-kiem`, `/tin-tuc/:slug`, `/diem-den/:slug` | **PASS** |
| **NAV-03** | Trang 404 khi truy cập đường dẫn không tồn tại | `/duong-dan-khong-ton-tai` → `NotFoundPage` | **PASS** |
| **BUS-01** | Tìm kiếm & Lọc chuyến xe theo đoạn chặng `[from_sequence, to_sequence)` | `/xe-khach/tim-kiem` → `GET /api/v1/trips` | **PASS** |
| **BUS-02** | Xem chi tiết chuyến xe & danh sách trạm dừng theo thứ tự `sequence` | `/xe-khach/chuyen/:tripId` → `GET /api/v1/trips/:id` | **PASS** |
| **BUS-03** | Chọn vị trí phòng đôi Limousine / giường 2 tầng & Giữ chỗ nguyên tử 10 phút | `/xe-khach/chuyen/:tripId/chon-cho` → `GET /api/v1/trips/:id/units`, `POST /api/v1/holds` | **PASS** |
| **BOOK-01** | Nhập thông tin hành khách theo từng vị trí & yêu cầu đón trả | `/dat-ve/:bookingId` → `PUT /api/v1/bookings/:id/passengers` | **PASS** |
| **PAY-01** | Tạo mã thanh toán VNPay QR 100% & Đối chiếu trạng thái từ Backend | `/dat-ve/:bookingId/thanh-toan`, `/thanh-toan/ket-qua` → `POST /payment-intents`, `GET /payment-status` | **PASS** |
| **AUTH-01** | ProtectedRoute chuyển hướng khách chưa đăng nhập sang `/dang-nhap?redirect=...` | `/tai-khoan`, `/tai-khoan/don-hang`, `/dat-ve/:bookingId` | **PASS** |
| **ROLE-01** | Phân tách giao diện & kiểm tra quyền Dashboard Hãng xe và Dashboard Admin | `/doi-tac/*` (`PartnerLayout`), `/admin/*` (`AdminLayout`) | **PASS** |
