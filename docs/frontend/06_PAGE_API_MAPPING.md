# 06 — BẢNG ÁNH XẠ TRANG FRONTEND ↔ DJANGO REST API (PAGE–API MAPPING)

**Dự án:** RideWay – Vé Xuyên Việt  
**Base URL:** `/api/v1` (Tự động đọc `VITE_API_BASE_URL` khi triển khai khác domain trên Vercel)

---

## 1. Bảng Ánh xạ Chi tiết

| Trang Frontend (Route) | Component chính | API Endpoint (`/api/v1/...`) | Quyền (Permission) | Django Model |
|---|---|---|---|---|
| **Mọi trang** (Khởi tạo phiên) | `AuthInitializer` | `GET /auth/csrf`, `GET /me` | Public / Session | `User`, `OperatorMembership` |
| **Trang chủ** (`/`) | `HomePage` | `GET /locations`, `GET /trips`, `GET /destinations`, `GET /posts` | Public | `Location`, `Trip`, `Destination`, `ContentPost` |
| **Vé xe khách** (`/xe-khach`) | `BusLandingPage` | `GET /locations`, `GET /vehicle-types`, `GET /trips` | Public | `Location`, `VehicleType`, `Trip` |
| **Tìm chuyến xe** (`/xe-khach/tim-kiem`) | `BusSearchPage` | `GET /locations`, `GET /trips?from_location_id=&to_location_id=&departure_date=&from_sequence=&to_sequence=&sort=` | Public | `Trip`, `RouteStop`, `TripSegmentFare` |
| **Chi tiết chuyến** (`/xe-khach/chuyen/:tripId`) | `BusTripDetailPage` | `GET /trips/:tripId`, `GET /trips/:tripId/units` | Public | `Trip`, `Route`, `RouteStop`, `TripUnit` |
| **Chọn phòng/giường** (`/xe-khach/chuyen/:tripId/chon-cho`) | `BusSeatSelectionPage`, `SeatLayout2Deck` | `GET /trips/:tripId`, `GET /trips/:tripId/units?from_sequence=&to_sequence=`, `POST /holds` | Public xem sơ đồ / Auth khi giữ chỗ | `TripUnit`, `InventoryAllocation`, `Booking` |
| **Nhập hành khách** (`/dat-ve/:bookingId`) | `BookingCheckoutPage`, `HoldTimer` | `GET /bookings/:bookingId`, `PUT /bookings/:bookingId/passengers`, `POST /bookings/:bookingId/accept-quote` | Authenticated (Chủ đơn) | `Booking`, `BookingItem`, `BookingPassenger`, `BookingPickupRequest` |
| **Thanh toán** (`/dat-ve/:bookingId/thanh-toan`) | `BookingPaymentPage`, `HoldTimer` | `GET /bookings/:bookingId`, `POST /bookings/:bookingId/payment-intents`, `GET /bookings/:bookingId/payment-status` | Authenticated (Chủ đơn) | `PaymentIntent`, `PaymentAttempt`, `Booking` |
| **Kết quả thanh toán** (`/thanh-toan/ket-qua`) | `PaymentResultPage` | `GET /bookings/:bookingId/payment-status`, `GET /me/tickets` | Authenticated | `Booking`, `Ticket` |
| **Chi tiết vé** (`/ve/:ticketId`) | `TicketDetailPage` | `GET /me/tickets` (lọc theo `ticketId` hoặc `code`) | Authenticated | `Ticket`, `BookingItem` |
| **Hãng xe** (`/hang-xe`, `/hang-xe/:slug`) | `OperatorsListPage`, `OperatorDetailPage` | `GET /trips` (nhóm theo nhà xe mở bán & danh sách chuyến của hãng) | Public | `Operator`, `Trip` |
| **Điểm đến** (`/diem-den`, `/diem-den/:slug`) | `DestinationsListPage`, `DestinationDetailPage` | `GET /destinations`, `GET /locations`, `GET /trips` | Public | `Destination`, `Location`, `Trip` |
| **Tin tức** (`/tin-tuc`, `/tin-tuc/:slug`) | `NewsListPage`, `NewsDetailPage` | `GET /posts`, `GET /posts/:slug` | Public | `ContentPost` |
| **Đăng nhập / Đăng ký / Quên MK** (`/dang-nhap`, `/dang-ky`, `/quen-mat-khau`) | `LoginPage`, `RegisterPage`, `ForgotPasswordPage` | `POST /auth/login`, `POST /auth/register`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm` | Public | `User`, `PasswordResetToken` |
| **Hồ sơ tài khoản** (`/tai-khoan`) | `AccountProfilePage` | `GET /me`, `PATCH /me/profile`, `POST /auth/email-verification/request` | Authenticated | `User` |
| **Đơn hàng của tôi** (`/tai-khoan/don-hang`, `/tai-khoan/don-hang/:id`) | `AccountOrdersPage`, `AccountOrderDetailPage` | `GET /me/bookings`, `GET /bookings/:id`, `GET /me/tickets`, `POST /bookings/:id/cancellation-requests` | Authenticated | `Booking`, `Ticket`, `CancellationRequest` |
| **Dashboard Đối tác** (`/doi-tac/*`) | `Partner*Page` | `GET/POST /operators/register`, `GET/PATCH /operators/me`, `GET/POST /operators/me/memberships`, `GET/POST/PATCH /operators/me/vehicles`, `GET/POST /operators/me/layouts`, `GET/POST/PATCH /operators/me/routes`, `GET/POST/PATCH /operators/me/trips`, `PUT /operators/me/trips/:id/fares`, `GET /operators/me/trips/:id/passengers`, `GET /operators/me/booking-items`, `GET /operators/me/pickup-requests`, `POST /operators/me/pickup-requests/:id/quote`, `POST /operators/me/check-in`, `GET /operators/me/settlements`, `GET/POST /operators/me/policies` | Operator Member / Owner | `Operator`, `Vehicle`, `SeatLayoutTemplate`, `Route`, `Trip`, `Ticket`, `SettlementBatch` |
| **Dashboard Admin** (`/admin/*`) | `Admin*Page` | `GET /admin/reports/summary`, `GET /admin/operators`, `POST /admin/operators/:id/status`, `GET/POST /admin/operators/:id/memberships`, `GET /admin/trips`, `GET/POST /admin/cancellation-requests`, `POST /admin/cancellation-requests/:id/decision`, `GET /admin/refunds`, `POST /admin/refunds/:id/execute`, `GET /admin/settlements`, `POST /admin/settlements/:id/approve`, `GET/POST /admin/commission-agreements`, `GET/POST /admin/policies`, `GET/POST/PATCH /admin/posts`, `POST /admin/destinations`, `POST /admin/locations`, `POST /admin/vehicle-types`, `GET /admin/audit-logs` | Platform Staff / Admin (`is_staff` / `is_superuser`) | Toàn bộ models quản trị & `AuditLog` |

---

## 2. Ghi chú Minh bạch cho Dịch vụ Mở rộng (Máy bay, Tàu hỏa, Thuê xe)

- Các trang `/may-bay`, `/may-bay/tim-kiem`, `/tau-hoa`, `/tau-hoa/tim-kiem`, `/thue-xe`, `/thue-xe/danh-sach`, `/thue-xe/:id` là các khu vực dịch vụ mở rộng trong kiến trúc đa dịch vụ của RideWay.
- Tuân thủ nghiêm ngặt ràng buộc: **Không tạo giao dịch thanh toán giả hoặc lịch bay/tàu giả lập như dữ liệu thật**. Các trang này đọc danh sách tỉnh/thành phố thực từ `GET /api/v1/locations` và danh mục loại phương tiện từ `GET /api/v1/vehicle-types`, hiển thị rõ trạng thái tích hợp API đối tác và cung cấp biểu mẫu gửi yêu cầu báo giá/đặt xe hợp đồng hoặc gợi ý chuyển sang tuyến Xe khách & Limousine 2 tầng đang mở bán trực tuyến trên cùng hành trình.
