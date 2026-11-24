# Feature Specification: Vé Xuyên Việt Multi-Operator Bus Ticket Marketplace

**Feature Branch**: `001-bus-ticket-marketplace`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "SRS 0.3.1 & SRS 0.4 — Vé Xuyên Việt: Nền tảng marketplace đặt vé xe đường dài nhiều hãng, bán vé theo chặng, chọn từng phòng/giường, giữ chỗ 10 phút, thanh toán QR 100%, phát hành vé điện tử tự động, portal hãng xe/nhân viên/admin và hệ thống nội dung."

## Clarifications

### Session 2026-11-24

- Q: Trẻ em được tính đến độ tuổi tối đa nào, có cần xác minh ngày sinh không, và phụ phí trẻ em được tính theo cơ chế nào? (OPEN-01, OPEN-02) → A: Nền tảng áp dụng một ngưỡng tuổi và mức phụ phí cố định chung cho toàn bộ các hãng (giá trị số cụ thể do chủ dự án cấu hình ở cấp nền tảng; chặn báo giá/xuất vé có trẻ em nếu chưa cấu hình).
- Q: Hệ thống sẽ tích hợp cổng thanh toán QR nào, và áp dụng quy tắc chặn (cutoff) ra sao khi khách bắt đầu thanh toán sát thời điểm hết 10 phút giữ chỗ? (OPEN-03, OPEN-04) → A: Sử dụng VNPay QR (tích hợp xác minh chữ ký/IPN và đối chiếu trạng thái giao dịch; tham số cutoff giây cuối trước khi hết hạn 10 phút tiếp tục chờ chốt cấu hình, mọi thanh toán xác nhận sau khi mất hold đều vào `EXCEPTION`).
- Q: Chính sách hủy/đổi/hoàn tiền giữa nền tảng và hãng xe vận hành theo cơ chế nào, và chu kỳ đối soát hoa hồng phần trăm ra sao? (OPEN-05, OPEN-06) → A: Nền tảng ban hành khung chính sách hủy/đổi theo phiên bản (`policy_versions`), hãng được tùy chỉnh trong biên độ cho phép (tạm giữ duyệt tay nếu chưa cấu hình); hoa hồng tính % theo hợp đồng từng hãng và đối soát định kỳ (tuần/tháng).
- Q: Khi khách nhập địa chỉ đón/trả riêng ngoài bến, hệ thống xử lý báo giá phụ phí và xác nhận với hãng xe như thế nào? (OPEN-07) → A: Hãng xe cấu hình sẵn danh sách vùng/khu vực hỗ trợ kèm phụ phí cố định theo từng vùng; địa chỉ nằm ngoài vùng cấu hình chỉ tạo yêu cầu hỗ trợ riêng (không cộng phí tự động vào đơn thanh toán QR).
- Q: Tài khoản khách hàng đăng ký bằng email và mật khẩu có bắt buộc xác minh email trước khi giữ chỗ/mua vé không, và khôi phục mật khẩu qua kênh nào? (OPEN-08) → A: Cho phép đăng nhập và đặt vé ngay sau khi đăng ký, đồng thời gửi link xác minh email và khôi phục mật khẩu qua email link hết hạn ngắn; bắt buộc xác minh email trước khi hoàn tiền hoặc đổi thông tin nhạy cảm.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Trips, Select Specific Units by Segment, and Complete Multi-Unit Hold (Priority: P1)

A customer searches for long-distance bus trips between an origin and destination on a chosen date, filters or sorts by lowest valid segment price, inspects the two-deck seat/cabin layout showing real-time unit availability for their exact route segment, logs in with email and password, and places a 10-minute atomic hold on one or more rooms/beds.

**Why this priority**: Core revenue-generating customer journey; without segment-aware search and conflict-free atomic holds, no tickets can be sold.

