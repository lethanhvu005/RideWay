<!--
Sync Impact Report
- Version change: 2.1.0 -> 2.2.0
- Modified principles: Retained Core Principles I–VIII (v2.1.0) and aligned wording with SRS v0.2/v0.3/v0.4 precedence rules (v0.4 overrides v0.3 UI colors; v0.3 used for UI/UX structure; v0.2 as historical baseline).
- Added sections / content:
  - Stack và trạng thái quyết định (explicitly separating Đã chốt vs Đề xuất)
  - Quy tắc chất lượng và nghiệm thu (C-01..C-08)
  - Các điều cấm suy diễn từ tài liệu (v0.3 blue color, deposit/COD, 1,000 visits/day, unapproved QR provider)
- Preserved sections:
  - Danh sách quyết định chưa xác nhận phải bảo lưu (OPEN-01..OPEN-10)
  - Governance
- Follow-up TODOs:
  - Resolve OPEN-01..OPEN-10 in docs/DECISIONS_PENDING.md before production implementation.
  - Approve proposed technical choices (DRF, Modular Monolith, Redis + Celery, Django session cookie + CSRF, Docker/Nginx).
-->

# RideWay / Vé Xuyên Việt Constitution

## Core Principles

### I. Nguồn sự thật và tính truy vết
SRS v0.4 (`Ve_Xuyen_Viet_SRS_v0_4_Giai_doan_4.docx`) là nguồn ưu tiên cao nhất cho nghiệp vụ và cơ sở dữ liệu; SRS v0.3 dùng tham khảo UI/UX (trừ các quyết định bị v0.4 thay thế); SRS v0.2 là nền tảng lịch sử. Chỉ coi yêu cầu ghi `ĐÃ CHỐT` là chính thức; mọi `OPEN` hoặc giả định luôn giữ trạng thái `CHỜ CHỐT`. Mọi user story, API, model và task MUST truy ngược được về FR/BR hoặc quyết định kiến trúc (`C-01`). Dự án MUST chỉ dùng một bộ hợp đồng API có phiên bản và MUST NOT tự ý thêm endpoint không có lý do.

### II. Công nghệ và kiến trúc
Stack đã chốt gồm **Django**, **ReactJS** (desktop-first, responsive) và **PostgreSQL**; các lựa chọn **Django REST Framework**, **Modular Monolith**, **Redis + Celery** (không phải nguồn tồn kho), **Django session cookie cùng domain + CSRF**, và **Docker/Nginx** là `Đề xuất` chờ duyệt. Tuyệt đối MUST NOT đặt logic tồn chỗ, tính giá tiền, kiểm tra sức chứa hay phân quyền ở ReactJS; mọi xác minh MUST thực hiện tại Django Backend. Không coi `django_reference/` trong ZIP v0.4 là code production; MUST có migrations và kiểm thử PostgreSQL thật trước khi triển khai.

### III. An toàn giao dịch và nhất quán dữ liệu (NON-NEGOTIABLE)
Tồn kho MUST quản lý theo `sellable unit` (phòng/giường) và đoạn tuyến `[from_sequence, to_sequence)` trên PostgreSQL; tuyệt đối MUST NOT bán trùng trên các chặng giao nhau. Giữ chỗ có thời hạn đúng 10 phút với `expires_at` do Backend cấp và thu hồi `HELD -> EXPIRED` trong transaction (React timer chỉ để hiển thị); giữ nhiều phòng trong một đơn MUST tuân theo nguyên tắc all-or-nothing. QR UI không phải bằng chứng trả tiền: vé chỉ được phát hành sau khi thanh toán **100%** được xác minh qua nhà cung cấp đáng tin cậy, webhook chống lặp idempotent, và tiền đến muộn sau khi mất chỗ MUST chuyển `EXCEPTION`. Hệ thống MUST snapshot giá, phụ phí, chính sách và tỷ lệ hoa hồng tại thời điểm giao dịch; không tin tổng tiền gửi từ React.

