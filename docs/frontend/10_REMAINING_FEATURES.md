# 10 — CÁC TÍNH NĂNG CÒN LẠI & LỘ TRÌNH MỞ RỘNG BACKEND (REMAINING FEATURES)

**Dự án:** RideWay – Vé Xuyên Việt

---

## 1. Các hạng mục đã hoàn thành 100% trên Frontend & Backend hiện tại

- Toàn bộ luồng **Vé xe khách & Limousine 2 tầng** từ Tìm kiếm theo đoạn chặng (`[from_sequence, to_sequence)`), Lọc chuyến, Xem chi tiết lộ trình trạm, Chọn vị trí phòng đôi (`2NL + 1TE`) / giường nằm trên sơ đồ 2 tầng, Giữ chỗ nguyên tử 10 phút, Nhập hành khách, Tạo giao dịch VNPay QR 100%, Đối chiếu phát hành vé điện tử HMAC QR đến Yêu cầu hoàn/hủy vé.
- Toàn bộ 38+ routes độc lập trên React Router với 4 Layout riêng biệt (`PublicLayout`, `AccountLayout`, `PartnerLayout`, `AdminLayout`), tích hợp Redux Toolkit & RTK Query.

---

## 2. Các hạng mục cần mở rộng Backend API trong giai đoạn tiếp theo

Để tuân thủ nguyên tắc **không tự tạo dữ liệu giao dịch giả trên Frontend**, các tính năng mở rộng sau đây được ghi nhận rõ để phát triển Backend API khi có kết nối đối tác thực tế:

1. **Tích hợp API Đối tác Hàng không (GDS / Aggregator) cho `/may-bay`**:
   - Hiện tại `/may-bay` và `/may-bay/tim-kiem` cung cấp giao diện tra cứu hành trình và biểu mẫu đăng ký nhận báo giá/tư vấn, đồng thời gợi ý chuyển sang tuyến Xe Limousine 2 tầng đang mở bán thật.
   - Cần bổ sung Django app `flights` kết nối API nhà cung cấp được cấp phép khi triển khai bán vé máy bay thật.
2. **Tích hợp API Đối tác Đường sắt cho `/tau-hoa`**:
   - Hiện tại `/tau-hoa` và `/tau-hoa/tim-kiem` hiển thị thông tin ga tàu Bắc – Nam và form đăng ký hỗ trợ vé tàu đoàn/affiliate.
   - Cần bổ sung kết nối API đối tác đường sắt chính thức trước khi mở thanh toán trực tuyến cho vé tàu hỏa.
3. **API Lưu Yêu cầu Báo giá Thuê xe Hợp đồng (`/thue-xe`)**:
   - Hiện tại `/thue-xe`, `/thue-xe/danh-sach`, `/thue-xe/:id` đọc danh sách địa điểm (`/api/v1/locations`) và loại phương tiện (`/api/v1/vehicle-types`) từ Backend.
   - Có thể bổ sung endpoint `POST /api/v1/rentals/inquiries` ở Backend để lưu trữ trực tiếp các phiếu yêu cầu thuê xe nguyên chuyến vào bảng cơ sở dữ liệu riêng cho bộ phận điều hành.
4. **Endpoint Chi tiết Hãng xe Công khai (`GET /api/v1/operators/:slug`)**:
   - Hiện tại trang `/hang-xe` và `/hang-xe/:slug` tổng hợp danh sách hãng xe đang có chuyến mở bán từ `GET /api/v1/trips`.
   - Có thể bổ sung endpoint công khai `GET /api/v1/operators` và `GET /api/v1/operators/:slug` ở Backend để trả về thêm ảnh bìa, mô tả giới thiệu hãng và thống kê số lượng đánh giá của từng nhà xe.
