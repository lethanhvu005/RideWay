# 01 — BÁO CÁO RÀ SOÁT HIỆN TRẠNG FRONTEND (FRONTEND AUDIT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Thời điểm rà soát:** 27/11/2026  
**Phạm vi:** `frontend/`, `backend/*/urls.py`, `backend/backend/frontend.py`, `specs/001-bus-ticket-marketplace/`

---

## 1. Tổng quan cấu trúc Frontend trước khi tái cấu trúc

Trước khi chuyển đổi sang kiến trúc website nhiều trang (Multi-Page SPA với React Router & Redux Toolkit), thư mục `frontend/` có cấu trúc như sau:

- `frontend/package.json`:
  - Sử dụng **React 19.3.1**, **TypeScript 7.0.2**, **Vite 8.3.6**.
  - **Chưa cài đặt** `react-router-dom`, `@reduxjs/toolkit`, `react-redux`.
- `frontend/src/main.tsx`:
  - Mount trực tiếp `<App />` vào `#root`, chưa có `BrowserRouter` hay Redux `<Provider>`.
- `frontend/src/App.tsx` (1.668 dòng):
  - Gom toàn bộ giao diện công khai (Hero slider, form tìm kiếm, tuyến phổ biến, danh sách kết quả chuyến xe, bộ lọc, sơ đồ chọn phòng/giường 2 tầng, ưu điểm nền tảng, điểm đến, tin tức, carousel khám phá, thống kê, đánh giá khách hàng) vào **một trang duy nhất**.
  - Chuyển đổi giữa khu vực Khách hàng (`PUBLIC`), Đơn hàng của tôi (`MY_TICKETS`), Hãng xe (`OPERATOR`), Quản trị sàn (`ADMIN`) bằng biến state nội bộ `activePortal` thay vì URL độc lập.
  - Thanh menu điều hướng chính sử dụng các liên kết neo (`#popular-routes`, `#booking-map`, `#about`, `#destinations`, `#news`) để cuộn trong cùng một trang.
- `frontend/src/api/client.ts`:
  - Hàm `apiFetch<T>` và `ensureCsrf()` gọi `/api/v1/auth/csrf` và tự động đính kèm cookie phiên (`credentials: 'include'`) cùng header `X-CSRFToken` cho các request `POST`, `PUT`, `PATCH`, `DELETE`.
- `frontend/src/components/`:
  - `SeatLayout2Deck.tsx`: Component sơ đồ chọn phòng đôi Limousine (`CABIN`) và giường nằm 2 tầng (`BED`) theo từng đoạn chặng `[from_sequence, to_sequence)`.
  - `HoldTimer.tsx`: Bộ đếm ngược thời gian giữ chỗ 10 phút từ `hold_expires_at` của Backend.
  - `CheckoutFlowModal.tsx`: Modal 3 bước (Nhập hành khách & đón/trả → Tạo mã thanh toán VNPay QR 100% → Kiểm tra trạng thái phát hành vé điện tử).
  - `AuthDialog.tsx`: Hộp thoại `<dialog>` đăng nhập / đăng ký.
  - `PortalViews.tsx`: Chứa 3 component `MyTicketsPortal`, `OperatorPortal`, `AdminPortal`.

---

## 2. Đánh giá 6 hạng mục theo yêu cầu

### 2.1. Những trang đã tồn tại vs. Chưa tách URL riêng
- Trước khi nâng cấp, ứng dụng chỉ có **1 URL duy nhất (`/`)**.
- Người dùng không thể truy cập trực tiếp `/xe-khach`, `/xe-khach/tim-kiem`, `/xe-khach/chuyen/:tripId`, `/diem-den`, `/tin-tuc/:slug`, `/dang-nhap`, `/tai-khoan/don-hang`, `/doi-tac`, `/admin` hoặc dùng nút **Back / Forward** của trình duyệt để quay lại bước trước.

### 2.2. Những chức năng đã triển khai
- Tìm kiếm chuyến xe khách & Limousine 2 tầng theo điểm đi, điểm đến, ngày đi và đoạn chặng `[from_sequence, to_sequence)`.
- Xem sơ đồ phòng/giường 2 tầng thời gian thực (`GET /api/v1/trips/:id/units`).
- Giữ chỗ nguyên tử 10 phút (`POST /api/v1/holds` kèm `Idempotency-Key`).
- Cập nhật danh sách hành khách theo từng đơn vị chỗ và yêu cầu đón/trả (`PUT /api/v1/bookings/:id/passengers`).
- Khởi tạo giao dịch thanh toán VNPay QR 100% (`POST /api/v1/bookings/:id/payment-intents`) và kiểm tra trạng thái (`GET /api/v1/bookings/:id/payment-status`).
- Tra cứu danh sách đơn đặt vé (`GET /api/v1/me/bookings`), vé điện tử QR (`GET /api/v1/me/tickets`), gửi yêu cầu hủy vé (`POST /api/v1/bookings/:id/cancellation-requests`).
- Cổng Đối tác nhà xe (`/operators/me/*`) và Cổng Quản trị sàn (`/admin/*`).

