"""Seed realistic sample data into ALL 34 PostgreSQL tables for Vé Xuyên Việt (RideWay)."""
from datetime import date, timedelta
from decimal import Decimal
import hashlib
import uuid

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from psycopg.types.range import Range

from accounts.models import Operator, OperatorMembership
from bookings.models import (
    Booking,
    BookingItem,
    BookingItemPassenger,
    BookingPassenger,
    PickupRequest,
)
from catalog.models import (
    Location,
    PickupOption,
    Route,
    RouteStop,
    Trip,
    TripFare,
    TripStop,
    TripUnit,
)
from content.models import AuditLog, Destination, OutboxEvent, Post
from finance.models import (
    CancellationRequest,
    CommissionAgreement,
    PolicyVersion,
    Refund,
    Settlement,
    SettlementLine,
)
from fleet.models import LayoutUnit, SeatLayout, Vehicle, VehicleType
from inventory.models import InventoryAllocation
from payments.models import PaymentIntent, PaymentTransaction, Ticket

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed sample data into all 34 tables of Vé Xuyên Việt (idempotent).'

    def handle(self, *args, **options):
        now = timezone.now()
        with transaction.atomic():
            # 1. users (table 1)
            admin, _ = User.objects.get_or_create(
                email='admin@vexuyenviet.vn',
                defaults={
                    'full_name': 'Quản trị viên Vé Xuyên Việt',
                    'is_staff': True,
                    'is_superuser': True,
                    'email_verified_at': now,
                },
            )
            admin.set_password('Admin@123456')
            admin.save()

            staff, _ = User.objects.get_or_create(
                email='staff@vexuyenviet.vn',
                defaults={
                    'full_name': 'Nhân viên Hỗ trợ Nền tảng',
                    'is_staff': True,
                    'email_verified_at': now,
                },
            )
            staff.set_password('Staff@123456')
            staff.save()

            owner_pt, _ = User.objects.get_or_create(
                email='owner.phuongtrang@vexuyenviet.vn',
                defaults={'full_name': 'Chủ hãng Phương Trang', 'email_verified_at': now},
            )
            owner_pt.set_password('Owner@123456')
            owner_pt.save()

            owner_sv, _ = User.objects.get_or_create(
                email='owner.saoviet@vexuyenviet.vn',
                defaults={'full_name': 'Chủ hãng Sao Việt', 'email_verified_at': now},
            )
            owner_sv.set_password('Owner@123456')
            owner_sv.save()

            customer1, _ = User.objects.get_or_create(
                email='khach1@vexuyenviet.vn',
                defaults={'full_name': 'Nguyễn Văn An', 'email_verified_at': now},
            )
            customer1.set_password('Khach@123456')
            customer1.save()

            customer2, _ = User.objects.get_or_create(
                email='khach2@vexuyenviet.vn',
                defaults={'full_name': 'Trần Thị Bình', 'email_verified_at': now},
            )
            customer2.set_password('Khach@123456')
            customer2.save()

            # 2. operators (table 2)
            op_pt, _ = Operator.objects.get_or_create(
                name='Phương Trang FUTA Bus Lines',
                defaults={
                    'legal_name': 'Công ty Cổ phần Xe khách Phương Trang',
                    'contact_email': 'contact@futabus.vn',
                    'status': 'ACTIVE',
                },
            )
            op_sv, _ = Operator.objects.get_or_create(
                name='Sao Việt Limousine',
                defaults={
                    'legal_name': 'Công ty TNHH Vận tải Sao Việt',
                    'contact_email': 'info@saovietlimo.vn',
                    'status': 'ACTIVE',
                },
            )

            # 3. operator_memberships (table 3)
            OperatorMembership.objects.get_or_create(
                user=owner_pt, operator=op_pt, defaults={'role': 'OWNER', 'is_active': True}
            )
            OperatorMembership.objects.get_or_create(
                user=owner_sv, operator=op_sv, defaults={'role': 'OWNER', 'is_active': True}
            )

            # 4. vehicle_types (table 4)
            vt_limo, _ = VehicleType.objects.get_or_create(
                code='LIMO_20_CABIN', defaults={'name': 'Limousine 20 Phòng Đôi VIP (2 tầng)'}
            )
            vt_sleeper, _ = VehicleType.objects.get_or_create(
                code='SLEEPER_34_BED', defaults={'name': 'Xe Giường Nằm 34 Chỗ Tiêu Chuẩn (2 tầng)'}
            )

            # 5. seat_layouts (table 5)
            layout_limo, _ = SeatLayout.objects.get_or_create(
                operator=op_pt, name='Sơ đồ Limousine 20 Phòng 2 Tầng', defaults={'deck_count': 2}
            )
            layout_sleeper, _ = SeatLayout.objects.get_or_create(
                operator=op_sv, name='Sơ đồ Giường nằm 24 Chỗ 2 Tầng', defaults={'deck_count': 2}
            )

            # 6. layout_units (table 6)
            limo_units = []
            for deck in (1, 2):
                for row in range(1, 6):
                    for col in (1, 2):
                        idx = (deck - 1) * 10 + (row - 1) * 2 + col
                        code = f'P{idx:02d}'
                        lu, _ = LayoutUnit.objects.get_or_create(
                            layout=layout_limo,
                            unit_code=code,
                            defaults={
                                'kind': 'CABIN',
                                'deck': deck,
                                'row_number': row,
                                'column_number': col,
                                'price_mode': 'WHOLE_UNIT',
                                'max_adults': 2,
                                'max_children': 1,
                            },
                        )
                        limo_units.append(lu)

            sleeper_units = []
            for deck in (1, 2):
                for row in range(1, 5):
                    for col in (1, 2, 3):
                        idx = (deck - 1) * 12 + (row - 1) * 3 + col
                        code = f'G{idx:02d}'
                        lu, _ = LayoutUnit.objects.get_or_create(
                            layout=layout_sleeper,
                            unit_code=code,
                            defaults={
                                'kind': 'BED',
                                'deck': deck,
                                'row_number': row,
                                'column_number': col,
                                'price_mode': 'WHOLE_UNIT',
                                'max_adults': 1,
                                'max_children': 1,
                            },
                        )
                        sleeper_units.append(lu)

            # 7. vehicles (table 7)
            veh_pt, _ = Vehicle.objects.get_or_create(
                operator=op_pt,
                registration='51B-298.88',
                defaults={'type': vt_limo, 'layout': layout_limo, 'active': True},
            )
            veh_sv, _ = Vehicle.objects.get_or_create(
                operator=op_sv,
                registration='29B-686.86',
                defaults={'type': vt_sleeper, 'layout': layout_sleeper, 'active': True},
            )

            # 8. locations (table 8)
            loc_hn, _ = Location.objects.get_or_create(
                name='Bến xe Nước Ngầm (Hà Nội)',
                defaults={'province': 'Hà Nội', 'address': 'Km8 Giải Phóng, Hoàng Mai, Hà Nội', 'lat': Decimal('20.9675000'), 'lng': Decimal('105.8415000')},
            )
            loc_hue, _ = Location.objects.get_or_create(
                name='Bến xe Phía Nam (Huế)',
                defaults={'province': 'Thừa Thiên Huế', 'address': '97 An Dương Vương, TP. Huế', 'lat': Decimal('16.4498000'), 'lng': Decimal('107.6025000')},
            )
            loc_dn, _ = Location.objects.get_or_create(
                name='Bến xe Trung tâm Đà Nẵng',
                defaults={'province': 'Đà Nẵng', 'address': 'Tôn Đức Thắng, Liên Chiểu, Đà Nẵng', 'lat': Decimal('16.0544000'), 'lng': Decimal('108.1695000')},
            )
            loc_hcm, _ = Location.objects.get_or_create(
                name='Bến xe Miền Đông Mới (TP.HCM)',
                defaults={'province': 'TP. Hồ Chí Minh', 'address': '501 Hoàng Hữu Nam, TP. Thủ Đức', 'lat': Decimal('10.8795000'), 'lng': Decimal('106.8142000')},
            )

            # 9. routes (table 9) & 10. route_stops (table 10)
            route_pt, _ = Route.objects.get_or_create(
                operator=op_pt, name='Hà Nội → Huế → Đà Nẵng → TP.HCM', defaults={'is_active': True}
            )
            stops_pt = []
            for seq, loc in enumerate([loc_hn, loc_hue, loc_dn, loc_hcm]):
                rs, _ = RouteStop.objects.get_or_create(
                    route=route_pt,
                    sequence=seq,
                    defaults={'location': loc, 'allow_pickup': True, 'allow_dropoff': True},
                )
                stops_pt.append(rs)

            route_sv, _ = Route.objects.get_or_create(
                operator=op_sv, name='Hà Nội → Huế → Đà Nẵng', defaults={'is_active': True}
            )
            stops_sv = []
            for seq, loc in enumerate([loc_hn, loc_hue, loc_dn]):
                rs, _ = RouteStop.objects.get_or_create(
                    route=route_sv,
                    sequence=seq,
                    defaults={'location': loc, 'allow_pickup': True, 'allow_dropoff': True},
                )
                stops_sv.append(rs)

            # 11. pickup_options (table 11)
            pickup_fixed, _ = PickupOption.objects.get_or_create(
                operator=op_pt,
                route_stop=stops_pt[0],
                name='Đón tại Văn phòng Giải Phóng (Miễn phí)',
                defaults={'kind': 'FIXED', 'fee': Decimal('0.00'), 'is_active': True},
            )
            pickup_zone, _ = PickupOption.objects.get_or_create(
                operator=op_pt,
                route_stop=stops_pt[0],
                name='Đón tận nơi Nội thành Hà Nội (Vùng 1)',
                defaults={'kind': 'ZONE', 'fee': Decimal('50000.00'), 'is_active': True},
            )

            # 12. trips (table 12), 13. trip_stops (table 13), 14. trip_units (table 14), 15. trip_fares (table 15)
            dep1 = (now + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
            trip1, _ = Trip.objects.get_or_create(
                route=route_pt,
                vehicle=veh_pt,
                departure_at=dep1,
                defaults={'status': 'OPEN'},
            )
            for rs in stops_pt:
                TripStop.objects.get_or_create(
                    trip=trip1,
                    sequence=rs.sequence,
                    defaults={'route_stop': rs, 'scheduled_at': dep1 + timedelta(hours=rs.sequence * 6)},
                )
            t1_units = []
            for lu in limo_units:
                tu, _ = TripUnit.objects.get_or_create(
                    trip=trip1,
                    unit_code=lu.unit_code,
                    defaults={
                        'layout_unit': lu,
                        'kind': lu.kind,
                        'price_mode': lu.price_mode,
                        'max_adults': lu.max_adults,
                        'max_children': lu.max_children,
                    },
                )
                t1_units.append(tu)

            fare_matrix_pt = [
                (0, 1, Decimal('450000.00')),
                (1, 2, Decimal('220000.00')),
                (2, 3, Decimal('650000.00')),
                (0, 2, Decimal('600000.00')),
                (1, 3, Decimal('800000.00')),
                (0, 3, Decimal('1150000.00')),
            ]
            for f_seq, t_seq, price in fare_matrix_pt:
                TripFare.objects.get_or_create(
                    trip=trip1,
                    from_sequence=f_seq,
                    to_sequence=t_seq,
                    unit_kind='CABIN',
                    defaults={'base_amount': price, 'child_extra_amount': None, 'currency': 'VND'},
                )

            dep2 = (now + timedelta(days=1)).replace(hour=19, minute=30, second=0, microsecond=0)
            trip2, _ = Trip.objects.get_or_create(
                route=route_sv,
                vehicle=veh_sv,
                departure_at=dep2,
                defaults={'status': 'OPEN'},
            )
            for rs in stops_sv:
                TripStop.objects.get_or_create(
                    trip=trip2,
                    sequence=rs.sequence,
                    defaults={'route_stop': rs, 'scheduled_at': dep2 + timedelta(hours=rs.sequence * 5)},
                )
            for lu in sleeper_units:
                TripUnit.objects.get_or_create(
                    trip=trip2,
                    unit_code=lu.unit_code,
                    defaults={
                        'layout_unit': lu,
                        'kind': lu.kind,
                        'price_mode': lu.price_mode,
                        'max_adults': lu.max_adults,
                        'max_children': lu.max_children,
                    },
                )
            for f_seq, t_seq, price in [(0, 1, Decimal('320000.00')), (1, 2, Decimal('150000.00')), (0, 2, Decimal('420000.00'))]:
                TripFare.objects.get_or_create(
                    trip=trip2,
                    from_sequence=f_seq,
                    to_sequence=t_seq,
                    unit_kind='BED',
                    defaults={'base_amount': price, 'child_extra_amount': None, 'currency': 'VND'},
                )

            # 16. policy_versions (table 16 — CHỜ CHỐT rules kept unapproved/nullable for numeric thresholds)
            pv_platform, _ = PolicyVersion.objects.get_or_create(
                scope='PLATFORM',
                operator=None,
                version='v0.4-DRAFT',
                defaults={
                    'rules_json': {
                        'status': 'PENDING_APPROVAL',
                        'note': 'Child surcharge, refund tiers, and cutoff seconds await business owner sign-off.',
                    },
                    'effective_at': now,
                    'approved_at': None,
                },
            )

            # 17. bookings (table 17 — 1 CONFIRMED booking + 1 HOLDING booking)
            booking_conf, _ = Booking.objects.get_or_create(
                idempotency_key='seed-booking-confirmed-001',
                defaults={
                    'customer': customer1,
                    'booking_code': 'VXV-DEMO0001',
                    'status': 'CONFIRMED',
                    'hold_expires_at': now + timedelta(minutes=10),
                    'contact_email': customer1.email,
                    'total_amount': Decimal('650000.00'),
                    'currency': 'VND',
                    'pricing_snapshot': {'base_amount': '600000.00', 'pickup_fee': '50000.00', 'quote_accepted': True},
                    'policy_snapshot': pv_platform.rules_json,
                },
            )

            # 18. booking_items (table 18)
            item_conf, _ = BookingItem.objects.get_or_create(
                booking=booking_conf,
                trip_unit=t1_units[0],
                defaults={
                    'from_sequence': 0,
                    'to_sequence': 2,
                    'adult_count': 2,
                    'child_count': 0,
                    'unit_price': Decimal('600000.00'),
                    'child_surcharge': Decimal('0.00'),
                    'price_snapshot': {'unit_code': 'P01', 'segment': '[0,2)', 'unit_price': '600000.00'},
                },
            )

            # 19. booking_passengers (table 19) & 20. booking_item_passengers (table 20)
            pax1, _ = BookingPassenger.objects.get_or_create(
                booking=booking_conf,
                full_name='Nguyễn Văn An',
                defaults={'kind': 'ADULT', 'birth_date': date(1992, 5, 14), 'contact_phone': '0901234567'},
            )
            pax2, _ = BookingPassenger.objects.get_or_create(
                booking=booking_conf,
                full_name='Lê Thu Hà',
                defaults={'kind': 'ADULT', 'birth_date': date(1995, 8, 20), 'contact_phone': '0901234568'},
            )
            BookingItemPassenger.objects.get_or_create(item=item_conf, passenger=pax1)
            BookingItemPassenger.objects.get_or_create(item=item_conf, passenger=pax2)

            # 21. inventory_allocations (table 21)
            InventoryAllocation.objects.get_or_create(
                trip_unit=t1_units[0],
                booking_item=item_conf,
                defaults={
                    'section': Range(0, 2, '[)'),
                    'status': 'CONFIRMED',
                    'expires_at': booking_conf.hold_expires_at,
                },
            )

            # Also seed an active HELD booking on P02 for segment [0,1)
            booking_held, _ = Booking.objects.get_or_create(
                idempotency_key='seed-booking-holding-002',
                defaults={
                    'customer': customer2,
                    'booking_code': 'VXV-DEMO0002',
                    'status': 'HOLDING',
                    'hold_expires_at': now + timedelta(minutes=10),
                    'contact_email': customer2.email,
                    'total_amount': Decimal('450000.00'),
                    'currency': 'VND',
                    'pricing_snapshot': {'base_amount': '450000.00', 'quote_accepted': True},
                    'policy_snapshot': pv_platform.rules_json,
                },
            )
            item_held, _ = BookingItem.objects.get_or_create(
                booking=booking_held,
                trip_unit=t1_units[1],
                defaults={
                    'from_sequence': 0,
                    'to_sequence': 1,
                    'adult_count': 1,
                    'child_count': 0,
                    'unit_price': Decimal('450000.00'),
                    'child_surcharge': Decimal('0.00'),
                    'price_snapshot': {'unit_code': 'P02', 'segment': '[0,1)', 'unit_price': '450000.00'},
                },
            )
            InventoryAllocation.objects.get_or_create(
                trip_unit=t1_units[1],
                booking_item=item_held,
                defaults={
                    'section': Range(0, 1, '[)'),
                    'status': 'HELD',
                    'expires_at': booking_held.hold_expires_at,
                },
            )

            # 22. pickup_requests (table 22)
            PickupRequest.objects.get_or_create(
                booking_item=item_conf,
                direction='PICKUP',
                defaults={
                    'kind': 'FIXED',
                    'option': pickup_zone,
                    'requested_address': '120 Cầu Giấy, Hà Nội',
                    'fee_snapshot': Decimal('50000.00'),
                    'status': 'ACCEPTED',
                },
            )

            # 23. payment_intents (table 23) & 24. payment_transactions (table 24)
            pi_conf, _ = PaymentIntent.objects.get_or_create(
                provider='VNPAY',
                provider_reference='VNP-DEMO-0001',
                defaults={
                    'booking': booking_conf,
                    'amount': Decimal('650000.00'),
                    'currency': 'VND',
                    'status': 'PAID',
                    'qr_payload': 'VNPAY_QR:VXV-DEMO0001:650000.00',
                    'expires_at': booking_conf.hold_expires_at,
                },
            )
            pt_conf, _ = PaymentTransaction.objects.get_or_create(
                provider='VNPAY',
                provider_event_id='VNP-EVT-20261124-001',
                defaults={
                    'intent': pi_conf,
                    'provider_transaction_id': '14589201',
                    'amount': Decimal('650000.00'),
                    'status': 'PAID',
                    'occurred_at': now,
                    'verified_at': now,
                    'raw_event': {'vnp_ResponseCode': '00', 'vnp_TxnRef': 'VNP-DEMO-0001'},
                },
            )

            # 25. tickets (table 25)
            Ticket.objects.get_or_create(
                booking_item=item_conf,
                defaults={
                    'code': 'TK-DEMO0001',
                    'qr_token_hash': hashlib.sha256(b'TK-DEMO0001-SECRET').hexdigest(),
                    'issued_at': now,
                    'status': 'ISSUED',
                },
            )

            # 26. cancellation_requests (table 26) & 27. refunds (table 27 — PENDING manual review per OPEN-05)
            cr_demo, _ = CancellationRequest.objects.get_or_create(
                booking=booking_conf,
                requested_by=customer1,
                kind='CHANGE',
                defaults={
                    'reason': 'Khách xin đổi giờ khởi hành sang chuyến tối (chờ nhân viên xử lý).',
                    'status': 'PENDING',
                    'policy_snapshot': pv_platform.rules_json,
                },
            )
            Refund.objects.get_or_create(
                booking=booking_conf,
                request=cr_demo,
                defaults={
                    'payment_transaction': pt_conf,
                    'amount': Decimal('0.00'),
                    'status': 'PENDING',
                    'provider_ref': '',
                },
            )

            # 28. commission_agreements (table 28 — percentage=None per OPEN-06 CHỜ CHỐT)
            CommissionAgreement.objects.get_or_create(
                operator=op_pt,
                effective_from=date(2026, 1, 1),
                defaults={'percentage': None, 'effective_to': None, 'approved_at': None},
            )

            # 29. settlements (table 29 — DRAFT) & 30. settlement_lines (table 30)
            settlement_pt, _ = Settlement.objects.get_or_create(
                operator=op_pt,
                period_start=date(2026, 11, 1),
                period_end=date(2026, 11, 30),
                defaults={
                    'gross_amount': Decimal('650000.00'),
                    'commission_amount': Decimal('0.00'),
                    'payable_amount': Decimal('650000.00'),
                    'status': 'DRAFT',
                },
            )
            SettlementLine.objects.get_or_create(
                settlement=settlement_pt,
                booking_item=item_conf,
                defaults={
                    'gross_amount': Decimal('650000.00'),
                    'commission_rate_snapshot': None,
                    'commission_amount': None,
                },
            )

            # 31. destinations (table 31) & 32. posts (table 32)
            dest_hue, _ = Destination.objects.get_or_create(
                slug='co-do-hue',
                defaults={
                    'name': 'Cố đô Huế — Di sản miền Trung',
                    'intro': 'Hành trình xe Limousine giường phòng từ Hà Nội & TP.HCM đi Huế.',
                    'cover_image_url': 'https://vexuyenviet.vn/media/destinations/hue.jpg',
                    'is_published': True,
                },
            )
            dest_dn, _ = Destination.objects.get_or_create(
                slug='da-nang-thanh-pho-bien',
                defaults={
                    'name': 'Đà Nẵng — Thành phố đáng sống',
                    'intro': 'Tuyến xe khách đường dài chất lượng cao kết nối Đà Nẵng.',
                    'cover_image_url': 'https://vexuyenviet.vn/media/destinations/danang.jpg',
                    'is_published': True,
                },
            )
            Post.objects.get_or_create(
                slug='kinh-nghiem-chon-phong-limousine-2-tang-xuyen-viet',
                defaults={
                    'title': 'Kinh nghiệm chọn phòng Limousine 2 tầng đi xuyên Việt êm ái nhất',
                    'summary': 'Hướng dẫn chọn vị trí phòng tầng 1 và tầng 2 trên xe Limousine 20 phòng đôi.',
                    'body': 'Khi đặt vé trên Vé Xuyên Việt, hành khách có thể chọn trực tiếp từng mã phòng P01–P20 theo chặng và giữ chỗ trong 10 phút.',
                    'category': 'TRAVEL',
                    'destination': dest_hue,
                    'published_at': now,
                    'author': admin,
                },
            )
            Post.objects.get_or_create(
                slug='lich-chay-va-diem-don-tra-tuyen-ha-noi-da-nang',
                defaults={
                    'title': 'Lịch chạy và các điểm đón trả cố định tuyến Hà Nội – Huế – Đà Nẵng',
                    'summary': 'Tổng hợp giờ xuất bến và điểm đón trả của các hãng xe uy tín trên sàn.',
                    'body': 'Các chuyến mở bán theo chặng trung gian giúp tối ưu chi phí và linh hoạt lựa chọn giờ đi.',
                    'category': 'OPERATOR_NEWS',
                    'destination': dest_dn,
                    'published_at': now,
                    'author': admin,
                },
            )

            # 33. audit_logs (table 33) & 34. outbox_events (table 34)
            AuditLog.objects.get_or_create(
                action='SEED_DEMO_DATABASE',
                resource_type='System',
                resource_id='ALL_34_TABLES',
                defaults={
                    'actor': admin,
                    'operator': op_pt,
                    'metadata': {'tables_seeded': 34, 'note': 'Demo seed completed'},
                },
            )
            OutboxEvent.objects.get_or_create(
                event_type='ticket.issued.v1',
                aggregate_id=booking_conf.id,
                defaults={
                    'payload': {'booking_code': booking_conf.booking_code, 'ticket_code': 'TK-DEMO0001'},
                    'published_at': now,
                    'attempts': 1,
                },
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded sample data into all 34 PostgreSQL tables!'))