**Independent Test**: Can be fully tested by searching a multi-stop route (A–B–C–D), inspecting unit availability on segment A→C, logging in, and holding multiple units simultaneously while verifying conflicting holds on overlapping segments (e.g., B→D) are rejected and adjacent non-overlapping segments (A→B and B→C) succeed.

**Acceptance Scenarios**:

1. **Given** a trip with ordered stops A → B → C → D and unit P01 available, **When** Customer 1 requests a hold on P01 for segment A→C and Customer 2 simultaneously requests P01 for segment A→C or B→D, **Then** only one hold succeeds and the other is rejected as unavailable.
2. **Given** unit P01 is held or confirmed for segment A→B, **When** another customer requests P01 for the adjacent segment B→C on the same trip, **Then** the hold succeeds because the segments do not overlap.
3. **Given** a customer selects 3 units in one booking request where 1 unit has an overlapping segment conflict, **When** the customer submits the hold request, **Then** no units are held (all-or-nothing rollback) and the customer is notified of the conflict.
4. **Given** a 10-minute hold has expired, **When** another customer requests that unit and segment even before background cleanup runs, **Then** the system reclaims the expired hold first and grants the new hold safely.

---

### User Story 2 - Assign Passengers, Select Pickup/Dropoff, Pay 100% via QR, and Receive E-Tickets (Priority: P1)

After holding units, the customer enters passenger details, assigns each passenger to a specific held room/bed within capacity limits, selects fixed or custom pickup/dropoff options, receives a verified 100% QR payment request, completes payment, and automatically receives one e-ticket per booked unit upon provider confirmation.

**Why this priority**: Completes the end-to-end purchase flow and guarantees financial accuracy, capacity compliance, and duplicate-free ticket issuance.

**Independent Test**: Can be tested by assigning 2 adults + 1 child to a double cabin, rejecting 3 adults in a double cabin, generating a QR payment for 100% of the quoted total, simulating repeated payment confirmation callbacks, and verifying exactly one e-ticket per booked unit is issued.

**Acceptance Scenarios**:

1. **Given** a held double cabin with capacity 2 adults and 1 child, **When** the customer assigns 2 adults and 1 child, **Then** the assignment is accepted; **When** the customer attempts to assign 3 adults, **Then** the system rejects the request for exceeding capacity.
2. **Given** a booking with an active hold and finalized quote, **When** the payment provider confirms 100% payment three times (duplicate callbacks), **Then** the system records one valid payment and issues exactly one e-ticket per booked unit.
3. **Given** a booking whose 10-minute hold expired before payment confirmation arrived, **When** a late payment confirmation arrives from the provider, **Then** the system marks the booking as an exception for manual resolution and does NOT auto-issue e-tickets.
4. **Given** a customer attempts to alter prices or fees in a request, **When** the system processes the booking or payment, **Then** client-supplied amounts are ignored and the system uses only server-calculated quotes.

---

### User Story 3 - Customer Account Authentication, Booking History, and E-Ticket Lookup (Priority: P1)

A customer registers with email and password, signs in, views their active holds, past bookings, payment statuses, and issued e-tickets, and cannot view or modify another customer's bookings.

**Why this priority**: Required by business rules (mandatory login before purchase) and essential for customer trust and data privacy.

**Independent Test**: Can be tested by registering a new account, signing in, placing a booking, viewing `/me` booking history and e-tickets, and verifying access to another user's booking is denied.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor attempting to hold units, **When** they proceed to hold, **Then** the system requires email/password registration or login first.
2. **Given** Customer A and Customer B both have bookings, **When** Customer A attempts to view Customer B's booking or e-ticket, **Then** access is denied.

---

### User Story 4 - Operator Portal for Fleet, Layouts, Routes, Trips, Fares, and Bookings (Priority: P1)

An operator owner or authorized operator staff signs in to manage their own vehicles, 2-deck seat/cabin layouts (Limousine 20–22 cabins, sleeper 24–34 beds), ordered route stops, scheduled trips, segment-based fares, pickup/dropoff options, passenger manifests, and bookings—strictly isolated to their own operator account.