### 2.3. Những Django REST API đang hoạt động (45+ Endpoints)
- **Accounts (`/api/v1/`)**: `auth/csrf`, `auth/register`, `auth/login`, `auth/logout`, `auth/password-reset/request`, `auth/password-reset/confirm`, `me`, `me/profile`, `me/operators`, `operators/register`, `operators/me`, `operators/me/memberships`, `admin/operators`, `admin/operators/:id/status`, `admin/operators/:id/memberships`.
- **Fleet (`/api/v1/`)**: `vehicle-types`, `admin/vehicle-types`, `operators/me/vehicles`, `operators/me/vehicles/:id`, `operators/me/layouts`, `operators/me/layouts/:id/units`.
- **Catalog (`/api/v1/`)**: `locations`, `admin/locations`, `trips`, `trips/:id`, `trips/:id/units`, `operators/me/routes`, `operators/me/routes/:id`, `operators/me/routes/:id/stops`, `operators/me/trips`, `operators/me/trips/:id`, `operators/me/trips/:id/fares`, `operators/me/trips/:id/status`, `operators/me/trips/:id/passengers`, `operators/me/pickup-options`, `admin/trips`.
- **Bookings (`/api/v1/`)**: `holds`, `bookings/:id`, `bookings/:id/passengers`, `bookings/:id/accept-quote`, `me/bookings`, `operators/me/booking-items`, `operators/me/pickup-requests`, `operators/me/pickup-requests/:id/quote`.
- **Payments (`/api/v1/`)**: `bookings/:id/payment-intents`, `bookings/:id/payment-status`, `webhooks/payments/:provider`, `me/tickets`, `operators/me/check-in`.
- **Finance (`/api/v1/`)**: `bookings/:id/cancellation-requests`, `operators/me/settlements`, `operators/me/policies`, `admin/settlements`, `admin/settlements/:id/approve`, `admin/policies`, `admin/commission-agreements`, `admin/cancellation-requests`, `admin/cancellation-requests/:id/decision`, `admin/refunds`, `admin/refunds/:id/execute`.
- **Content (`/api/v1/`)**: `destinations`, `posts`, `posts/:slug`, `admin/destinations`, `admin/posts`, `admin/posts/:id`, `admin/audit-logs`, `admin/reports/summary`, `health/live`, `health/ready`.

### 2.4. Những Component có thể tái sử dụng
- `SeatLayout2Deck.tsx`: Tái sử dụng trực tiếp cho trang Chọn chỗ `/xe-khach/chuyen/:tripId/chon-cho`.
- `HoldTimer.tsx`: Tái sử dụng cho trang Nhập thông tin hành khách `/dat-ve/:bookingId` và Thanh toán `/dat-ve/:bookingId/thanh-toan`.
- `api/client.ts`: Tái sử dụng cơ chế CSRF token + Session Cookie làm base query cho RTK Query (`services/ridewayApi.ts`).

### 2.5. Những chức năng cần tách trang & bổ sung
- Tách Trang chủ (`/`) thành trang giới thiệu, tìm kiếm và điều hướng gọn gàng — không nhồi danh sách kết quả, sơ đồ 2 tầng và thanh toán vào Trang chủ.
- Xây dựng đầy đủ hệ thống trang độc lập cho **Vé xe khách** (`/xe-khach`, `/xe-khach/tim-kiem`, `/xe-khach/chuyen/:tripId`, `/xe-khach/chuyen/:tripId/chon-cho`), **Đặt vé & Thanh toán** (`/dat-ve/:bookingId`, `/dat-ve/:bookingId/thanh-toan`, `/thanh-toan/ket-qua`, `/ve/:ticketId`), **Máy bay** (`/may-bay`, `/may-bay/tim-kiem`), **Tàu hỏa** (`/tau-hoa`, `/tau-hoa/tim-kiem`), **Thuê xe** (`/thue-xe`, `/thue-xe/danh-sach`, `/thue-xe/:id`), **Hãng xe** (`/hang-xe`, `/hang-xe/:slug`), **Điểm đến** (`/diem-den`, `/diem-den/:slug`), **Tin tức** (`/tin-tuc`, `/tin-tuc/:slug`), **Thông tin** (`/gioi-thieu`, `/lien-he`, `/dieu-khoan`, `/chinh-sach`), **Tài khoản** (`/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/tai-khoan`, `/tai-khoan/don-hang`, `/tai-khoan/don-hang/:id`), **Dashboard Đối tác** (`/doi-tac/*`) và **Dashboard Admin** (`/admin/*`).

### 2.6. Danh sách File cần chỉnh sửa & bổ sung
- Cập nhật: `frontend/package.json`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `frontend/src/index.css`, `frontend/src/styles/theme.css`.
- Tạo mới:
  - `frontend/src/app/store.ts`, `frontend/src/app/router.tsx`, `frontend/src/app/providers.tsx`
  - `frontend/src/services/ridewayApi.ts`
  - `frontend/src/features/auth/authSlice.ts`, `frontend/src/features/buses/searchSlice.ts`, `frontend/src/features/booking/bookingSlice.ts`
  - `frontend/src/layouts/PublicLayout.tsx`, `AccountLayout.tsx`, `PartnerLayout.tsx`, `AdminLayout.tsx`
  - Toàn bộ các trang trong `frontend/src/pages/**` và `frontend/vercel.json`.
