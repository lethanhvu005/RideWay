# 05 — ĐÁNH GIÁ FRONTEND REACTJS & KIẾN TRÚC GIAO DIỆN (FRONTEND AUDIT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Thư mục Frontend:** `c:\ProjectCV\RideWay\frontend`  
**Stack hiện tại:** React 19.3.1 + TypeScript 7.0.2 + Vite 8.3.6  

---

## 1. KIỂM TRA CÔNG NGHỆ ĐÃ CÀI ĐẶT VÀ CHƯA CÀI ĐẶT

Đối chiếu trực tiếp từ [frontend/package.json](file:///c:/ProjectCV/RideWay/frontend/package.json#L1-L25):

| Công nghệ / Thư viện | Trạng thái trong `package.json` | Phiên bản hiện tại | Đánh giá & Khuyến nghị |
|---|---|---|---|
| **ReactJS (`react`, `react-dom`)** | **Đã cài đặt** | `^19.3.1` | Phiên bản mới nhất, biên dịch ổn định. |
| **TypeScript (`typescript`)** | **Đã cài đặt** | `~7.0.2` | `tsc -b` kiểm tra kiểu nghiêm ngặt (`strict: true`), pass 100%. |
| **Vite (`vite`, `@vitejs/plugin-react`)** | **Đã cài đặt** | `^8.3.6` | Đã cấu hình dev proxy `/api -> http://127.0.0.1:8000` trong [vite.config.ts](file:///c:/ProjectCV/RideWay/frontend/vite.config.ts). |
| **React Router (`react-router-dom`)** | **CHƯA CÀI ĐẶT** | — | Hiện đang dùng biến state `activePortal` (`'PUBLIC' \| 'MY_TICKETS' \| 'OPERATOR' \| 'ADMIN'`) trong [App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L120). Người dùng không thể bookmark URL riêng cho từng chuyến xe, trang thanh toán hay trang quản trị, và nút Back/Forward của trình duyệt không hoạt động theo trang. **Cần cài `react-router-dom` (v7).** |
| **Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)** | **CHƯA CÀI ĐẶT** | — | Hiện toàn bộ state (`currentUser`, `locations`, `trips`, `selectedMap`, `activeHold`) được giữ bằng `useState` cục bộ trong `App.tsx` và `PortalViews.tsx`. **Cần cài `@reduxjs/toolkit` và `react-redux`.** |
| **RTK Query (`@reduxjs/toolkit/query/react`)** | **CHƯA CÀI ĐẶT** | — | Hiện gọi API qua hàm wrapper `apiFetch` tự viết trong [src/api/client.ts](file:///c:/ProjectCV/RideWay/frontend/src/api/client.ts#L1-L50). Khi chuyển portal hoặc thao tác xong phải gọi `load()` thủ công, chưa có cơ chế tự động invalidate cache theo tag (`Trips`, `TripUnits`, `Bookings`, `Tickets`, `OperatorData`, `AdminData`). |
| **Thư viện sinh/quét QR (`qrcode.react`, `html5-qrcode`)** | **CHƯA CÀI ĐẶT** | — | Hiện đang vẽ khung QR mô phỏng bằng CSS grid (`.vx-qr-box`) trong [CheckoutFlowModal.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/CheckoutFlowModal.tsx#L254) và nhập chuỗi token bằng ô text khi check-in. |

---

## 2. PHÂN TÍCH KIẾN TRÚC COMPONENT & CẤU TRÚC THƯ MỤC HIỆN TẠI

Hiện tại mã nguồn trong `frontend/src/` gồm 11 files:
- [src/main.tsx](file:///c:/ProjectCV/RideWay/frontend/src/main.tsx): Điểm khởi chạy ứng dụng.
- [src/api/client.ts](file:///c:/ProjectCV/RideWay/frontend/src/api/client.ts#L1-L50): Hàm `apiFetch<T>()` tự động lấy CSRF cookie (`ensureCsrfCookie` qua `/api/v1/auth/csrf`) cho các request `POST`/`PUT`/`PATCH`/`DELETE` và đính kèm `credentials: 'include'`.
- [src/App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L1-L1183): Component gốc dài 1.183 dòng, kiêm nhiệm cả Topbar, Header, Hero Slider, Search Box, Tour Cards, Live 2-Deck Seat Map, Destinations, News, Footer và điều phối Modal.
- [src/components/AuthDialog.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/AuthDialog.tsx#L1-L77): Hộp thoại Đăng nhập / Đăng ký sử dụng phần tử `<dialog>` chuẩn HTML5, có kiểm tra khớp mật khẩu xác nhận và ẩn/hiện mật khẩu.
- [src/components/SeatLayout2Deck.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/SeatLayout2Deck.tsx#L1-L185): Sơ đồ chọn phòng/giường 2 tầng (`TẦNG 1` và `TẦNG 2` cạnh nhau), hỗ trợ chọn nhiều vị trí cùng lúc và điều chỉnh số người lớn (`1..max_adults`) + trẻ em (`0..max_children`) cho từng phòng đôi Limousine.
- [src/components/CheckoutFlowModal.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/CheckoutFlowModal.tsx#L1-L287): Luồng 3 bước sau khi giữ chỗ (`PASSENGERS` → `PAYMENT` → `TICKETS`), tích hợp đồng hồ đếm ngược 10 phút (`HoldTimer`) và nút mô phỏng callback VNPay IPN để kiểm thử luồng phát hành vé.
- [src/components/HoldTimer.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/HoldTimer.tsx#L1-L40): Đồng hồ đếm ngược thời gian thực tới `expiresAt`, tự động kích hoạt `onExpired` khi về `00:00`.
- [src/components/PortalViews.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/PortalViews.tsx#L1-L299): Chứa 3 portal: `MyTicketsPortal` (Vé của tôi & Yêu cầu hủy vé), `OperatorPortal` (Check-in QR, Báo giá đón riêng, Mở bán chuyến, Xem đối soát), và `AdminPortal` (KPI tổng sàn, Phê duyệt hãng xe, Duyệt kỳ đối soát).
- Hệ thống CSS: [src/styles/theme.css](file:///c:/ProjectCV/RideWay/frontend/src/styles/theme.css), [src/styles/account.css](file:///c:/ProjectCV/RideWay/frontend/src/styles/account.css), [src/styles/motion.css](file:///c:/ProjectCV/RideWay/frontend/src/styles/motion.css).

---

## 3. ĐÁNH GIÁ CHI TIẾT THEO 11 MÀN HÌNH NGHIỆP VỤ

| STT | Màn hình | File hiện tại | Trạng thái | Điểm đã làm tốt | Điểm còn thiếu / Cần cải tiến |
|---|---|---|---|---|---|
| 1 | **Trang chủ (`P-01`)** | [App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L320-L1152) | **Đã có mã nguồn** | Thiết kế đúng tinh thần MONA Tour / GoWilds: Topbar `#1C231F`, Header trắng sticky, Hero slider tràn viền, Thanh tìm kiếm 5 cột đè lên đáy Hero (`margin-top: -54px`), 5 thẻ hoạt động bo tròn, khối 18 năm kinh nghiệm, khối nền tối 6 tab tính năng, lưới điểm đến & tin tức. | Đang gộp chung toàn bộ vào `App.tsx` (1.183 dòng); các thẻ "Các chuyến xe & Tuyến đường thú vị" ([App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L753-L791)) đang hiển thị 4 card tĩnh thay vì render trực tiếp từ danh sách `trips` trả về từ API. |
| 2 | **Trang tìm chuyến (`P-02`)** | [App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L476-L571) | **Chưa hoàn thiện** | Đã có dropdown chọn Bến đi, Điểm đến (nạp từ `/api/v1/locations`) và Sắp xếp giá/giờ chạy. | Chưa có ô chọn **Ngày khởi hành (`<input type="date">`)** trên thanh tìm kiếm (`dateQuery` ở [App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L140) đang cố định là `''`!). Đang dùng preset chặng `SEGMENT_PRESETS` cứng (`0→1`, `1→2`, `0→2`, `0→3`) thay vì tự động suy ra `(from_sequence, to_sequence)` từ `from_location_id` và `to_location_id`. |
| 3 | **Trang chi tiết chuyến (`P-03`)** | Chưa tách riêng | **Chưa hoàn thiện** | Đã hiển thị tên hãng, tên tuyến và loại xe trong dropdown chọn chuyến. | Thiếu khung hiển thị lộ trình chi tiết từng trạm dừng (`TripStop` + giờ dự kiến), chính sách hủy vé của hãng và bảng giá theo loại phòng/giường. |
| 4 | **Trang chọn phòng/giường 2 tầng (`P-04`)** | [SeatLayout2Deck.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/SeatLayout2Deck.tsx#L1-L185) | **Đã kiểm thử thành công** | Hiển thị trực quan Tầng 1 & Tầng 2, phân biệt màu Còn trống / Đang chọn / Đã bán theo chặng, cho phép cấu hình số người lớn & trẻ em cho từng phòng đôi, tính tạm tính và tạo hold nguyên tử với `Idempotency-Key`. | Cần hiển thị thêm phụ phí trẻ em (`child_extra_amount`) ngay trên bảng cấu hình phòng để khách biết trước tổng tiền chính xác trước khi bấm Giữ chỗ. |
| 5 | **Trang nhập thông tin hành khách & đón trả (`P-05`, `P-06`)** | [CheckoutFlowModal.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/CheckoutFlowModal.tsx#L127-L237) | **Đã có mã nguồn** | Tự động sinh đúng số dòng form hành khách (`ADULT` và `CHILD`) theo số người đã chọn trên các phòng; hỗ trợ chọn đón cố định hoặc nhập địa chỉ đón riêng (`CUSTOM`) và chờ hãng báo giá. | Khi chọn `FIXED` ("Đón tại bến xuất phát"), chưa nạp danh sách `PickupOption` (`FIXED` / `ZONE`) thực tế của chuyến xe đó từ backend để khách chọn điểm trung chuyển cụ thể. |
| 6 | **Trang thanh toán VNPay QR (`P-07`)** | [CheckoutFlowModal.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/CheckoutFlowModal.tsx#L239-L265) | **Đã có mã nguồn** | Hiển thị mã tham chiếu `provider_reference`, số tiền 100%, đồng hồ đếm ngược 10 phút và nút giả lập Webhook VNPay IPN phục vụ demo/test. | Cần render mã QR thật bằng SVG (`qrcode.react`) từ `intent.qr_payload` và tự động polling `/api/v1/bookings/<id>/payment-status` mỗi 3 giây khi khách quét trên điện thoại. |
| 7 | **Trang quản lý vé & Đặt chỗ của tôi (`P-08`, `P-09`)** | [PortalViews.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/PortalViews.tsx#L28-L108) | **Đã có mã nguồn** | Liệt kê danh sách vé điện tử đã phát hành và danh sách đơn đặt kèm nút "Yêu cầu hủy vé". | Chưa hiển thị mã QR dạng hình ảnh trên từng thẻ vé điện tử; chưa có form nhập lý do hủy vé tùy chỉnh (đang gửi chuỗi cố định `'Khách hàng yêu cầu hủy vé trước giờ khởi hành'`); chưa có form tra cứu vé nhanh cho khách vãng lai. |
| 8 | **Dashboard Hãng xe (`O-01`..`O-06`)** | [PortalViews.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/PortalViews.tsx#L112-L216) | **Chưa hoàn thiện** | Đã có 4 chức năng thực tế: Soát vé QR (`POST /operators/me/check-in`), Báo giá điểm đón riêng (`PATCH /operators/me/pickup-requests/<id>/quote`), Mở bán chuyến `DRAFT -> OPEN`, và Xem bảng đối soát. | Thiếu giao diện Tạo phương tiện (`Vehicle`), Thiết kế sơ đồ giường/phòng (`SeatLayout` + `LayoutUnit`), Tạo tuyến & điểm dừng (`Route` + `RouteStop`), Tạo chuyến xe mới & cài đặt bảng giá chặng (`Trip` + `TripFare`), và Quản lý tài xế. |
| 9 | **Dashboard Nhân viên vận hành (`S-01`)** | Chưa tách khỏi Admin | **Chưa hoàn thiện** | Đã có danh sách yêu cầu hủy vé ở backend (`/api/v1/admin/cancellation-requests`). | Chưa có giao diện `StaffPortal` (hoặc tab trong Admin/Staff) để nhân viên vận hành xem và duyệt/từ chối các yêu cầu hủy vé (`CancellationRequest`), xem các đơn `PAID_CONFLICT_PENDING_REFUND` và quản lý bài viết CMS. |
| 10 | **Dashboard Admin (`A-01`..`A-04`)** | [PortalViews.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/PortalViews.tsx#L220-L298) | **Chưa hoàn thiện** | Đã có 4 thẻ KPI tổng quan, bảng Phê duyệt/Tạm ngưng hãng xe (`ACTIVE`/`SUSPENDED`), và nút Phê duyệt kỳ đối soát (`approve`). | Thiếu giao diện Cấu hình thỏa thuận hoa hồng (`CommissionAgreement`), Cấu hình chính sách nền tảng (`PolicyVersion` — như phụ phí trẻ em, thời gian cutoff hủy vé), Xem nhật ký kiểm toán (`AuditLog`) và Quản lý bài viết/điểm đến. |
| 11 | **Trang tin tức & Điểm đến du lịch (`P-10`, `P-11`)** | [App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L955-L1085), [L1165-L1178](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx#L1165-L1178) | **Đã có mã nguồn** | Nạp danh sách Điểm đến (`/api/v1/destinations`) và Bài viết (`/api/v1/posts`), mở modal đọc chi tiết bài viết qua `/api/v1/posts/<slug>`. | Khi bấm vào một thẻ Điểm đến nổi bật (ví dụ "Đà Nẵng"), nên tự động điền `toLocationId` tương ứng vào bộ lọc chuyến xe và cuộn xuống danh sách chuyến đi Đà Nẵng. |

---

## 4. ĐỀ XUẤT KIẾN TRÚC TÁI CẤU TRÚC FRONTEND (REACT ROUTER + REDUX TOOLKIT + RTK QUERY)

Không viết lại giao diện từ đầu; giữ nguyên toàn bộ hệ thống Design System (`theme.css`, `account.css`, `motion.css` với tông màu Trắng `#FFFFFF`, Xanh lá `#63AB45`, Đen rừng `#1C231F`, Cam `#F7921E`) và tách `App.tsx` thành kiến trúc module chuẩn:

```
frontend/src/
├── app/
│   ├── store.ts                 # Cấu hình Redux store
│   ├── hooks.ts                 # useAppDispatch, useAppSelector
│   └── router.tsx               # React Router v7 routes
├── services/
│   └── ridewayApi.ts            # RTK Query createApi (tagTypes: Auth, Trips, Units, Bookings, Tickets, Operator, Admin, Content)
├── features/
│   ├── auth/
│   │   ├── authSlice.ts         # Quản lý trạng thái đăng nhập & activeOperatorId
│   │   └── AuthDialog.tsx       # Giữ nguyên component hiện có, kết nối RTK Query
│   ├── public/
│   │   ├── HomePage.tsx         # Hero, SearchBar, ActivityGrid, About, DarkSection, Destinations, News
│   │   ├── TripSearchSection.tsx# Bộ lọc ngày đi, điểm đi/đến, loại xe, giá & sơ đồ 2 tầng
│   │   └── PostDetailModal.tsx
│   ├── booking/
│   │   ├── SeatLayout2Deck.tsx  # Giữ nguyên & hiển thị thêm phụ phí trẻ em
│   │   ├── CheckoutFlowModal.tsx# Giữ nguyên & nâng cấp SVG QR + polling trạng thái
│   │   └── HoldTimer.tsx
│   ├── customer/
│   │   └── MyTicketsPage.tsx    # Vé điện tử QR SVG, Lịch sử chuyến đi, Yêu cầu hủy vé, Hỗ trợ
│   ├── operator/
│   │   └── OperatorDashboard.tsx# Tabs: Đội xe & Sơ đồ, Tuyến & Chuyến, Tài xế, Đón trả, Check-in QR, Đối soát
│   └── admin/
│       └── AdminDashboard.tsx   # Tabs: KPI & Báo cáo, Hãng xe & Hoa hồng, Chính sách, Duyệt hủy/Hoàn tiền, CMS, Audit Logs
└── styles/
    ├── theme.css
    ├── account.css
    └── motion.css
```