**Why this priority**: Operators supply the inventory, routes, and fares; without operator self-service and strict tenant isolation, the marketplace cannot operate.

**Independent Test**: Can be tested by having Operator A create a vehicle, layout, route, trip, and fares, then verifying Operator B cannot view or modify Operator A's trip or booking data.

**Acceptance Scenarios**:

1. **Given** Operator A owns a trip and its bookings, **When** Operator B attempts to view or modify Operator A's vehicle, trip, or booking, **Then** the system blocks the request and reveals no data.
2. **Given** an operator staff member without revenue/settlement permissions, **When** they access operational trip manifests and check-in lists, **Then** they can perform check-in operations while financial settlement views remain restricted.

---

### User Story 5 - Platform Staff & Admin Operations, Exceptions, Settlements, and Content (Priority: P2)

Platform staff look up customer orders, verify payment statuses, and resolve payment exceptions or cancellation/refund requests; Platform admins approve operators, manage accounts and policy versions, oversee multi-operator commission settlements, review audit logs, and publish travel news, destination guides, operator news, and promotions.

**Why this priority**: Enables marketplace governance, exception handling, financial reconciliation, and customer acquisition content without blocking core P1 booking flows.

**Independent Test**: Can be tested by having platform staff resolve an `EXCEPTION` booking, an admin approve an operator and review audit logs, and an admin publish a travel post visible on the public website.

**Acceptance Scenarios**:

1. **Given** a booking in `EXCEPTION` state due to late payment, **When** authorized platform staff reviews the payment record, **Then** they can resolve it (re-allocate or refund) with an audit trail entry.
2. **Given** a commission agreement without a configured percentage, **When** an admin attempts to finalize an operator settlement, **Then** the system blocks final approval until the commission rate is configured.
3. **Given** a published travel article, destination guide, or promotion, **When** a visitor browses the content section, **Then** they can view the list and read article details.

---

### Edge Cases

- What happens when a customer assigns a child to a unit, but child surcharge rules are not yet configured? System MUST reject quoting/issuing tickets rather than assuming a zero fee.
- What happens when a customer enters a custom pickup/dropoff address whose zone/fee is not yet configured or outside the operator's supported pickup zones? System MUST NOT silently guess a fee or confirm pickup; it creates a separate support request without adding unapproved fees to the QR payment total.
- What happens when a customer initiates QR payment seconds before the 10-minute hold expires and the provider confirms after expiration? System MUST NOT auto-issue tickets; it MUST route the transaction to `EXCEPTION`.
- What happens when a cancellation/refund request is submitted without an active, approved policy version rule? System MUST hold the request for manual review rather than auto-refunding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow customers to register and sign in with email and password, allow booking immediately after registration while sending short-lived email verification and password-recovery links, and require verified email before processing refunds or sensitive account changes.
- **FR-002**: System MUST enforce role-based and operator-scoped permissions across Customer, Operator Owner, Operator Staff, Platform Staff, and Platform Admin roles on every operation.
- **FR-003**: Operators MUST be able to manage their own vehicles and 1- or 2-deck seat/cabin layouts (supporting Limousine 20–22 cabins and sleeper buses 24–34 beds) and snapshot unit capacities onto each scheduled trip.
- **FR-004**: Operators MUST be able to define routes with ordered stops, trip schedules with per-stop boarding/alighting rules, segment-based fares by unit type, and fixed or custom pickup/dropoff options.
- **FR-005**: Customers MUST be able to search trips by route/date, filter and sort by lowest valid segment price, and view real-time unit availability for their exact origin-to-destination segment.
- **FR-006**: System MUST allow customers to hold multiple units in a single atomic all-or-nothing request for 10 minutes, preventing overlapping segment conflicts while permitting adjacent non-overlapping segments on the same unit.
- **FR-007**: System MUST reclaim expired holds before evaluating new hold requests on conflicting units/segments.
- **FR-008**: System MUST validate passenger capacity per booked unit (e.g., double cabins up to 2 adults + 1 child; single units up to 1 adult + 1 child) using a single platform-wide child age threshold and a platform-wide fixed child surcharge configured by Platform Admin (rejecting child-included quotes with `422` until the numeric threshold and fee are configured).
- **FR-009**: System MUST snapshot unit prices, surcharges, pickup/dropoff fees, and effective policy versions onto the booking at transaction time, ignoring any client-supplied prices.
- **FR-010**: System MUST generate a 100% upfront VNPay QR payment request (with configurable pre-expiry cutoff window before the 10-minute hold expires), verify VNPay IPN/callback signatures and transaction status, and enforce idempotency so duplicate notifications never create duplicate payments or tickets.
- **FR-011**: System MUST automatically issue one e-ticket per booked unit upon verified 100% payment while the hold is valid, and route late or ambiguous payments to `EXCEPTION`.
- **FR-012**: System MUST allow customers to view booking history, payment status, e-tickets, and submit cancellation/change requests governed by platform-wide `policy_versions` with operator-level overrides within platform-defined bounds (holding requests for manual review if no approved rule is configured).
- **FR-013**: System MUST provide operator settlement reporting based on per-operator percentage `commission_agreements` on a periodic (weekly/monthly) cycle, blocking final settlement approval if commission rates are unconfigured.
- **FR-014**: System MUST provide a public content hub for travel articles, destinations, operator news, and promotions, and record audit logs for sensitive administrative, exception, and financial actions.

