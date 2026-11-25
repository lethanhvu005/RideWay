# 03 — KIỂM TOÁN CƠ SỞ DỮ LIỆU POSTGRESQL 16 (DATABASE AUDIT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Hệ quản trị CSDL:** PostgreSQL 16 (`postgres:16-alpine` trong `docker-compose.yml`)  
**Extension bắt buộc:** `btree_gist` ([inventory/migrations/0001_enable_btree_gist.py](file:///c:/ProjectCV/RideWay/backend/inventory/migrations/0001_enable_btree_gist.py))  
**Tổng số bảng nghiệp vụ:** 34 bảng (trải trên 8 Django Apps, tất cả kế thừa `BaseRecord` với khóa chính `UUIDField`).

---

## 1. ĐỐI CHIẾU 34 BẢNG HIỆN TẠI VỚI ERD & DATA DICTIONARY

Toàn bộ 34 bảng trong đặc tả [data-model.md](file:///c:/ProjectCV/RideWay/specs/001-bus-ticket-marketplace/data-model.md) đã được ánh xạ đầy đủ 1:1 vào PostgreSQL 16 qua 8 migration files:

| STT | Tên bảng PostgreSQL | Django Model (`app.Model`) | Khóa chính | Khóa ngoại (FK / OneToOne) | Unique / Check / Exclusion Constraints | Indexes |
|---|---|---|---|---|---|---|
| 1 | `users` | `accounts.User` | `id (UUID)` | — | `email UNIQUE` | `ix_users_email` |
| 2 | `operators` | `accounts.Operator` | `id (UUID)` | — | — | PK |
| 3 | `operator_memberships` | `accounts.OperatorMembership` | `id (UUID)` | `user_id → users (CASCADE)`, `operator_id → operators (CASCADE)` | `uq_operator_user (operator, user)` | FK indexes |
| 4 | `vehicle_types` | `fleet.VehicleType` | `id (UUID)` | — | `code UNIQUE` | PK |
| 5 | `seat_layouts` | `fleet.SeatLayout` | `id (UUID)` | `operator_id → operators (CASCADE)` | `ck_layout_deck_count (deck_count BETWEEN 1 AND 2)` | FK index |
| 6 | `layout_units` | `fleet.LayoutUnit` | `id (UUID)` | `layout_id → seat_layouts (CASCADE)` | `uq_layout_unit_code (layout, unit_code)`, `ck_layout_unit_deck (1..2)` | FK index |
| 7 | `vehicles` | `fleet.Vehicle` | `id (UUID)` | `operator_id → operators (CASCADE)`, `type_id → vehicle_types (PROTECT)`, `layout_id → seat_layouts (PROTECT)` | `uq_registration_operator (operator, registration)` | FK indexes |
| 8 | `locations` | `catalog.Location` | `id (UUID)` | — | — | PK |
| 9 | `routes` | `catalog.Route` | `id (UUID)` | `operator_id → operators (CASCADE)` | — | FK index |
| 10 | `route_stops` | `catalog.RouteStop` | `id (UUID)` | `route_id → routes (CASCADE)`, `location_id → locations (PROTECT)` | `uq_route_stop_sequence (route, sequence)` | FK indexes |
| 11 | `trips` | `catalog.Trip` | `id (UUID)` | `route_id → routes (PROTECT)`, `vehicle_id → vehicles (PROTECT)` | — | `ix_trip_status_departure (status, departure_at)`, `ix_trip_route (route)` |
| 12 | `trip_stops` | `catalog.TripStop` | `id (UUID)` | `trip_id → trips (CASCADE)`, `route_stop_id → route_stops (PROTECT)` | `uq_trip_stop_sequence (trip, sequence)` | FK indexes |
| 13 | `trip_units` | `catalog.TripUnit` | `id (UUID)` | `trip_id → trips (CASCADE)`, `layout_unit_id → layout_units (PROTECT)` | `uq_trip_unit_code (trip, unit_code)` | FK indexes |
| 14 | `trip_fares` | `catalog.TripFare` | `id (UUID)` | `trip_id → trips (CASCADE)` | `ck_fare_positive_section (to_sequence > from_sequence)`, `ck_fare_base_positive (base_amount > 0)`, `uq_trip_segment_unit_fare (trip, from_sequence, to_sequence, unit_kind)` | `ix_trip_fare_lookup (trip, from_sequence, to_sequence, unit_kind)` |
| 15 | `pickup_options` | `catalog.PickupOption` | `id (UUID)` | `operator_id → operators (CASCADE)`, `route_stop_id → route_stops (CASCADE)` | `ck_pickup_option_fee_nonneg (fee >= 0 OR fee IS NULL)` | FK indexes |
| 16 | `inventory_allocations` | `inventory.InventoryAllocation` | `id (UUID)` | `trip_unit_id → trip_units (CASCADE)`, `booking_item_id → booking_items (CASCADE, NULL)` | `ExclusionConstraint: exclude_active_unit_sections (trip_unit =, section &&) WHERE status IN ('HELD','CONFIRMED','BLOCKED')` | GIST index + `ix_hold_expiry (status, expires_at)` |
| 17 | `bookings` | `bookings.Booking` | `id (UUID)` | `customer_id → users (PROTECT)` | `booking_code UNIQUE`, `idempotency_key UNIQUE`, `ck_booking_total_nonneg (total_amount >= 0)` | `ix_booking_customer_created (customer, created_at)` |
| 18 | `booking_items` | `bookings.BookingItem` | `id (UUID)` | `booking_id → bookings (CASCADE)`, `trip_unit_id → trip_units (PROTECT)` | `ck_item_positive_section (to_sequence > from_sequence)`, `ck_item_unit_price_nonneg`, `ck_item_child_surcharge_nonneg` | FK indexes |
| 19 | `booking_passengers` | `bookings.BookingPassenger` | `id (UUID)` | `booking_id → bookings (CASCADE)` | — | FK index |
| 20 | `booking_item_passengers` | `bookings.BookingItemPassenger` | `id (UUID)` | `booking_item_id → booking_items (CASCADE)`, `passenger_id → booking_passengers (CASCADE)` | `uq_item_passenger (booking_item, passenger)` | FK indexes |
| 21 | `pickup_requests` | `bookings.PickupRequest` | `id (UUID)` | `booking_item_id → booking_items (CASCADE)`, `pickup_option_id → pickup_options (SET_NULL, NULL)` | `ck_pickup_req_fee_nonneg (fee >= 0 OR fee IS NULL)` | FK indexes |
| 22 | `payment_intents` | `payments.PaymentIntent` | `id (UUID)` | `booking_id → bookings (CASCADE)` | `uq_provider_intent (provider, provider_reference)`, `ck_payment_intent_amount_pos (amount > 0)` | `ix_payment_intent_booking (booking, status)` |
| 23 | `payment_transactions` | `payments.PaymentTransaction` | `id (UUID)` | `intent_id → payment_intents (CASCADE)` | `uq_payment_provider_event (intent, provider_event_id)`, `ck_payment_tx_amount_nonneg (amount >= 0)` | FK index |
| 24 | `tickets` | `payments.Ticket` | `id (UUID)` | `booking_item_id → booking_items (OneToOne, PROTECT)`, `checked_in_by_id → users (SET_NULL, NULL)` | `code UNIQUE`, `qr_token_hash UNIQUE`, `booking_item_id UNIQUE` | PK + Unique indexes |
| 25 | `policy_versions` | `finance.PolicyVersion` | `id (UUID)` | `operator_id → operators (CASCADE, NULL)` | `uq_platform_policy_version (scope, version) WHERE operator IS NULL`, `uq_operator_policy_version (operator, version) WHERE operator IS NOT NULL` | Partial unique indexes |
| 26 | `cancellation_requests` | `finance.CancellationRequest` | `id (UUID)` | `booking_id → bookings (CASCADE)`, `requested_by_id → users (PROTECT)` | — | FK indexes |
| 27 | `refunds` | `finance.Refund` | `id (UUID)` | `booking_id → bookings (CASCADE)`, `request_id → cancellation_requests (SET_NULL, NULL)` | `ck_refund_amount_nonneg (amount >= 0)` | FK indexes |
| 28 | `commission_agreements` | `finance.CommissionAgreement` | `id (UUID)` | `operator_id → operators (CASCADE)` | `ck_commission_pct ((percentage >= 0 AND percentage <= 100) OR percentage IS NULL)` | FK index |
| 29 | `settlements` | `finance.Settlement` | `id (UUID)` | `operator_id → operators (PROTECT)` | `ck_settlement_period (period_end >= period_start)`, `ck_settlement_gross_nonneg (gross_amount >= 0)` | FK index |
| 30 | `settlement_lines` | `finance.SettlementLine` | `id (UUID)` | `settlement_id → settlements (CASCADE)`, `booking_item_id → booking_items (PROTECT)` | `uq_settlement_line (settlement, booking_item)` | FK indexes |
| 31 | `destinations` | `content.Destination` | `id (UUID)` | `location_id → locations (SET_NULL, NULL)` | `slug UNIQUE` | Unique index |
| 32 | `posts` | `content.Post` | `id (UUID)` | `author_id → users (PROTECT)` | `slug UNIQUE` | `ix_post_published_at (is_published, published_at)` |
| 33 | `audit_logs` | `content.AuditLog` | `id (UUID)` | `actor_id → users (SET_NULL, NULL)` | — | FK index |
| 34 | `outbox_events` | `content.OutboxEvent` | `id (UUID)` | — | — | PK |

---

## 2. PHÂN TÍCH CHUYÊN SÂU BÀI TOÁN BÁN VÉ THEO CHẶNG & GIỮ CHỖ 10 PHÚT

### 2.1. Mô hình toán học khoảng nửa mở `[from_sequence, to_sequence)`

Giả sử tuyến xe có 4 điểm dừng theo thứ tự `sequence`:
- `A` (`sequence = 0`) → `B` (`sequence = 1`) → `C` (`sequence = 2`) → `D` (`sequence = 3`).

Khi lưu vào cột `section` kiểu `int4range` (`IntegerRangeField` trong [inventory/models.py](file:///c:/ProjectCV/RideWay/backend/inventory/models.py#L31)):
- `psycopg.types.range.Range(from_sequence, to_sequence, '[)')` biểu diễn khoảng nửa mở `[from_sequence, to_sequence)`.
- **Trường hợp 1 (Chặng giao nhau / Xung đột):**
  - Khách 1 đặt `A → C` tương ứng `[0, 2)` (tập số nguyên `{0, 1}`).
  - Khách 2 đặt `B → D` tương ứng `[1, 3)` (tập số nguyên `{1, 2}`).
  - Toán tử `&&` (`RangeOperators.OVERLAPS`) trên PostgreSQL kiểm tra `[0, 2) && [1, 3) = TRUE` (giao nhau tại đoạn `[1, 2)` tức chặng `B → C`).
  - Ràng buộc `exclude_active_unit_sections` lập tức từ chối lệnh `INSERT` thứ hai với lỗi `IntegrityError` (`exclusion_violation`), được `create_atomic_hold` bắt và chuyển thành `HoldConflictError` (HTTP 409).
- **Trường hợp 2 (Chặng liền kề / Cho phép bán tiếp):**
  - Khách 1 đặt `A → B` tương ứng `[0, 1)` (tập `{0}`).
  - Khách 2 đặt `B → C` tương ứng `[1, 2)` (tập `{1}`).
  - Vì cận trên `1` của `[0, 1)` là mở `)`, hai khoảng `[0, 1)` và `[1, 2)` **không giao nhau**: `[0, 1) && [1, 2) = FALSE`.
  - PostgreSQL cho phép cả hai bản ghi cùng tồn tại ở trạng thái `HELD` hoặc `CONFIRMED` trên cùng một `trip_unit`.

### 2.2. Đánh giá cơ chế Giữ chỗ 10 phút, Hết hạn & Đặt đồng thời (Concurrency)

Trong [bookings/services.py](file:///c:/ProjectCV/RideWay/backend/bookings/services.py#L51-L162), hàm `create_atomic_hold` xử lý giữ chỗ theo trình tự:

```python
with transaction.atomic():
    reclaim_expired_holds(now=now)
    ...
    units_map = {
        str(u.id): u
        for u in TripUnit.objects.select_for_update()
        .filter(trip=trip, id__in=requested_ids)
        .order_by('id')
    }
```

**Đánh giá ưu điểm:**
1. **Chống Deadlock khi giữ nhiều phòng cùng lúc:** Truy vấn `TripUnit.objects.select_for_update().filter(...).order_by('id')` khóa các hàng `TripUnit` theo thứ tự tăng dần của UUID `id`. Nếu Khách X giữ `(P01, P02)` và Khách Y đồng thời giữ `(P02, P01)`, cả hai transaction đều xin khóa theo cùng thứ tự UUID nên không xảy ra deadlock vòng tròn.
2. **Hai tầng bảo vệ (Defense-in-Depth):**
   - Tầng 1: Khóa bi quan `SELECT ... FOR UPDATE` trên `TripUnit` tuần tự hóa các giao dịch cạnh tranh trên cùng phòng/giường.
   - Tầng 2: Ràng buộc mức CSDL `ExclusionConstraint` (`btree_gist`) trên bảng `inventory_allocations` đảm bảo ngay cả khi có bất kỳ code path nào quên `select_for_update()`, PostgreSQL vẫn chặn tuyệt đối việc cấp trùng đoạn chặng.
3. **Thu hồi tại chỗ (In-transaction Lazy Reclamation):** Gọi `reclaim_expired_holds(now=now)` ngay đầu `transaction.atomic()` đảm bảo nếu một hold cũ đã quá hạn 10 phút nhưng chưa có cronjob dọn, khách mới vào đặt đúng phòng đó sẽ tự động chuyển hold cũ sang `EXPIRED` và chiếm chỗ thành công (`T04` đã kiểm chứng).

**Các lỗ hổng / điểm cần cải tiến trong cơ chế hiện tại:**
1. **Vấn đề hiển thị sơ đồ ghế khi hold quá hạn chưa được dọn:**
   - Trong `TripUnitsView.get` ([catalog/views.py](file:///c:/ProjectCV/RideWay/backend/catalog/views.py#L104-L112)), truy vấn đã có `.exclude(status='HELD', expires_at__lte=now)` nên sơ đồ ghế vẫn hiển thị đúng là "Còn trống".
   - Tuy nhiên bảng `bookings` vẫn giữ `status='HOLDING'` cho đến khi có một lệnh `create_atomic_hold` mới chạy. Nếu khách mở trang "Vé của tôi", đơn quá hạn vẫn hiện là `HOLDING` thay vì `EXPIRED`. Cần bổ sung periodic job/command chạy `reclaim_expired_holds()` mỗi phút và kiểm tra hạn ngay khi đọc đơn.
2. **Nguy cơ Race Condition giữa `reclaim_expired_holds()` và `process_vnpay_ipn()` (Kịch bản `T06` - Late Webhook):**
   - Trong `process_vnpay_ipn` ([payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L84-L163)), hệ thống khóa `PaymentIntent` và `Booking` bằng `select_for_update()`, sau đó kiểm tra:
     ```python
     expired_or_ late = (
         booking.status == 'EXPIRED'
         or (booking.status == 'HOLDING' and booking.hold_expires_at <= now)
     )
     ```
   - Nếu `expired_or_late` là `True`, hệ thống kiểm tra xem các `TripUnit` của đơn có bị người khác giữ/mua chồng lên đoạn `[from_sequence, to_sequence)` hay chưa (`conflict`). Nếu chưa có ai đặt chồng nhưng `InventoryAllocation` của đơn này đã bị chuyển sang `EXPIRED`, dòng [L162](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L162) thực hiện:
     ```python
     InventoryAllocation.objects.filter(booking_item__booking=booking).update(
         status='CONFIRMED', expires_at=None, updated_at=now
     )
     ```
   - **Điểm tốt:** Nếu trong tích tắc đó một khách khác vừa tạo allocation mới gây xung đột, lệnh `.update(status='CONFIRMED')` sẽ bị PostgreSQL `ExclusionConstraint` chặn lại. Tuy nhiên `process_vnpay_ipn` hiện **chưa bọc lệnh `.update(status='CONFIRMED')` trong `try ... except IntegrityError:`** để chuyển sang nhánh `PAID_CONFLICT_PENDING_REFUND`! Cần bọc `try/except IntegrityError` tại đây để xử lý an toàn tuyệt đối khi xảy ra đua tranh mili-giây giữa webhook trễ và khách đặt mới.

---

## 3. RÀNG BUỘC & INDEX CẦN BỔ SUNG TRÊN CÁC BẢNG HIỆN CÓ

Trước khi nghĩ đến việc tạo bảng mới, cần bổ sung 5 ràng buộc và chỉ mục còn thiếu trên 34 bảng hiện có:

1. **`fleet.LayoutUnit` (`layout_units`)**:
   - **Thiếu:** `UniqueConstraint(fields=['layout', 'deck', 'row_number', 'column_number'], name='uq_layout_unit_grid_coord')` và `CheckConstraint(condition=Q(max_adults__gte=1) & Q(max_children__gte=0), name='ck_layout_unit_capacity')`.
2. **`finance.SettlementLine` (`settlement_lines`)**:
   - **Hiện tại:** `UniqueConstraint(fields=['settlement', 'booking_item'], name='uq_settlement_line')` chỉ ngăn 1 `booking_item` xuất hiện 2 lần trong *cùng 1 kỳ đối soát*, nhưng không ngăn 1 `booking_item` bị đưa vào *2 kỳ đối soát khác nhau*!
   - **Cần nâng cấp:** Đổi thành `UniqueConstraint(fields=['booking_item'], name='uq_settlement_line_booking_item')` (hoặc `OneToOneField`) để mỗi `BookingItem` chỉ được thanh quyết toán tối đa 1 lần.
3. **`finance.CommissionAgreement` (`commission_agreements`)**:
   - **Thiếu:** `CheckConstraint(condition=Q(effective_to__isnull=True) | Q(effective_to__gte=models.F('effective_from')), name='ck_commission_date_order')` để tránh ngày kết thúc nhỏ hơn ngày bắt đầu.
4. **`content.OutboxEvent` (`outbox_events`)**:
   - **Thiếu:** `Index(fields=['status', 'created_at'], name='ix_outbox_status_created')` để worker quét nhanh các sự kiện `status='PENDING'`.
5. **`content.AuditLog` (`audit_logs`)**:
   - **Thiếu:** `Index(fields=['resource_type', 'resource_id', 'created_at'], name='ix_audit_resource_lookup')` để tra cứu lịch sử kiểm toán theo đối tượng.

---

## 4. ĐÁNH GIÁ CÁC BẢNG ĐỀ XUẤT BỔ SUNG (THEO YÊU CẦU MỤC 4)

Dưới đây là phân tích từng bảng được đặt vấn đề trong đề bài, giải thích rõ **Có cần tạo bảng mới không, hay nên mở rộng bảng hiện có** để giữ kiến trúc gọn, không trùng lặp chức năng:

| Bảng đề xuất trong đề bài | Quyết định kiến trúc | Lý do & Giải pháp thay thế / Quan hệ với bảng hiện có |
|---|---|---|
| **1. Email verification** | **KHÔNG tạo bảng mới** (Dùng cơ chế ký số stateless + `users.email_verified_at` + `outbox_events`) | Bảng `users` đã có cột `email_verified_at` ([accounts/models.py](file:///c:/ProjectCV/RideWay/backend/accounts/models.py#L29)) và Django `default_token_generator` / `TimestampSigner` tạo token HMAC có thời hạn từ trạng thái user mà không cần lưu bảng token riêng. Việc gửi email được theo dõi qua bảng `outbox_events` đã có sẵn. |
| **2. Driver management (`drivers`)** | **NÊN TẠO BẢNG MỚI** trong app `fleet` (`fleet.Driver` → bảng `drivers`) | Một hãng xe có nhiều tài xế chuyên trách đường dài (họ tên, SĐT, số GPLX `license_number`, hạng bằng `license_class`, hạn bằng `license_expires_at`, `status`). Tài xế không nhất thiết là user đăng nhập hệ thống. Quan hệ: `operator_id → operators (CASCADE)`, Unique `(operator, license_number)`. |
| **3. Trip assignments** | **KHÔNG cần bảng phụ riêng nếu chỉ gắn 1 tài xế chính + 1 phụ xế**, hoặc mở rộng trực tiếp trên `catalog.Trip` (`primary_driver_id`, `co_driver_id` → `drivers (SET_NULL)`) | `catalog.Trip` đã có sẵn `vehicle_id → vehicles (PROTECT)`. Đối với vận hành xe khách đường dài (1 tài chính + 1 tài phụ cho mỗi chuyến `Trip`), chỉ cần bổ sung `primary_driver` và `co_driver` (FK tới `fleet.Driver`) trên bảng `trips` kèm validation chống trùng lịch chạy của cùng tài xế/xe, tránh phải join thêm bảng trung gian phức tạp. |
| **4. Notification delivery logs** | **KHÔNG tạo bảng mới** (Mở rộng bảng `content.OutboxEvent` hiện có) | Bảng `outbox_events` ([content/models.py](file:///c:/ProjectCV/RideWay/backend/content/models.py#L46-L54)) hiện đã có `topic`, `payload`, `status`, `processed_at`. Chỉ cần bổ sung 3 cột: `recipient_email`, `retry_count (PositiveSmallIntegerField)`, `last_error (TextField)` là đáp ứng trọn vẹn cả Transactional Outbox lẫn Notification Delivery Log mà không bị trùng bảng. |
| **5. Payment webhook events** | **KHÔNG tạo bảng mới** (Đã có bảng `payments.PaymentTransaction`) | Bảng `payment_transactions` ([payments/models.py](file:///c:/ProjectCV/RideWay/backend/payments/models.py#L40-L54)) đã lưu `intent`, `provider_event_id`, `amount`, `status`, `raw_payload (JSONField)`, `processed_at` với `UniqueConstraint('intent', 'provider_event_id')`. Tạo thêm bảng `payment_webhook_events` sẽ trùng lặp 100% chức năng. |
| **6. Support tickets (`support_tickets`)** | **NÊN TẠO BẢNG MỚI** trong app `content` hoặc `bookings` (`bookings.SupportTicket` → bảng `support_tickets`) | Hiện hệ thống mới có `CancellationRequest` (chỉ phục vụ hủy/đổi vé). Khách hàng cần gửi khiếu nại/hỗ trợ chung (quên đồ, phản ánh thái độ phục vụ, lỗi thanh toán, yêu cầu xuất hóa đơn) gắn với `booking_id (NULL)`, `customer_id → users`, `assigned_to_id → users (Platform Staff)`, `category`, `subject`, `description`, `status` (`OPEN`/`IN_PROGRESS`/`RESOLVED`/`CLOSED`), `resolution_note`. |
| **7. Pickup/dropoff quotations** | **KHÔNG tạo bảng mới** (Mở rộng bảng `bookings.PickupRequest` hiện có) | Bảng `pickup_requests` ([bookings/models.py](file:///c:/ProjectCV/RideWay/backend/bookings/models.py#L102-L124)) đã quản lý quy trình báo giá điểm đón riêng (`custom_address`, `fee`, `status` trong `REQUESTED`/`QUOTED`/`ACCEPTED`/`REJECTED`). Chỉ cần bổ sung thêm cột `direction` (`PICKUP`/`DROPOFF`), `quoted_by_id → users (SET_NULL, NULL)`, `quoted_at (DateTimeField)` và `operator_note` ngay trên `pickup_requests`. |
| **8. Settlement payouts** | **KHÔNG tạo bảng mới** (Mở rộng bảng `finance.Settlement` hiện có) | Mỗi kỳ đối soát `Settlement` tương ứng 1 lệnh chi trả (`PAID`) cho nhà xe. Chỉ cần bổ sung `payout_reference (CharField)`, `paid_at (DateTimeField)`, `paid_by_id → users (SET_NULL, NULL)` vào bảng `settlements` ([finance/models.py](file:///c:/ProjectCV/RideWay/backend/finance/models.py#L97-L114)). |

> **Kết luận về Schema PostgreSQL:** Chỉ cần thêm **2 bảng thực sự mới** (`drivers` và `support_tickets`) ở giai đoạn P1, đồng thời mở rộng nhẹ các cột/ràng buộc trên 34 bảng hiện hữu. Tổng số bảng sẽ là **36 bảng**, giữ đúng nguyên tắc không phình to schema hay tạo bảng trùng chức năng.