### IV. Phân quyền và bảo vệ dữ liệu (NON-NEGOTIABLE)
Khách hàng MUST xác thực bằng email và mật khẩu trước khi tạo đơn. Quyền Admin nền tảng, nhân viên nền tảng, hãng xe, nhân viên hãng và khách hàng MUST được kiểm tra ở mọi API Django Backend; mọi dữ liệu hãng xe MUST lọc theo `operator_id` / `operator membership` và chặn truy cập chéo đối tượng (IDOR), không dựa vào ẩn nút UI. Hệ thống MUST bảo vệ PII hành khách và hành khách trẻ em, ghi `audit_logs` cho thao tác nhạy cảm, không lưu thông tin thẻ và tuyệt đối MUST NOT đưa bí mật của payment provider lên Frontend.

### V. Thiết kế và khả năng sử dụng
Thương hiệu chính thức là **Vé Xuyên Việt**; giao diện khách hàng desktop-first, responsive, dùng bảng màu chủ đạo **trắng và xanh lá** (đã thay thế gam xanh dương của SRS v0.3). Hệ thống MUST hỗ trợ tìm vé rẻ, lọc hãng/chuyến, sơ đồ phòng/giường 2 tầng rõ số chỗ, checkout từng bước, tin tức/điểm du lịch/CMS, trạng thái loading/error/empty đầy đủ và không chỉ dùng màu để biểu thị trạng thái (`C-07`). Tham khảo bố cục tinh thần MONA Tour nhưng tuyệt đối MUST NOT sao chép logo, hình ảnh, mã nguồn hay tài sản độc quyền.

### VI. Chất lượng, kiểm thử và vận hành
Hệ thống MUST có kiểm thử đơn vị và kiểm thử tích hợp trên PostgreSQL thật cho: đặt trùng chỗ/chặng (`C-03`), all-or-nothing nhiều phòng và hết hạn 10 phút (`C-04`), webhook lặp không phát hành vé trùng (`C-05`), thanh toán muộn vào `EXCEPTION` (`C-06`), và chặn truy cập chéo hãng/người dùng (`C-02`). API MUST có validation, mã lỗi chuẩn, phân trang, idempotency và OpenAPI đồng bộ với implementation. Chỉ đánh dấu `COMPLETE` khi có đủ code + test + review + bằng chứng chạy (`C-08`). Trước production MUST kiểm tra bảo mật, khả năng phục hồi, observability và backup.

### VII. Quản lý yêu cầu chưa chốt & Các điều cấm suy diễn
Tuyệt đối MUST NOT tự đặt giá trị mặc định cho độ tuổi trẻ em, mức phụ phí, tỷ lệ hoa hồng, chính sách hoàn tiền, phụ phí đón/trả riêng hay chu kỳ thanh toán. Chính sách riêng của hãng bị giới hạn bởi khung nền tảng; không tự động hoàn tiền hoặc duyệt đối soát khi thiếu cấu hình hợp lệ. Ngoài ra, tuyệt đối MUST NOT:
- Lấy gam xanh dương của bản UI v0.3 làm màu chủ đạo (v0.4 đã chốt trắng/xanh lá).
- Đưa đặt cọc hoặc thu tiền sau vào MVP (v0.4 ghi ngoài phạm vi).
- Tự giả định `1.000 lượt truy cập` là mỗi ngày (đơn vị thời gian chưa chốt) hoặc tự công bố SLA/uptime/concurrency khi chưa đo kiểm.
- Tự chọn một payment provider cụ thể khi chưa có hợp đồng/giải pháp được duyệt.

### VIII. Quy trình phát triển
Mỗi tính năng MUST đi theo chuỗi Spec-Kit: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → `/speckit-converge`. Mọi task MUST nêu rõ đường dẫn file và điều kiện nghiệm thu; trước khi merge MUST kiểm tra migrations, OpenAPI, phân quyền, test, review code và bảo mật.

## Stack và trạng thái quyết định

| Thành phần | Công nghệ / nguyên tắc | Trạng thái |
|------------|------------------------|------------|
| Backend | Django + Django REST Framework | Đã chốt Django; DRF trong kiến trúc đề xuất |
| Frontend | ReactJS; desktop-first; responsive | Đã chốt React và desktop-first |
| Database | PostgreSQL | Đã chốt |
| Kiến trúc | Modular Monolith chia domain | Đề xuất v0.4 |
| Jobs / Cache | Redis + Celery; không là nguồn tồn kho | Đề xuất |
| Bảo mật phiên | Django session cookie cùng domain + CSRF | Đề xuất, chưa duyệt |
| Triển khai | Docker, Nginx, monitoring, backup | Đề xuất |
| UI thương hiệu | Vé Xuyên Việt; trắng/xanh lá | Đã chốt mới nhất |