### Key Entities *(include if feature involves data)*

- **User & OperatorMembership**: Authenticated accounts and their scoped roles within specific bus operators or the platform.
- **Operator, Vehicle & Layout**: Bus company profile, physical vehicles, and multi-deck unit templates (cabins/beds with adult and child capacities).
- **Route, Trip & TripStop**: Ordered stop sequences for routes and scheduled trips with boarding/alighting permissions and segment fares.
- **TripUnit & InventoryAllocation**: Snapshot of sellable units per trip and segment-based availability (`HELD`, `CONFIRMED`, `BLOCKED`, `EXPIRED`, `RELEASED`).
- **Booking, BookingItem & BookingPassenger**: Customer order header (with 10-minute hold expiration and policy snapshot), individual booked units per segment, and passengers assigned per unit.
- **PaymentIntent, PaymentTransaction & Ticket**: 100% payment requests, idempotent provider transaction records, and issued e-tickets (one per booked unit).
- **CancellationRequest, Refund & Settlement**: Versioned policy-driven change/refund workflows and operator commission reconciliation records.
- **Post, Destination & AuditLog**: Editorial/promotional content and immutable audit trail of sensitive actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of concurrent hold attempts on overlapping segments for the same unit result in at most one successful hold and zero double-bookings.
- **SC-002**: 100% of duplicate payment confirmation notifications for the same transaction produce exactly one recorded payment and one e-ticket per booked unit.
- **SC-003**: Customers can search trips, select units on a segment layout, and complete a multi-unit hold in under 3 minutes.
- **SC-004**: 100% of cross-operator access attempts (reading or modifying another operator's trips, vehicles, or bookings) are blocked.
- **SC-005**: 100% of late payment confirmations arriving after hold expiration are routed to exception handling with zero unauthorized e-tickets issued.

## Assumptions

- Desktop-first web experience using a white and green visual palette (`#FFFFFF`, `#166534`, `#16A34A`, `#F0FDF4`) is targeted for initial release; native iOS/Android apps and external operator software sync are out of scope.
- Monetary values are denominated in VND, and timestamps are stored in UTC and displayed in `Asia/Ho_Chi_Minh`.
- Initial reference scale is 50 operators and 50 routes; traffic unit (1,000 visits per day vs. month) and peak concurrency targets will be finalized before infrastructure sizing.
- Email verification enforcement and password-recovery/OTP details will be confirmed prior to production launch.
