# 02 — PHÂN TÍCH WEBSITE THAM KHẢO (VEXERE & MONA TOUR)

**Dự án:** RideWay – Vé Xuyên Việt  
**Website tham khảo:**
1. **Vexere:** https://vexere.com/
2. **MONA Tour:** https://mona-tour.monamedia.net/

---

## 1. Phân tích Kiến trúc Trải nghiệm Đặt vé từ Vexere (`vexere.com`)

### 1.1. Thanh điều hướng chính & Chuyển đổi dịch vụ vận tải
- **Header tách biệt rõ ràng**: Logo thương hiệu bên trái, cụm menu dịch vụ trọng tâm (**Xe khách**, **Máy bay**, **Tàu hỏa**, **Thuê xe**) ở trung tâm, cùng lối tắt **Đơn hàng của tôi**, **Mở bán trên sàn**, **Hotline 24/7** và nút **Đăng nhập / Tài khoản** bên phải.
- **Mỗi dịch vụ có landing page & URL riêng**: Khi người dùng chọn từng loại hình vận tải, hệ thống điều hướng sang route chuyên biệt hoặc tab tìm kiếm tương ứng thay vì cuộn xuống một trang dài.

### 1.2. Luồng đặt vé nhiều bước độc lập (Multi-Step Booking Funnel)
1. **Trang chủ / Trang dịch vụ (`/`, `/xe-khach`)**: Tập trung vào khung tìm kiếm nổi bật (Điểm đi, Điểm đến, Ngày đi, Chặng), các tuyến đường phổ biến, nhà xe tiêu biểu và cam kết chất lượng ("Chắc chắn có chỗ — Hoàn 150%").
2. **Trang kết quả tìm kiếm (`/xe-khach/tim-kiem`)**:
   - Bố cục 2 cột trên Desktop: Cột trái là **Bộ lọc cố định (Sticky Filter Sidebar)** gồm Sắp xếp giá/giờ đi, Khung giờ xuất phát (Sáng sớm, Buổi sáng, Buổi chiều, Buổi tối), Loại xe/khoang (Limousine Phòng đôi, Giường nằm 2 tầng), Nhà xe đối tác.
   - Cột phải là danh sách **Thẻ chuyến xe ngang (Horizontal Trip Cards)** hiển thị rõ Timeline Giờ khởi hành → Thời gian di chuyển → Điểm trả, đánh giá sao, giá vé đúng theo đoạn chặng và số phòng/giường còn trống.
3. **Trang chi tiết chuyến (`/xe-khach/chuyen/:tripId`)**: Hiển thị lộ trình các trạm dừng theo thứ tự `sequence`, chính sách hủy/đổi vé, tiện ích khoang xe và bảng giá theo chặng.
4. **Trang chọn chỗ 2 tầng (`/xe-khach/chuyen/:tripId/chon-cho`)**: Sơ đồ trực quan Tầng 1 (Dưới) và Tầng 2 (Trên), phân biệt màu sắc giữa vị trí còn trống, đang chọn và đã khóa/bán; cho phép cấu hình số người lớn + trẻ em trong từng phòng đôi (`2NL + 1TE`) trước khi bấm **Giữ chỗ 10 phút**.
5. **Trang nhập thông tin hành khách (`/dat-ve/:bookingId`)**: Hiển thị đồng hồ đếm ngược 10 phút (`HoldTimer`), form điền tên/số điện thoại hành khách cho từng phòng/giường và chọn điểm đón/trả (bến cố định, vùng trung chuyển hoặc địa chỉ riêng cần báo giá).
6. **Trang thanh toán VNPay QR (`/dat-ve/:bookingId/thanh-toan`) & Kết quả (`/thanh-toan/ket-qua`)**: Hiển thị mã QR thanh toán 100%, mã tham chiếu giao dịch và trạng thái đối chiếu từ Backend.

---

## 2. Phân tích Phong cách Trình bày Du lịch từ MONA Tour (`mona-tour.monamedia.net`)

### 2.1. Bố cục Trang chủ & Hình ảnh Du lịch
- **Hero Banner rộng, hình ảnh thiên nhiên và hành trình sắc nét**: Kết hợp tiêu đề giàu cảm hứng, badge điểm nhấn và khung tìm kiếm nổi bật ngay chân banner.
- **Khoảng trắng & Typography hiện đại**: Sử dụng phông chữ không chân (`Inter` / `Roboto`) có độ tương phản cao, phân cấp rõ giữa Kicker pill, Heading `H1/H2` và nội dung mô tả.
- **Thẻ Điểm đến & Carousel Khám phá**: Các thẻ ảnh bo góc lớn (`border-radius: 12px–16px`), lớp phủ gradient tối dần về phía dưới giúp chữ trắng và nút hành động (`+`) nổi bật trên nền ảnh phong cảnh Việt Nam (Hà Nội, Cố đô Huế, Đà Nẵng, TP.HCM).
- **Trang Danh mục & Chi tiết Điểm đến / Tin tức**:
  - Trang danh sách (`/diem-den`, `/tin-tuc`) bố cục dạng lưới 3–4 cột kèm bộ lọc chuyên mục.
  - Trang chi tiết (`/diem-den/:slug`, `/tin-tuc/:slug`) có ảnh bìa lớn, breadcrumb điều hướng, nội dung bài viết dễ đọc và gợi ý các tuyến xe đi qua điểm đến đó.

---

## 3. Nguyên tắc Tổng hợp cho Hệ thống Thiết kế RideWay

- **Kết hợp thế mạnh của cả hai nền tảng**:
  - Học hỏi **kiến trúc luồng đặt vé nhiều trang, bộ lọc 2 cột và thẻ lịch trình rõ ràng** của **Vexere**.
  - Học hỏi **cách trình bày điểm đến, cẩm nang du lịch, khoảng trắng thoáng đãng và bảng màu xanh lá thiên nhiên (`#166534` / `#16A34A` / `#F0FDF4`)** theo yêu cầu Design System của **RideWay – Vé Xuyên Việt**.
- **Tài sản thiết kế độc lập**: Toàn bộ mã nguồn ReactJS, hệ thống CSS token, icon và bố cục component được xây dựng riêng cho RideWay, không sao chép mã nguồn hay tài sản thương hiệu độc quyền của bên thứ ba.
