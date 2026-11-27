# 04 — KIẾN TRÚC FRONTEND REACTJS, REDUX TOOLKIT & RTK QUERY

**Dự án:** RideWay – Vé Xuyên Việt  
**Stack:** React 19 + TypeScript + Vite 8 + React Router + Redux Toolkit + RTK Query

---

## 1. Cấu trúc Thư mục Chuẩn hóa (`frontend/src/`)

```text
frontend/src/
├── app/
│   ├── store.ts              # Cấu hình Redux Store + RTK Query middleware
│   ├── router.tsx            # Cấu hình toàn bộ Nested Routes & Layouts
│   └── providers.tsx         # Bọc Provider Redux + BrowserRouter + AuthInitializer
├── layouts/
│   ├── PublicLayout.tsx      # Header điều hướng đa trang, Breadcrumb & Footer
│   ├── AccountLayout.tsx     # Sidebar tài khoản hành khách + Outlet
│   ├── PartnerLayout.tsx     # Sidebar dành riêng cho Hãng xe đối tác + Outlet
│   └── AdminLayout.tsx       # Sidebar dành riêng cho Quản trị viên sàn + Outlet
├── pages/
│   ├── HomePage.tsx
│   ├── buses/                # BusLandingPage, BusSearchPage, BusTripDetailPage, BusSeatSelectionPage
│   ├── booking/              # BookingCheckoutPage, BookingPaymentPage, PaymentResultPage, TicketDetailPage
│   ├── flights/              # FlightsLandingPage, FlightsSearchPage
│   ├── railways/             # RailwaysLandingPage, RailwaysSearchPage
│   ├── rentals/              # RentalsLandingPage, RentalsListPage, RentalDetailPage
│   ├── operators/            # OperatorsListPage, OperatorDetailPage
│   ├── destinations/         # DestinationsListPage, DestinationDetailPage
│   ├── news/                 # NewsListPage, NewsDetailPage
│   ├── info/                 # AboutPage, ContactPage, TermsPage, PolicyPage, NotFoundPage
│   ├── account/              # LoginPage, RegisterPage, ForgotPasswordPage, AccountProfilePage, AccountOrdersPage, AccountOrderDetailPage
│   ├── partner/              # 9 trang chuyên biệt dưới /doi-tac/*
│   └── admin/                # 10 trang chuyên biệt dưới /admin/*
├── components/
│   ├── common/               # ProtectedRoute, ScrollToTop, ErrorBoundary, PageHeader
│   ├── search/               # MultiServiceSearchBox (Xe khách, Máy bay, Tàu hỏa, Thuê xe)
│   ├── SeatLayout2Deck.tsx   # Sơ đồ chọn phòng đôi & giường 2 tầng
│   └── HoldTimer.tsx         # Đồng hồ đếm ngược 10 phút từ Backend
├── features/
│   ├── auth/authSlice.ts     # Lưu trạng thái phiên người dùng từ GET /api/v1/me
│   ├── buses/searchSlice.ts  # Bộ lọc tìm kiếm chuyến xe chia sẻ giữa các trang
│   └── booking/bookingSlice.ts # Lưu tham chiếu bookingId / lựa chọn ghế tạm thời
├── services/
│   └── ridewayApi.ts         # RTK Query API slice tích hợp CSRF token & Session Cookie
├── hooks/
│   └── useAppStore.ts        # Typed hooks: useAppDispatch, useAppSelector
├── types/
│   └── models.ts             # Định nghĩa kiểu dữ liệu TypeScript đồng bộ với OpenAPI
└── styles/
    ├── theme.css             # Design System tokens (#166534, #16A34A, #F0FDF4) & Multi-page layouts
    ├── account.css           # Styles cho trang đăng nhập/đăng ký & hồ sơ
    └── motion.css            # Hiệu ứng chuyển trang & carousel
```

---

## 2. Nguyên tắc Phân tách Trách nhiệm (Separation of Concerns)

1. **Backend là Nguồn Sự Thật Duy Nhất (Single Source of Truth)**:
   - Redux (`bookingSlice`, `searchSlice`) chỉ lưu bộ lọc tìm kiếm và trạng thái điều hướng giữa các bước.
   - **Tình trạng chỗ trống** (`GET /api/v1/trips/:id/units`), **khóa giữ chỗ 10 phút** (`POST /api/v1/holds`), **tổng giá thanh toán** (`GET /api/v1/bookings/:id`), và **trạng thái phát hành vé điện tử** (`GET /api/v1/bookings/:id/payment-status`) đều bắt buộc lấy trực tiếp từ Django + PostgreSQL Backend.
2. **Bảo mật Phiên & CSRF (`services/ridewayApi.ts`)**:
   - Không lưu token nhạy cảm trong `localStorage`.
   - Mọi request qua RTK Query đều sử dụng `credentials: 'include'` và tự động gọi `/api/v1/auth/csrf` để gắn header `X-CSRFToken` cho các phương thức thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`).
3. **Phân quyền Route (`ProtectedRoute.tsx`)**:
   - Kiểm tra trạng thái xác thực từ `/api/v1/me`.
   - Nếu khách chưa đăng nhập khi truy cập `/dat-ve/:bookingId` hoặc `/tai-khoan/*`, hệ thống tự động chuyển hướng sang `/dang-nhap?redirect=<duong_dan_hien_tai>` để sau khi đăng nhập xong sẽ quay lại đúng bước đặt vé đang thực hiện.
   - Các route `/doi-tac/*` kiểm tra quyền thành viên hãng xe (`memberships.length > 0` hoặc `is_superuser`) và hiển thị hướng dẫn đăng ký mở bán nếu tài khoản chưa gắn với hãng xe.
   - Các route `/admin/*` kiểm tra `is_staff || is_superuser`; nếu người dùng thường truy cập sẽ được chuyển tới trang thông báo phân quyền phù hợp.
