# 08 — DANH SÁCH CÔNG VIỆC TRIỂN KHAI CHI TIẾT (IMPLEMENTATION TASKS)

**Dự án:** RideWay – Vé Xuyên Việt  
**Quy chuẩn mỗi công việc:** Mọi task dưới đây đều định nghĩa đầy đủ 9 thuộc tính bắt buộc: Mã công việc, App/Module liên quan, Mức ưu tiên, Mục tiêu, File hiện có liên quan, Công việc cụ thể cần thực hiện, Phụ thuộc, Tiêu chí nghiệm thu và Kiểm thử cần thực hiện.

---

## PHẦN A — CÁC CÔNG VIỆC MỨC ƯU TIÊN P0 (BẮT BUỘC TRƯỚC KHI VẬN HÀNH)

### 1. `TASK-P0-01`: Vá lỗ hổng lộ Token Khôi phục mật khẩu & Xác minh Email
- **Django App / Module liên quan:** `accounts`, `content`
- **Mức ưu tiên:** **P0 (Critical Security)**
- **Mục tiêu:** Loại bỏ hoàn toàn việc trả `uid` và `token` nhạy cảm trong HTTP JSON response; chuyển sang cơ chế đẩy sự kiện vào `OutboxEvent` và gửi qua Django Email Backend, đồng thời kích hoạt kiểm tra độ mạnh mật khẩu chuẩn Django.
- **File hiện có liên quan:**
  - [backend/accounts/views.py](file:///c:/ProjectCV/RideWay/backend/accounts/views.py#L30-L147)
  - [backend/content/models.py](file:///c:/ProjectCV/RideWay/backend/content/models.py#L46-L54)
  - [backend/backend/settings.py](file:///c:/ProjectCV/RideWay/backend/backend/settings.py#L100-L113)
- **Công việc cụ thể cần thực hiện:**
  1. Tại `PasswordResetRequestView.post` ([accounts/views.py](file:///c:/ProjectCV/RideWay/backend/accounts/views.py#L78-L93)): Xóa `"uid": uid, "token": token` khỏi `Response`. Ghi bản ghi `OutboxEvent.objects.create(topic='auth.password_reset', payload={'email': user.email, 'uid': uid, 'token': token})` và gọi `send_mail()` (môi trường dev dùng `console.EmailBackend`).
  2. Tại `EmailVerificationRequestView.post` ([accounts/views.py](file:///c:/ProjectCV/RideWay/backend/accounts/views.py#L117-L127)): Xóa `"uid": uid, "token": token` khỏi `Response`; ghi `OutboxEvent` tương tự.
  3. Tại `RegisterView.post` ([L34](file:///c:/ProjectCV/RideWay/backend/accounts/views.py#L34)) và `PasswordResetConfirmView.post` ([L103](file:///c:/ProjectCV/RideWay/backend/accounts/views.py#L103)): Gọi `django.contrib.auth.password_validation.validate_password(password, user=user)` và trả lỗi 422 `WEAK_PASSWORD` nếu mật khẩu không đạt chuẩn.
- **Phụ thuộc:** Không.
- **Tiêu chí nghiệm thu:**
  - Gọi `POST /api/v1/auth/password-reset/request` và `POST /api/v1/auth/email-verification/request` chỉ trả về `{"detail": "..."}` (HTTP 200), tuyệt đối không chứa khóa `uid` hoặc `token`.
  - Một bản ghi `OutboxEvent` được tạo trong DB với `topic` tương ứng.
- **Kiểm thử cần thực hiện:**
  - Unit test trong `accounts/tests.py`: kiểm tra `assertNotIn('token', response.json())`, `assertNotIn('uid', response.json())`, kiểm tra `OutboxEvent.objects.count() == 1`, rồi lấy token từ `mail.outbox` / `OutboxEvent` để gọi `/confirm` thành công.

---

### 2. `TASK-P0-02`: Sửa thuật toán Tìm kiếm chuyến & Tính giá thấp nhất đúng đoạn chặng `[from_seq, to_seq)`
- **Django App / Module liên quan:** `catalog`
- **Mức ưu tiên:** **P0 (Critical Business Logic - `FR-05`, `FR-06`, `BR-05`)**
- **Mục tiêu:** Đảm bảo `GET /api/v1/trips` chỉ trả về các chuyến xe đi đúng chiều từ điểm đi tới điểm đến (`from_stop.sequence < to_stop.sequence`), điểm đi cho phép đón (`allow_pickup=True`), điểm đến cho phép trả (`allow_dropoff=True`), tính `min_price` trên đúng đoạn `[from_sequence, to_sequence)` và trả kèm `from_sequence`, `to_sequence`, `available_units`.
- **File hiện có liên quan:**
  - [backend/catalog/views.py](file:///c:/ProjectCV/RideWay/backend/catalog/views.py#L43-L88)
  - [backend/catalog/models.py](file:///c:/ProjectCV/RideWay/backend/catalog/models.py#L51-L131)
- **Công việc cụ thể cần thực hiện:**
  1. Trong `TripSearchView.get` ([catalog/views.py](file:///c:/ProjectCV/RideWay/backend/catalog/views.py#L46-L87)):
     - Khi có `from_location_id` và `to_location_id`, dùng `Subquery` / `OuterRef` lấy `from_seq = TripStop.objects.filter(trip=OuterRef('pk'), route_stop__location_id=from_loc, route_stop__allow_pickup=True).values('sequence')[:1]` và `to_seq = TripStop.objects.filter(trip=OuterRef('pk'), route_stop__location_id=to_loc, route_stop__allow_dropoff=True).values('sequence')[:1]`.
     - Lọc `.annotate(from_seq=Subquery(from_seq), to_seq=Subquery(to_seq)).filter(from_seq__isnull=False, to_seq__isnull=False, from_seq__lt=F('to_seq'))`.
     - Tính `min_price` bằng `Subquery` trên `TripFare.objects.filter(trip=OuterRef('pk'), from_sequence=OuterRef('from_seq'), to_sequence=OuterRef('to_seq')).order_by('base_amount').values('base_amount')[:1]` và chỉ trả về chuyến xe đã được cấu hình giá cho chặng đó (`min_price__isnull=False`).
  2. Bổ sung bộ lọc tùy chọn `unit_kind` (`CABIN` / `BERTH`), `max_price`, và trả về `from_sequence`, `to_sequence`, `available_unit_count` trong JSON của từng chuyến.
- **Phụ thuộc:** Không.
- **Tiêu chí nghiệm thu:**
  - Tìm kiếm `Hà Nội → Đà Nẵng` trả về `from_sequence=0, to_sequence=2` và `min_price=600000.00` (hoặc giá thực của chặng `0→2`), không còn trả về `150000.00` (giá chặng `1→2` Huế → Đà Nẵng).
  - Tìm kiếm chiều ngược lại `Đà Nẵng → Hà Nội` trên chuyến chỉ chạy `Hà Nội (0) → Huế (1) → Đà Nẵng (2)` trả về `count: 0`.
- **Kiểm thử cần thực hiện:**
  - Integration test trong `catalog/tests.py`: tạo chuyến `A(0) → B(1) → C(2)` với giá `0→1: 150k`, `1→2: 200k`, `0→2: 320k`; kiểm tra tìm `A → C` trả đúng `min_price='320000.00'` và tìm `C → A` trả rỗng.

---

### 3. `TASK-P0-03`: Chuẩn hóa Bảo mật Mã QR Vé điện tử (`qr_token` ký số HMAC vs `qr_token_hash`)
- **Django App / Module liên quan:** `payments`
- **Mức ưu tiên:** **P0 (Critical Security - `FR-11`, `BR-06`)**
- **Mục tiêu:** Đảm bảo cột `Ticket.qr_token_hash` trong DB chỉ lưu bản băm SHA-256 một chiều; API `/api/v1/me/tickets` chỉ trả `qr_token` đã ký HMAC cho chủ sở hữu vé; và API `/api/v1/operators/me/check-in` luôn băm SHA-256 chuỗi `qr_token` nhận được để đối chiếu với `qr_token_hash`.
- **File hiện có liên quan:**
  - [backend/payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L170-L210)
  - [backend/payments/views.py](file:///c:/ProjectCV/RideWay/backend/payments/views.py#L64-L103)
- **Công việc cụ thể cần thực hiện:**
  1. Viết hàm `build_signed_qr_token(ticket_code: str, booking_item_id: str) -> str` trong `payments/services.py` sử dụng `django.core.signing.Signer(salt='rideway.ticket.qr').sign(f"{ticket_code}:{booking_item_id}")`.
  2. Khi phát hành vé trong `process_vnpay_ipn` ([payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L174-L184)): tính `raw_token = build_signed_qr_token(t_code, str(item.id))` và lưu `qr_token_hash = hashlib.sha256(raw_token.encode()).hexdigest()`.
  3. Tại `MyTicketsView.get` ([payments/views.py](file:///c:/ProjectCV/RideWay/backend/payments/views.py#L75-L88)) và `PaymentStatusView.get` ([L47-L61](file:///c:/ProjectCV/RideWay/backend/payments/views.py#L47-L61)): trả về `'qr_token': build_signed_qr_token(t.code, str(t.booking_item_id))` thay vì trả `t.qr_token_hash`.
  4. Tại `check_in_ticket` ([payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L189-L194)): xóa nhánh bypass `if len(qr_token) == 64: token_hash = qr_token`; bắt buộc luôn tính `token_hash = hashlib.sha256(qr_token.encode()).hexdigest()` rồi mới truy vấn `Ticket.objects.select_for_update().filter(qr_token_hash=token_hash)`.
- **Phụ thuộc:** Không.
- **Tiêu chí nghiệm thu:**
  - Dữ liệu JSON của `/api/v1/me/tickets` chứa `qr_token` ký số, không chứa `qr_token_hash`.
  - Nếu lấy trực tiếp giá trị `qr_token_hash` từ DB gửi vào `/api/v1/operators/me/check-in`, hệ thống từ chối với lỗi 404 `TICKET_NOT_FOUND`.
  - Nếu lấy `qr_token` của chủ vé gửi vào `/api/v1/operators/me/check-in`, lần 1 trả 200 `CHECKED_IN`, lần 2 trả 409 `ALREADY_CHECKED_IN`.
- **Kiểm thử cần thực hiện:**
  - Unit & Integration test trong `payments/tests.py` cho cả 3 kịch bản: check-in bằng `qr_token` hợp lệ, check-in lặp lần 2, và tấn công bằng cách gửi trực tiếp `qr_token_hash` từ DB.

---

### 4. `TASK-P0-04`: Giải phóng tồn kho `InventoryAllocation` & Hủy `Ticket` khi duyệt hủy vé
- **Django App / Module liên quan:** `finance`, `inventory`, `payments`, `bookings`
- **Mức ưu tiên:** **P0 (Critical Data Integrity - `FR-13`)**
- **Mục tiêu:** Khi yêu cầu hủy vé (`CancellationRequest` với `kind='CANCEL'`) được phê duyệt (`APPROVED`), hệ thống phải giải phóng toàn bộ các đoạn chỗ `InventoryAllocation` về `RELEASED`, vô hiệu hóa các vé điện tử `Ticket` sang `CANCELLED` và cập nhật `Booking.status = 'CANCELLED'` trong cùng một transaction nguyên tử.
- **File hiện có liên quan:**
  - [backend/finance/views.py](file:///c:/ProjectCV/RideWay/backend/finance/views.py#L159-L188)
  - [backend/finance/services.py](file:///c:/ProjectCV/RideWay/backend/finance/services.py#L12-L53)
- **Công việc cụ thể cần thực hiện:**
  1. Tách logic trong `AdminCancellationDecisionView.post` sang hàm service `decide_cancellation_request(actor, request_id, decision, approved_refund_amount=None)` tại `finance/services.py`.
  2. Bên trong `with transaction.atomic():`:
     - Khóa `cr = CancellationRequest.objects.select_for_update().select_related('booking').get(id=request_id)`.
     - Kiểm tra `cr.status == 'PENDING'` (nếu đã xử lý rồi thì chặn với lỗi 409 `ALREADY_DECIDED`).
     - Kiểm tra không có vé nào thuộc đơn đã ở trạng thái `CHECKED_IN` (`Ticket.objects.filter(booking_item__booking=cr.booking, status='CHECKED_IN').exists()`).
     - Khi `decision == 'APPROVED'` và `cr.kind == 'CANCEL'`:
       - Cập nhật `InventoryAllocation.objects.filter(booking_item__booking=cr.booking, status__in=['HELD', 'CONFIRMED']).update(status='RELEASED', updated_at=now)`.
       - Cập nhật `Ticket.objects.filter(booking_item__booking=cr.booking, status='ISSUED').update(status='CANCELLED', updated_at=now)`.
       - Cập nhật `cr.booking.status = 'CANCELLED'` và `cr.booking.save(update_fields=['status', 'updated_at'])`.
- **Phụ thuộc:** Không.
- **Tiêu chí nghiệm thu:**
  - Sau khi duyệt `APPROVED` yêu cầu hủy của đơn `B1` (giữ phòng `P01` chặng `[0, 2)`), `InventoryAllocation` của `B1` có `status='RELEASED'`, `Ticket` có `status='CANCELLED'`, `Booking` có `status='CANCELLED'`.
  - Khách hàng khác lập tức tạo hold mới trên phòng `P01` chặng `[0, 2)` thành công mà không bị vướng `ExclusionConstraint`.
- **Kiểm thử cần thực hiện:**
  - Bổ sung test case trong `finance/tests.py`: Đặt vé → Thanh toán xuất vé → Yêu cầu hủy → Duyệt hủy → Đặt lại đúng phòng & chặng đó thành công + thử check-in vé đã hủy phải bị từ chối.

---

### 5. `TASK-P0-05`: Củng cố xác thực VNPay IPN (`vnp_Amount`) & Xử lý an toàn Late Webhook (`T06`)
- **Django App / Module liên quan:** `payments`, `inventory`
- **Mức ưu tiên:** **P0 (Financial & Concurrency Integrity - `T06`, `API-08`)**
- **Mục tiêu:** Bắt buộc kiểm tra khớp số tiền `vnp_Amount` trong IPN VNPay và bọc `try/except IntegrityError` khi webhook thanh toán đến muộn cố gắng khôi phục allocation đã hết hạn nhưng phòng vừa bị khách khác giữ.
- **File hiện có liên quan:**
  - [backend/payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L51-L186)
- **Công việc cụ thể cần thực hiện:**
  1. Trong `process_vnpay_ipn` ([payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L102-L108)): bắt buộc `vnp_Amount` phải có mặt (hoặc mặc định bằng `int(intent.amount * 100)` chỉ khi gọi từ test nội bộ với `verify_signature=False`), nếu sai lệch trả lỗi `PaymentProcessError('Amount mismatch with PaymentIntent.')`.
  2. Tại nhánh khôi phục hold quá hạn ([payments/services.py](file:///c:/ProjectCV/RideWay/backend/payments/services.py#L160-L163)): bọc khối cập nhật `InventoryAllocation.objects.filter(booking_item__booking=booking).update(status='CONFIRMED', ...)` bằng `savepoint` (`with transaction.atomic():`) và bắt `IntegrityError`. Nếu xảy ra `IntegrityError` do `ExclusionConstraint`, chuyển `booking.status = 'PAID_CONFLICT_PENDING_REFUND'` và không xuất vé trùng.
- **Phụ thuộc:** `TASK-P0-03`.
- **Tiêu chí nghiệm thu:**
  - Kịch bản `T06` (Đơn 1 hết hạn 10 phút → Đơn 2 giữ cùng phòng `P01` chặng `[0, 2)` → Webhook thanh toán thành công của Đơn 1 đến muộn) chuyển Đơn 1 sang `PAID_CONFLICT_PENDING_REFUND`, không phát hành vé cho Đơn 1, và giữ nguyên hold hợp lệ của Đơn 2.
- **Kiểm thử cần thực hiện:**
  - Viết test tự động cho `T06` trong `payments/tests.py` và `bookings/tests.py`.

---

### 6. `TASK-P0-06`: Chuẩn hóa Input Validation (DRF Serializers), Exception Handling & Rate Limiting
- **Django App / Module liên quan:** `common`, `accounts`, `fleet`, `catalog`, `bookings`, `payments`, `finance`, `content`
- **Mức ưu tiên:** **P0 (Reliability & Security)**
- **Mục tiêu:** Chấm dứt nguy cơ lỗi 500 (`KeyError`, `ValueError`, `IntegrityError`) khi client gửi payload thiếu trường hoặc trùng khóa; bật Rate Limiting cho các API nhạy cảm; và khóa chỉnh sửa `SeatLayout` / `RouteStop` sau khi đã phát sinh chuyến xe.
- **File hiện có liên quan:**
  - [backend/common/__init__.py](file:///c:/ProjectCV/RideWay/backend/common/__init__.py#L19-L45)
  - [backend/backend/settings.py](file:///c:/ProjectCV/RideWay/backend/backend/settings.py#L68-L78)
  - [backend/fleet/views.py](file:///c:/ProjectCV/RideWay/backend/fleet/views.py#L45-L115)
  - [backend/catalog/views.py](file:///c:/ProjectCV/RideWay/backend/catalog/views.py#L147-L270)
- **Công việc cụ thể cần thực hiện:**
  1. Nâng cấp `custom_exception_handler` trong [common/__init__.py](file:///c:/ProjectCV/RideWay/backend/common/__init__.py#L19-L36) để bắt `django.db.IntegrityError` (trả HTTP 409 `CONFLICT`) và `KeyError`/`ValueError`/`DecimalException` (trả HTTP 400 `INVALID_INPUT`).
  2. Cấu hình `DEFAULT_THROTTLE_CLASSES` (`AnonRateThrottle`, `UserRateThrottle`, `ScopedRateThrottle`) và `DEFAULT_THROTTLE_RATES` (`anon: 120/min`, `user: 300/min`, `auth: 15/min`, `holds: 20/min`) trong `settings.py`.
  3. Trong `OperatorLayoutUnitsView.post` ([fleet/views.py](file:///c:/ProjectCV/RideWay/backend/fleet/views.py#L95-L115)): kiểm tra nếu `TripUnit.objects.filter(layout_unit__layout=layout).exists()` thì từ chối thêm/sửa vị trí với mã lỗi 409 `LAYOUT_IN_USE`.
  4. Trong `OperatorRouteStopsView.post` ([catalog/views.py](file:///c:/ProjectCV/RideWay/backend/catalog/views.py#L170-L183)): kiểm tra nếu `Trip.objects.filter(route=route).exists()` thì từ chối thêm chặng mới với mã lỗi 409 `ROUTE_HAS_TRIPS`.
- **Phụ thuộc:** Không.
- **Tiêu chí nghiệm thu:**
  - Gửi payload rỗng `{}` tới tất cả các endpoint `POST`/`PUT`/`PATCH` đều trả về HTTP 400/422 với cấu trúc `{"detail", "code", "request_id"}`, không có endpoint nào trả HTTP 500.
- **Kiểm thử cần thực hiện:**
  - Test negative inputs (payload rỗng, sai kiểu số, trùng mã, sửa layout đã gắn chuyến) trong bộ test tổng hợp.

---

## PHẦN B — CÁC CÔNG VIỆC MỨC ƯU TIÊN P1 (HOÀN THIỆN VẬN HÀNH)

### 7. `TASK-P1-01`: Transactional Outbox Publisher & Management Command thu hồi Hold quá hạn
- **Django App / Module liên quan:** `content`, `inventory`, `bookings`, `payments`
- **Mức ưu tiên:** **P1**
- **Mục tiêu:** Đảm bảo mọi sự kiện nghiệp vụ (`HOLD_CREATED`, `TICKET_ISSUED`, `PICKUP_QUOTED`, `CANCELLATION_DECIDED`, `PASSWORD_RESET`) đều sinh `OutboxEvent` trong cùng transaction và có management command `python manage.py process_outbox_and_holds` để thu hồi hold quá hạn & gửi email thông báo.
- **File hiện có liên quan:** [backend/content/models.py](file:///c:/ProjectCV/RideWay/backend/content/models.py#L46-L54), [backend/inventory/services.py](file:///c:/ProjectCV/RideWay/backend/inventory/services.py#L7-L20).
- **Công việc cụ thể cần thực hiện:**
  1. Bổ sung trường `recipient_email`, `retry_count`, `last_error` và `Index(fields=['status', 'created_at'])` cho `OutboxEvent`.
  2. Ghi `OutboxEvent` trong `create_atomic_hold`, `process_vnpay_ipn`, `operator_quote_pickup`, `decide_cancellation_request`.
  3. Viết command `process_outbox_and_holds` gọi `reclaim_expired_holds()` và gửi email cho các `OutboxEvent(status='PENDING')`.
- **Phụ thuộc:** `TASK-P0-01`, `TASK-P0-04`.
- **Tiêu chí nghiệm thu:** Chạy `python manage.py process_outbox_and_holds` thu hồi toàn bộ hold quá hạn và chuyển các `OutboxEvent` từ `PENDING` sang `SENT`.
- **Kiểm thử cần thực hiện:** Unit test kiểm tra command xử lý đúng hold hết hạn và đánh dấu `OutboxEvent.status == 'SENT'`.

---

### 8. `TASK-P1-02`: Phân quyền `Platform Staff` (`S-01`) & Quản lý Khiếu nại (`SupportTicket`)
- **Django App / Module liên quan:** `common`, `bookings`, `content`, `finance`
- **Mức ưu tiên:** **P1**
- **Mục tiêu:** Kích hoạt quyền `IsPlatformStaffOrAdmin` cho nhân viên vận hành nền tảng và bổ sung bảng `support_tickets` để khách hàng gửi yêu cầu hỗ trợ/khiếu nại.
- **File hiện có liên quan:** [backend/common/__init__.py](file:///c:/ProjectCV/RideWay/backend/common/__init__.py#L71-L78), [backend/finance/views.py](file:///c:/ProjectCV/RideWay/backend/finance/views.py#L147-L200), [backend/content/views.py](file:///c:/ProjectCV/RideWay/backend/content/views.py#L56-L109).
- **Công việc cụ thể cần thực hiện:**
  1. Cho phép `IsPlatformStaffOrAdmin` truy cập các API vận hành: xem/duyệt `CancellationRequest`, xem `Refund`, xem `AdminTripsView`, và quản trị bài viết/điểm đến CMS (`Post`, `Destination`). Giữ nguyên `IsPlatformAdmin` cho các API nhạy cảm cấp cao (duyệt hãng xe, tạo thỏa thuận hoa hồng, duyệt đối soát, sửa chính sách gốc).
  2. Thêm model `SupportTicket` trong `bookings/models.py` (bảng `support_tickets`) và API `GET/POST /api/v1/support-tickets`, `GET/PATCH /api/v1/staff/support-tickets/<id>`.
- **Phụ thuộc:** Không.
- **Tiêu chí nghiệm thu:** User có `is_staff=True, is_superuser=False` truy cập và xử lý được yêu cầu hủy vé, bài viết CMS và phiếu hỗ trợ, nhưng bị chặn (403) khi gọi API duyệt kỳ đối soát hoặc sửa hoa hồng.
- **Kiểm thử cần thực hiện:** RBAC matrix test cho 4 vai trò (`Customer`, `Operator`, `Platform Staff`, `Platform Admin`).

---

### 9. `TASK-P1-03`: Quản lý Tài xế (`Driver`), Phân công Chuyến xe & Sinh chuyến định kỳ
- **Django App / Module liên quan:** `fleet`, `catalog`
- **Mức ưu tiên:** **P1**
- **Mục tiêu:** Cho phép hãng xe quản lý danh sách tài xế, phân công tài xế + xe cho từng chuyến (có kiểm tra chống trùng lịch) và sinh chuyến hàng loạt theo lịch chạy định kỳ.
- **File hiện có liên quan:** [backend/fleet/models.py](file:///c:/ProjectCV/RideWay/backend/fleet/models.py), [backend/catalog/models.py](file:///c:/ProjectCV/RideWay/backend/catalog/models.py), [backend/catalog/views.py](file:///c:/ProjectCV/RideWay/backend/catalog/views.py).
- **Công việc cụ thể cần thực hiện:**
  1. Tạo model `fleet.Driver` (bảng `drivers`: `operator`, `full_name`, `phone`, `license_number`, `license_class`, `license_expires_at`, `is_active`, Unique `(operator, license_number)`).
  2. Thêm `primary_driver` và `co_driver` (FK `SET_NULL` tới `fleet.Driver`) vào `catalog.Trip`.
  3. Tạo API `GET/POST /api/v1/operators/me/drivers`, `PATCH /api/v1/operators/me/trips/<id>/assign` (kiểm tra bằng lái còn hạn và tài xế/xe không bị trùng chuyến cùng khung giờ) và `POST /api/v1/operators/me/trips/batch-generate`.
- **Phụ thuộc:** `TASK-P0-06`.
- **Tiêu chí nghiệm thu:** Hãng xe thêm được tài xế, phân công vào chuyến xe, bị chặn (409/422) nếu phân công tài xế của hãng khác hoặc bằng lái đã hết hạn, và sinh được chuỗi chuyến xe cho 7 ngày liên tiếp.
- **Kiểm thử cần thực hiện:** Integration test cho CRUD tài xế, kiểm tra cross-tenant assignment và batch trip generation.

---

### 10. `TASK-P1-04`: Tự động tổng hợp Kỳ đối soát (`Settlement` Generator) & Ràng buộc DB bổ sung
- **Django App / Module liên quan:** `finance`, `fleet`
- **Mức ưu tiên:** **P1**
- **Mục tiêu:** Cung cấp API tự động gom các `BookingItem` đã hoàn thành trong kỳ `[period_start, period_end]` vào `Settlement` + `SettlementLine` và nâng cấp ràng buộc `UniqueConstraint` trên `SettlementLine.booking_item`.
- **File hiện có liên quan:** [backend/finance/models.py](file:///c:/ProjectCV/RideWay/backend/finance/models.py#L97-L128), [backend/finance/services.py](file:///c:/ProjectCV/RideWay/backend/finance/services.py#L56-L99).
- **Công việc cụ thể cần thực hiện:**
  1. Thêm `UniqueConstraint(fields=['booking_item'], name='uq_settlement_line_single_booking_item')` trên `SettlementLine` và `UniqueConstraint(fields=['layout', 'deck', 'row_number', 'column_number'], name='uq_layout_unit_grid_coord')` trên `LayoutUnit`.
  2. Viết hàm `generate_operator_settlement(operator_id, period_start, period_end)` quét các `BookingItem` có `booking__status='CONFIRMED'` thuộc chuyến trong kỳ chưa nằm trong bất kỳ `SettlementLine` nào để tạo `Settlement(status='DRAFT')` + các `SettlementLine`.
  3. Mở endpoint `POST /api/v1/admin/settlements/generate` và `POST /api/v1/admin/settlements/<id>/mark-paid`.
- **Phụ thuộc:** `TASK-P0-04`.
- **Tiêu chí nghiệm thu:** Gọi `/admin/settlements/generate` lần 1 gom đúng tổng doanh thu `gross_amount`; gọi lại lần 2 cho cùng kỳ không tạo dòng trùng cho các `BookingItem` đã đối soát.
- **Kiểm thử cần thực hiện:** Unit test kiểm tra tính tổng `gross_amount`, chống trùng `BookingItem` giữa 2 kỳ đối soát và phê duyệt hoa hồng.

---

### 11. `TASK-P1-05`: Tái cấu trúc Frontend với React Router v7, Redux Toolkit & RTK Query
- **Django App / Module liên quan:** `frontend`
- **Mức ưu tiên:** **P1**
- **Mục tiêu:** Cài đặt `react-router-dom`, `@reduxjs/toolkit`, `react-redux`, `qrcode.react`; tổ chức lại state xác thực và cache dữ liệu API bằng RTK Query mà vẫn giữ nguyên 100% giao diện thương hiệu Vé Xuyên Việt hiện tại.
- **File hiện có liên quan:** [frontend/package.json](file:///c:/ProjectCV/RideWay/frontend/package.json), [frontend/src/App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx), [frontend/src/api/client.ts](file:///c:/ProjectCV/RideWay/frontend/src/api/client.ts).
- **Công việc cụ thể cần thực hiện:**
  1. Cài đặt `react-router-dom`, `@reduxjs/toolkit`, `react-redux`, `qrcode.react`.
  2. Xây dựng `src/app/store.ts`, `src/services/ridewayApi.ts` (tích hợp CSRF token tự động) và định nghĩa các route `/`, `/my-tickets`, `/operator`, `/staff`, `/admin`.
- **Phụ thuộc:** `TASK-P0-02`, `TASK-P0-03`.
- **Tiêu chí nghiệm thu:** `npm run build` (`tsc -b && vite build`) thành công 100%; điều hướng URL trực tiếp và nút Back/Forward hoạt động mượt trên mọi màn hình.
- **Kiểm thử cần thực hiện:** Kiểm tra TypeScript compiler `tsc -b` và kiểm thử điều hướng các route trên trình duyệt.

---

### 12. `TASK-P1-06`: Hoàn thiện Giao diện 4 Portals (Bộ lọc ngày đi, QR SVG thật, CRUD Hãng xe/Staff/Admin)
- **Django App / Module liên quan:** `frontend`
- **Mức ưu tiên:** **P1**
- **Mục tiêu:** Bổ sung ô chọn ngày đi trên thanh tìm kiếm, tự động đồng bộ chặng từ điểm đi/đến, hiển thị mã QR SVG thật trên màn hình thanh toán & thẻ vé điện tử, và bổ sung các form quản trị cho Operator/Staff/Admin.
- **File hiện có liên quan:** [frontend/src/App.tsx](file:///c:/ProjectCV/RideWay/frontend/src/App.tsx), [frontend/src/components/CheckoutFlowModal.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/CheckoutFlowModal.tsx), [frontend/src/components/PortalViews.tsx](file:///c:/ProjectCV/RideWay/frontend/src/components/PortalViews.tsx).
- **Công việc cụ thể cần thực hiện:**
  1. Thêm `<input type="date">` vào thanh tìm kiếm 5 cột trên trang chủ và kết nối với `from_sequence`/`to_sequence` trả về từ `TASK-P0-02`.
  2. Tích hợp `<QRCodeSVG value={ticket.qr_token} />` vào `CheckoutFlowModal` và `MyTicketsPortal`.
  3. Bổ sung các tab tạo Xe, Tuyến, Chuyến, Giá chặng, Tài xế trong `OperatorPortal`; tab Duyệt yêu cầu hủy vé & Hỗ trợ trong `StaffPortal`/`AdminPortal`; và form cấu hình `CommissionAgreement` + `PolicyVersion` trong `AdminPortal`.
- **Phụ thuộc:** `TASK-P1-02`, `TASK-P1-03`, `TASK-P1-04`, `TASK-P1-05`.
- **Tiêu chí nghiệm thu:** Cả 4 vai trò thực hiện trọn vẹn quy trình nghiệp vụ của mình trên UI mà không cần gọi API thủ công qua Postman/cURL.
- **Kiểm thử cần thực hiện:** Kiểm thử E2E toàn luồng trên cả Desktop (`1440px`) và Mobile (`375px`).

---

## PHẦN C — CÁC CÔNG VIỆC MỨC ƯU TIÊN P2 (MỞ RỘNG)

| Mã công việc | Module | Mục tiêu | Phụ thuộc | Tiêu chí nghiệm thu |
|---|---|---|---|---|
| **TASK-P2-01** | `bookings`, `frontend` | Hỗ trợ đặt vé khứ hồi (chọn chuyến đi + chuyến về, giữ chỗ nguyên tử 2 chiều, thanh toán 1 mã QR). | Hoàn tất P0 & P1 | Giữ chỗ thành công cả 2 chiều hoặc rollback cả 2 nếu 1 chiều hết phòng. |
| **TASK-P2-02** | `bookings`, `finance` | Luồng đổi chuyến/đổi phòng tự động (`CancellationRequest.kind == 'CHANGE'`) khi chốt `OPEN-04`. | Chốt `OPEN-04` | Chuyển khách sang phòng mới và giải phóng phòng cũ nguyên tử. |
| **TASK-P2-03** | `finance`, `bookings` | Hệ thống mã giảm giá (`Voucher`) theo tuyến/nhà xe hoặc ưu đãi đặt nhiều phòng đôi. | Hoàn tất P1 | Áp dụng mã giảm giá hợp lệ khi tạo `PaymentIntent` và ghi nhận vào đối soát. |
| **TASK-P2-04** | `content`, `catalog` | Đánh giá chuyến đi sau khi `CHECKED_IN` và lưu danh sách tuyến yêu thích. | Hoàn tất P1 | Chỉ khách có vé `CHECKED_IN` mới gửi được đánh giá 1–5 sao. |
| **TASK-P2-05** | `docker-compose.yml`, `.github/workflows` | Đóng gói Docker Compose 4 containers (`postgres`, `backend`, `worker`, `frontend`) và CI pipeline. | Hoàn tất P0 & P1 | `docker compose up --build` khởi chạy toàn bộ hệ thống chỉ với 1 lệnh. |
