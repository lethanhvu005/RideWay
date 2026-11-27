export interface LocationItem {
  id: string;
  name: string;
  province: string;
}

export interface VehicleTypeItem {
  id: string;
  name: string;
  seat_capacity: number;
}

export interface TripSummary {
  id: string;
  route_name: string;
  operator_id: string;
  operator_name: string;
  vehicle_type: string;
  departure_at: string;
  boarding_at?: string;
  from_sequence?: number;
  to_sequence?: number;
  from_location_name?: string;
  to_location_name?: string;
  min_price: string | null;
  available_units?: number;
  total_units?: number;
}

export interface TripStopDetail {
  sequence: number;
  location_id: string;
  location_name: string;
  province?: string;
  arrival_offset_minutes?: number;
  departure_offset_minutes?: number;
}

export interface TripDetail extends TripSummary {
  status?: string;
  route_id?: string;
  vehicle_registration?: string;
  stops?: TripStopDetail[];
}

export interface DestinationItem {
  id: string;
  name: string;
  slug: string;
  intro: string;
}

export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  published_at: string;
}

export interface PostDetail extends PostSummary {
  body: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_staff: boolean;
  is_superuser: boolean;
  memberships: Array<{ operator_id: string; role: string; operator__name: string }>;
}

export interface BookingDetailItem {
  id: string;
  trip_unit_id: string;
  trip_unit__unit_code: string;
  adult_count: number;
  child_count: number;
  unit_price: string;
  from_sequence?: number;
  to_sequence?: number;
}

export interface BookingDetail {
  id: string;
  booking_code: string;
  status: string;
  hold_expires_at: string;
  total_amount: string;
  currency: string;
  items: BookingDetailItem[];
  passengers?: Array<{
    id: string;
    full_name: string;
    kind: string;
    contact_phone: string;
  }>;
  pickup_requests?: Array<{
    id: string;
    direction: string;
    kind: string;
    requested_address: string;
    status: string;
    quoted_fee: string;
  }>;
}

export interface TicketItem {
  id: string;
  code: string;
  status: string;
  booking_id?: string;
  booking_code: string;
  unit_code: string;
  qr_token?: string;
  issued_at?: string;
}

export const SEGMENT_PRESETS = [
  { label: 'Chặng 0 → 1 (Hà Nội → Cố đô Huế)', from: 0, to: 1, duration: '10h00' },
  { label: 'Chặng 1 → 2 (Cố đô Huế → Đà Nẵng)', from: 1, to: 2, duration: '03h00' },
  { label: 'Chặng 0 → 2 (Hà Nội → Đà Nẵng)', from: 0, to: 2, duration: '13h00' },
  { label: 'Chặng 0 → 3 (Hà Nội → TP.HCM • Toàn tuyến)', from: 0, to: 3, duration: '28h00' },
];

export const HERO_SLIDES = [
  {
    sub: 'Cam kết hoàn 150% nếu nhà xe không giữ chỗ • Vé Xuyên Việt – RideWay',
    title: 'Đặt vé xe khách & Limousine 2 tầng Xuyên Việt trực tuyến',
    desc: 'Chọn chính xác vị trí phòng đôi VIP (2NL + 1TE) hoặc giường nằm theo từng đoạn chặng. Giữ chỗ nguyên tử 10 phút, thanh toán VNPay QR 100% xuất vé điện tử tức thì.',
    bg: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=85',
  },
  {
    sub: '50+ Nhà xe Limousine & Giường nằm 2 tầng uy tín',
    title: 'Hành trình êm ái dọc dải đất hình chữ S',
    desc: 'Kết nối Hà Nội – Cố đô Huế – Đà Nẵng – TP.HCM với giá vé tính đúng trên đoạn chặng bạn đi, không lo trả thừa giá toàn tuyến.',
    bg: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1920&q=85',
  },
  {
    sub: 'Khoang Phòng Đôi VIP • Giữ chỗ nguyên tử 10 phút',
    title: 'Khám phá vùng núi & cung đường hùng vĩ Việt Nam',
    desc: 'Tận hưởng những chuyến hành trình xuyên Việt êm ái trên xe Limousine 20 phòng đôi & giường nằm 2 tầng với sơ đồ chọn chỗ thời gian thực.',
    bg: '/images/terraces-banner.jpg',
  },
  {
    sub: 'Thanh toán VNPay QR 100% • Vé điện tử HMAC an toàn',
    title: 'Trải nghiệm du lịch đường dài tiện nghi & an tâm',
    desc: 'Hỗ trợ đón trả tận nơi, báo giá minh bạch theo từng chặng và xuất vé điện tử QR ngay sau khi đối chiếu thanh toán.',
    bg: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1920&q=85',
  },
];

