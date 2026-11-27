# 05 — HỆ THỐNG THIẾT KẾ GIAO DIỆN XANH BIỂN (OCEAN-BLUE UI/UX DESIGN SYSTEM)

**Thương hiệu:** Vé Xuyên Việt – RideWay  
**Định hướng thẩm mỹ:** Giao diện Xanh Biển đại dương (Vexere Ocean-Blue Theme) hiện đại, sáng sủa, gọn gàng, truyền cảm hứng du lịch xuyên Việt và tối ưu hóa chuyển đổi đặt vé.

---

## 1. Bảng Màu Thương hiệu Xanh Biển (Ocean-Blue Color Tokens)

Thiết lập tại `:root` trong `frontend/src/styles/theme.css`:

| Vai trò | Tên biến CSS | Mã màu Hex | Ứng dụng |
|---|---|---|---|
| Xanh biển đậm (Deep Ocean Navy) | `--gw-dark` / `--vx-primary-darker` | `#0D2E59` | Topbar, Footer, Sidebar đối tác/quản trị, Banner trang con |
| Xanh biển thương hiệu chính | `--gw-green` / `--vx-primary` | `#2474E5` | Nút hành động chính (CTA), Tab đang chọn, Giá vé, Icon điểm nhấn |
| Xanh biển trung đậm (Hover) | `--gw-green-dark` / `--vx-primary-dark` | `#1858B8` | Trạng thái hover nút chính, đường viền ghế đang chọn |
| Xanh biển nhạt nền | `--gw-green-light` / `--vx-surface` | `#E8F2FF` | Nền badge, trạng thái hover menu, nền khối tóm tắt đặt vé |
| Vàng cam điểm nhấn | `--gw-orange` | `#FFC700` | Nút Tìm kiếm nổi bật, Huy hiệu cam kết 150%, Đánh giá sao |
| Nền chính | `--gw-bg` / `--vx-bg` | `#FFFFFF` | Nền trang và bề mặt thẻ (Cards) |
| Nền phụ trung tính | `--gw-bg-soft` | `#F2F7FF` | Nền vùng bộ lọc, vùng danh sách kết quả |
| Chữ chính | `--gw-text` / `--vx-text` | `#0F1F38` | Tiêu đề và nội dung chính có độ tương phản cao (WCAG AA/AAA) |
| Chữ phụ | `--gw-muted` / `--vx-muted` | `#526580` | Nhãn phụ, mô tả thời gian, metadata |
| Cảnh báo / Lỗi | `--gw-danger` / `--vx-danger` | `#DC2626` | Cảnh báo hết hạn giữ chỗ, lỗi xác thực hoặc từ chối giao dịch |

---

## 2. Typography & Phân cấp Chữ

- **Font stack:** `'Inter', 'Roboto', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif`.
- **Tiêu đề Hero (`H1`):** `clamp(28px, 3.8vw, 46px)`, `font-weight: 800`, `line-height: 1.18`.
- **Tiêu đề Section / Trang (`H2`):** `clamp(22px, 2.5vw, 30px)`, `font-weight: 800`, `letter-spacing: -0.015em`.
- **Tiêu đề Thẻ chuyến xe / Điểm đến (`H3`):** `18px–20px`, `font-weight: 700`.
- **Hiển thị Giá vé & Thời gian:** Sử dụng `font-variant-numeric: tabular-nums` để các cột số tiền (`450.000₫`) và giờ khởi hành (`08:00`) luôn thẳng hàng tuyệt đối.

---

## 3. Hệ thống Menu Header Đa Trang & Responsive

- **Cấu trúc Menu Desktop:**
  `Logo (Vé Xuyên Việt – RideWay) | Trang chủ (/) | Xe khách (/xe-khach) | Máy bay (/may-bay) | Tàu hỏa (/tau-hoa) | Thuê xe (/thue-xe) | Khám phá (Dropdown: Điểm đến, Hãng xe, Giới thiệu, Liên hệ) | Tin tức (/tin-tuc) | Tài khoản (/tai-khoan, /tai-khoan/don-hang, /doi-tac, /admin)`
- **Trạng thái Active tự động:** Sử dụng `<NavLink>` của React Router để tự động tô sáng mục menu tương ứng với URL hiện tại bằng tông xanh biển `#2474E5` / `#E8F2FF`.
- **Menu Di động (Mobile Drawer `<= 1200px`):** Nút Hamburger mở ngăn kéo điều hướng toàn màn hình, kích thước vùng chạm tối thiểu `44x44px`, hỗ trợ đóng tự động khi chuyển route.
