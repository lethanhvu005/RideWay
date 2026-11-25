# 02 — CẢI TIẾN CƠ SỞ DỮ LIỆU POSTGRESQL (DATABASE IMPROVEMENTS)

**Dự án:** RideWay – Vé Xuyên Việt  
**Hệ quản trị CSDL:** PostgreSQL 16 + Extension `btree_gist`  

---

## 1. ĐÁNH GIÁ SCHEMA HIỆN TẠI (34 BẢNG TRÊN 8 DJANGO APPS)

Hệ thống hiện có 34 bảng PostgreSQL sử dụng khóa chính `UUIDField` (`BaseRecord`), đảm bảo các nguyên tắc toàn vẹn cốt lõi:
- **Khóa ngoại (`ForeignKey` / `OneToOneField`):** Sử dụng `on_delete=models.PROTECT` trên toàn bộ các thực thể giao dịch tài chính và vận hành (`Operator`, `VehicleType`, `SeatLayout`, `Location`, `Route`, `Vehicle`, `RouteStop`, `LayoutUnit`, `TripUnit`, `Booking`, `BookingItem`, `PaymentIntent`, `Settlement`) để ngăn xóa nhầm dữ liệu lịch sử.
- **Chống đặt trùng theo đoạn chặng (`inventory.InventoryAllocation`):**
  - Cột `section = IntegerRangeField()` lưu đoạn nửa mở `[from_sequence, to_sequence)`.
  - Ràng buộc `ExclusionConstraint` (`exclude_active_unit_sections`) sử dụng chỉ mục GiST (`btree_gist`) trên `(trip_unit =, section &&)` với điều kiện `status IN ('HELD', 'CONFIRMED', 'BLOCKED')`.
- **Khóa duy nhất của giá vé theo chặng (`catalog.TripFare`):**
  - `UniqueConstraint(fields=['trip', 'from_sequence', 'to_sequence', 'unit_kind'], name='uq_trip_segment_unit_fare')` kết hợp `CheckConstraint(to_sequence > from_sequence)` và `CheckConstraint(base_amount > 0)`.

---

## 2. CÁC RÀNG BUỘC & CHỈ MỤC POSTGRESQL BỔ SUNG TRONG P0

Để đảm bảo toàn vẹn dữ liệu tuyệt đối ở tầng PostgreSQL mà không làm hỏng dữ liệu hiện có, hệ thống bổ sung các ràng buộc và chỉ mục sau qua migrations chuẩn:

### 2.1. App `fleet` (`fleet.LayoutUnit`)
1. **Chống trùng tọa độ vị trí trên sơ đồ xe (`uq_layout_unit_grid_coord`):**
   - `UniqueConstraint(fields=['layout', 'deck', 'row_number', 'column_number'], name='uq_layout_unit_grid_coord')`
   - Ngăn chặn việc tạo 2 phòng/giường khác mã nhưng nằm chồng lên cùng một ô `(tầng, hàng, cột)` trên sơ đồ xe.
2. **Kiểm tra sức chứa hợp lệ (`ck_layout_unit_capacity`):**
   - `CheckConstraint(condition=(Q(max_adults__isnull=True) | Q(max_adults__gte=1)) & (Q(max_children__isnull=True) | Q(max_children__gte=0)), name='ck_layout_unit_capacity')`
   - Đảm bảo không có vị trí nào được cấu hình `max_adults = 0`.

### 2.2. App `finance` (`finance.CommissionAgreement` & `finance.SettlementLine`)
1. **Thứ tự ngày hiệu lực thỏa thuận hoa hồng (`ck_commission_date_order`):**
   - `CheckConstraint(condition=Q(effective_to__isnull=True) | Q(effective_to__gte=F('effective_from')), name='ck_commission_date_order')`
   - Ngăn chặn lỗi nhập ngày kết thúc hiệu lực nhỏ hơn ngày bắt đầu.
2. **Chống thanh quyết toán trùng một hạng mục đặt chỗ ở nhiều kỳ đối soát (`uq_settlement_line_single_booking_item`):**
   - `UniqueConstraint(fields=['booking_item'], name='uq_settlement_line_single_booking_item')`
   - Ràng buộc cũ `uq_settlement_line (settlement, booking_item)` chỉ ngăn trùng trong *cùng 1 kỳ đối soát*. Ràng buộc mới đảm bảo mỗi `BookingItem` chỉ được đưa vào đối soát đúng 1 lần duy nhất trên toàn hệ thống.

### 2.3. App `content` (`content.AuditLog` & `content.OutboxEvent`)
1. **Chỉ mục tra cứu nhật ký kiểm toán theo đối tượng (`ix_audit_resource_lookup`):**
   - `Index(fields=['resource_type', 'resource_id', '-created_at'], name='ix_audit_resource_lookup')`
   - Tăng tốc truy vấn lịch sử thay đổi trạng thái của một `Booking`, `Ticket`, `Operator` hoặc `Settlement`.
2. **Chỉ mục quét sự kiện Outbox chưa phát hành (`ix_outbox_unpublished`):**
   - `Index(fields=['published_at', 'created_at'], name='ix_outbox_unpublished')`
   - Giúp tiến trình phát hành thông báo quét tức thì các sự kiện có `published_at IS NULL`.

---

## 3. KIỂM TRA TƯƠNG THÍCH DỮ LIỆU & MIGRATION AN TOÀN

- Toàn bộ các ràng buộc và chỉ mục trên đều là **additive migrations** (không xóa cột, không đổi kiểu dữ liệu phá hủy, không dùng `--fake`).
- Trước khi áp dụng migration lên PostgreSQL 16 (`rideway-postgres`), dữ liệu hiện có trong 34 bảng đã được kiểm tra không có bản ghi nào vi phạm tọa độ `(layout, deck, row_number, column_number)` hoặc trùng `booking_item` trong `settlement_lines`.