export const POPULAR_ROUTE_CARDS = [
  {
    origin: 'Tuyến xe từ Hà Nội',
    img: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=700&q=80',
    bgColor: '#1858b8',
    routes: [
      { dest: 'Đi Cố đô Huế', meta: '658 km • 10 giờ', price: '450.000₫', segIdx: 0 },
      { dest: 'Đi Đà Nẵng', meta: '766 km • 13 giờ', price: '600.000₫', segIdx: 2 },
      { dest: 'Đi TP. Hồ Chí Minh', meta: '1.720 km • 28 giờ', price: '1.150.000₫', segIdx: 3 },
    ],
  },
  {
    origin: 'Tuyến xe từ Cố đô Huế',
    img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
    bgColor: '#0d2e59',
    routes: [
      { dest: 'Đi Đà Nẵng', meta: '105 km • 2.5 giờ', price: '150.000₫', segIdx: 1 },
      { dest: 'Đi Hà Nội (Chặng 0→1)', meta: '658 km • 10 giờ', price: '450.000₫', segIdx: 0 },
      { dest: 'Đi TP.HCM (Toàn tuyến)', meta: '1.050 km • 18 giờ', price: '1.150.000₫', segIdx: 3 },
    ],
  },
  {
    origin: 'Tuyến xe đi Đà Nẵng',
    img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=700&q=80',
    bgColor: '#1d68d8',
    routes: [
      { dest: 'Từ Hà Nội → Đà Nẵng', meta: 'Limousine 20 Phòng', price: '600.000₫', segIdx: 2 },
      { dest: 'Từ Huế → Đà Nẵng', meta: 'Giường nằm 2 tầng', price: '150.000₫', segIdx: 1 },
      { dest: 'Xuyên Việt qua Đà Nẵng', meta: 'Khoang VIP 2 tầng', price: '1.150.000₫', segIdx: 3 },
    ],
  },
  {
    origin: 'Limousine Phòng Đôi VIP',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=700&q=80',
    bgColor: '#143c70',
    routes: [
      { dest: 'Phòng đôi Hà Nội – Huế', meta: '2 NL + 1 TE • Tầng 1&2', price: '450.000₫', segIdx: 0 },
      { dest: 'Phòng đôi Hà Nội – Đà Nẵng', meta: '2 NL + 1 TE • Rèm riêng', price: '600.000₫', segIdx: 2 },
      { dest: 'Phòng đôi Bắc – Nam', meta: '2 NL + 1 TE • Massage', price: '1.150.000₫', segIdx: 3 },
    ],
  },
];

export const ADVENTURE_TABS = [
  {
    id: 'cabin',
    icon: '👑',
    label: 'Phòng đôi Limousine',
    title: 'Khoang phòng đôi Limousine 2 tầng riêng tư (2 NL + 1 TE)',
    desc: 'Mỗi phòng đôi là một đơn vị tồn kho độc lập (P01–P20), trang bị ghế massage, màn hình giải trí, rèm che kín đáo và cổng sạc nhanh.',
  },
  {
    id: 'sleeper',
    icon: '🛏️',
    label: 'Giường nằm 2 tầng',
    title: 'Hệ thống xe giường nằm 24–34 chỗ tiêu chuẩn cao cấp',
    desc: 'Sơ đồ giường tầng 1 và tầng 2 trực quan, chăn gối khử khuẩn sau mỗi chuyến, phù hợp di chuyển cá nhân tiết kiệm.',
  },
  {
    id: 'segment',
    icon: '🗺️',
    label: 'Bán vé theo chặng',
    title: 'Linh hoạt đặt vé theo từng đoạn chặng [Điểm đi → Điểm đến)',
    desc: 'Chọn đúng điểm đi và điểm đến, chỉ thanh toán đúng mức giá của đoạn đường bạn sử dụng.',
  },
  {
    id: 'hold',
    icon: '⏱️',
    label: 'Giữ chỗ 10 phút',
    title: 'Giữ nhiều phòng nguyên tử All-or-Nothing trong 10 phút',
    desc: 'Chọn nhiều phòng trong cùng một đơn và giữ chỗ trong 10 phút để hoàn tất thanh toán.',
  },
  {
    id: 'vnpay',
    icon: '📲',
    label: 'Thanh toán VNPay QR',
    title: 'Thanh toán 100% qua VNPay QR & Phát hành vé tự động',
    desc: 'Đối chiếu chữ ký HMAC-SHA512 idempotent từ cổng thanh toán, phát hành ngay 1 mã vé điện tử QR cho mỗi phòng đặt thành công.',
  },
  {
    id: 'pickup',
    icon: '🚐',
    label: 'Đón trả tận nơi',
    title: 'Đón tại bến cố định hoặc nhập địa chỉ đón trả riêng',
    desc: 'Hỗ trợ chọn điểm đón cố định miễn phí, vùng nội thành có phụ phí rõ ràng hoặc gửi yêu cầu địa chỉ riêng để hãng xe báo giá.',
  },
];

export const MONA_DISCOVER_CARDS = [
  { title: 'Khám phá quần đảo', label: 'PHIÊU LƯU', image: '/images/terraces-banner.jpg', slug: 'da-nang' },
  { title: 'Khám phá hang động', label: 'PHIÊU LƯU', image: '/images/adventure-hero.jpg', slug: 'hue' },
  { title: 'Khám phá ngọn núi', label: 'PHIÊU LƯU', image: '/images/mountain-hero.jpg', slug: 'ha-noi' },
  { title: 'Khám phá thung lũng', label: 'PHIÊU LƯU', image: '/images/city-route.jpg', slug: 'tp-hcm' },
  { title: 'Khám phá cung đường biển', label: 'HÀNH TRÌNH', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80', slug: 'da-nang' },
  { title: 'Khám phá cố đô di sản', label: 'VĂN HÓA', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80', slug: 'hue' },
  { title: 'Khám phá cao nguyên đá', label: 'PHIÊU LƯU', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', slug: 'ha-noi' },
  { title: 'Khám phá thế giới', label: 'TRẢI NGHIỆM', image: '/images/terraces-banner.jpg', slug: 'da-nang' },
];

export const MONA_STATS = [
  { value: '3500+', label: 'Khách hàng thân thiết', icon: '♧' },
  { value: '1650+', label: 'Chuyến xe đã mở bán', icon: '⌁' },
  { value: '99.5%', label: 'Đánh giá tích cực', icon: '★' },
  { value: '62+', label: 'Tuyến đường kết nối', icon: '⚑' },
];