## Quy tắc chất lượng và nghiệm thu

- **C-01**: Có traceability `FR ↔ API ↔ model ↔ test`.
- **C-02**: Tất cả API dữ liệu riêng chặn truy cập chéo hãng và người dùng.
- **C-03**: Kiểm thử đồng thời trên PostgreSQL cho đặt cùng chỗ/chặng.
- **C-04**: Kiểm thử all-or-nothing khi chọn nhiều phòng, giữ chỗ hết hạn.
- **C-05**: Webhook gọi lặp không phát hành vé trùng.
- **C-06**: Thanh toán muộn xử lý trạng thái `EXCEPTION`; không suy đoán đã thành công.
- **C-07**: Giao diện có `loading`/`error`/`empty` và không chỉ dùng màu để biểu thị trạng thái.
- **C-08**: Chỉ đánh dấu `COMPLETE` sau khi có code + test + review + bằng chứng chạy.

## Danh sách quyết định chưa xác nhận phải bảo lưu

| Mã | Câu hỏi | Ảnh hưởng | Trạng thái |
|----|---------|-----------|------------|
| OPEN-01 | Trẻ em tính đến bao nhiêu tuổi? Có cần cung cấp ngày sinh/giấy tờ? | Tính giá/sức chứa | Chưa chốt |
| OPEN-02 | Mức/phương pháp phụ phí trẻ em theo hãng, phòng và chặng? | Báo giá, checkout | Chưa chốt |
| OPEN-03 | Nhà cung cấp QR nào; cơ chế webhook/xác nhận giao dịch và phí? | Thanh toán thật | Chưa chốt |
| OPEN-04 | Thời điểm ngừng chấp nhận thanh toán khi hold gần hết 10 phút? | Giao dịch đến muộn | Chưa chốt |
| OPEN-05 | Khung hủy, đổi, phí và hoàn tiền; hãng được tùy chỉnh tới đâu? | Refund | Chưa chốt |
| OPEN-06 | Tỷ lệ hoa hồng theo hãng, cơ sở tính, chu kỳ chuyển tiền? | Settlement | Chưa chốt |
| OPEN-07 | Phụ phí và thời hạn hãng xác nhận địa chỉ đón/trả tự nhập? | Pickup | Chưa chốt |
| OPEN-08 | Xác minh email, khôi phục mật khẩu, chính sách phiên đăng nhập? | Auth | Chưa chốt |
| OPEN-09 | 1.000 lượt truy cập là theo ngày/tháng; mức tải đồng thời? | Sizing/hiệu năng | Chưa chốt |
| OPEN-10 | Hủy chuyến/đổi lịch và xử lý thông báo cho khách? | Vận hành | Chưa chốt |

Quy tắc: MUST NOT thay những dòng trên bằng tỷ lệ, số tuổi hoặc thời gian tùy ý. Các mục liên quan giao dịch/tiền cần người chịu trách nhiệm nghiệp vụ phê duyệt trước khi triển khai thật.

## Governance

Hiến pháp này chuẩn hóa từ SRS v0.2, v0.3 và v0.4; khi có mâu thuẫn, quyết định mới trong SRS v0.4 được ưu tiên, còn các lựa chọn kỹ thuật đề xuất không mặc nhiên là yêu cầu đã duyệt. Mọi Pull Request và review code MUST xác minh tuân thủ 8 nguyên tắc cốt lõi, các điều cấm suy diễn và tiêu chí `C-01`..`C-08`.

Quy tắc đánh phiên bản tuân theo Semantic Versioning (`MAJOR.MINOR.PATCH`):
- **MAJOR**: Thay đổi không tương thích ngược, loại bỏ hoặc định nghĩa lại các nguyên tắc cốt lõi.
- **MINOR**: Bổ sung nguyên tắc, cổng chất lượng hoặc bảng trạng thái quyết định mới.
- **PATCH**: Làm rõ câu chữ, sửa lỗi chính tả hoặc tinh chỉnh không làm thay đổi ngữ nghĩa.

Mọi sửa đổi Hiến pháp MUST nêu rõ lý do, cập nhật lịch sử phiên bản và rà soát tác động lên `spec.md`, `plan.md` và `tasks.md`.

**Version**: 2.2.0 | **Ratified**: 2026-11-24 | **Last Amended**: 2026-11-24
