import { useEffect, useState } from 'react';
import { apiFetch } from './api/client';
import { CheckoutFlowModal, type ActiveHoldBooking } from './components/CheckoutFlowModal';
import { AdminPortal, MyTicketsPortal, OperatorPortal } from './components/PortalViews';
import { SeatLayout2Deck, type SelectedUnitConfig, type TripUnitItem } from './components/SeatLayout2Deck';
import { AuthDialog } from './components/AuthDialog';
import './styles/theme.css';
import './styles/account.css';
import './styles/motion.css';

interface LocationItem {
  id: string;
  name: string;
  province: string;
}

interface TripSummary {
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

interface DestinationItem {
  id: string;
  name: string;
  slug: string;
  intro: string;
}

interface PostSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  published_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  memberships: Array<{ operator_id: string; role: string; operator__name: string }>;
}

const SEGMENT_PRESETS = [
  { label: 'Chặng 0 → 1 (Hà Nội → Cố đô Huế)', from: 0, to: 1, duration: '10h00' },
  { label: 'Chặng 1 → 2 (Cố đô Huế → Đà Nẵng)', from: 1, to: 2, duration: '03h00' },
  { label: 'Chặng 0 → 2 (Hà Nội → Đà Nẵng)', from: 0, to: 2, duration: '13h00' },
  { label: 'Chặng 0 → 3 (Hà Nội → TP.HCM • Toàn tuyến)', from: 0, to: 3, duration: '28h00' },
];

const HERO_SLIDES = [
  {
    sub: 'Cam kết hoàn 150% nếu nhà xe không giữ chỗ • Vé Xuyên Việt',
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

const POPULAR_ROUTE_CARDS = [
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

const ADVENTURE_TABS = [
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

export function App() {
  const [activePortal, setActivePortal] = useState<'PUBLIC' | 'MY_TICKETS' | 'OPERATOR' | 'ADMIN'>('PUBLIC');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [advTab, setAdvTab] = useState(ADVENTURE_TABS[0]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [activePostDetail, setActivePostDetail] = useState<{ title: string; body: string; category: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Vexere-Style Search & Sidebar Filter States */
  const [transportTab, setTransportTab] = useState<'ALL' | 'LIMO' | 'SLEEPER'>('ALL');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [filterVehicleKind, setFilterVehicleKind] = useState<'ALL' | 'LIMO' | 'SLEEPER'>('ALL');
  const [filterOperatorId, setFilterOperatorId] = useState<string>('ALL');
  const [filterTimeSlot, setFilterTimeSlot] = useState<'ALL' | 'EARLY' | 'MORNING' | 'AFTERNOON' | 'NIGHT'>('ALL');

  /* 2-Deck Seat Layout & Segment Selection */
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [segmentIdx, setSegmentIdx] = useState<number>(2);
  const [units, setUnits] = useState<TripUnitItem[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectedUnitConfig>>({});
  const [holdingBusy, setHoldingBusy] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [activeHold, setActiveHold] = useState<ActiveHoldBooking | null>(null);
  const [expandedDetailTripId, setExpandedDetailTripId] = useState<string | null>(null);

  const refreshProfile = () => {
    apiFetch<UserProfile>('/me')
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  };

  const loadTrips = (overrideSegIdx?: number) => {
    setLoading(true);
    setError(null);
    const activeSeg = SEGMENT_PRESETS[overrideSegIdx ?? segmentIdx];
    const params = new URLSearchParams();
    if (fromLocationId) params.set('from_location_id', fromLocationId);
    if (toLocationId) params.set('to_location_id', toLocationId);
    if (!fromLocationId && !toLocationId && activeSeg) {
      params.set('from_sequence', String(activeSeg.from));
      params.set('to_sequence', String(activeSeg.to));
    }
    if (dateQuery) params.set('departure_date', dateQuery);
    if (sortBy) params.set('sort', sortBy);

    apiFetch<{ results: TripSummary[] }>(`/trips?${params.toString()}`)
      .then((res) => {
        setTrips(res.results);
        if (res.results.length > 0) {
          const first = res.results[0];
          const fSeq = first.from_sequence ?? activeSeg.from;
          const tSeq = first.to_sequence ?? activeSeg.to;
          void fetchTripUnits(first.id, fSeq, tSeq);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const fetchTripUnits = async (tripId: string, fromSeq: number, toSeq: number) => {
    setSelectedTripId(tripId);
    setSelectedMap({});
    setHoldError(null);
    try {
      const res = await apiFetch<{ units: TripUnitItem[] }>(
        `/trips/${tripId}/units?from_sequence=${fromSeq}&to_sequence=${toSeq}`
      );
      setUnits(res.units);
    } catch (err) {
      setHoldError(err instanceof Error ? err.message : 'Không tải được sơ đồ chỗ');
    }
  };

  useEffect(() => {
    refreshProfile();
    loadTrips();
    apiFetch<{ results: LocationItem[] }>('/locations').then((r) => setLocations(r.results)).catch(() => {});
    apiFetch<{ results: DestinationItem[] }>('/destinations').then((r) => setDestinations(r.results)).catch(() => {});
    apiFetch<{ results: PostSummary[] }>('/posts').then((r) => setPosts(r.results)).catch(() => {});
  }, []);

  const handleSwapLocations = () => {
    const prevFrom = fromLocationId;
    setFromLocationId(toLocationId);
    setToLocationId(prevFrom);
  };

  const handleLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    setCurrentUser(null);
    setActivePortal('PUBLIC');
  };

  const handleToggleUnit = (u: TripUnitItem) => {
    setSelectedMap((prev) => {
      const copy = { ...prev };
      if (copy[u.id]) {
        delete copy[u.id];
      } else {
        copy[u.id] = {
          trip_unit_id: u.id,
          unit_code: u.unit_code,
          kind: u.kind,
          price: Number(u.price || 0),
          max_adults: u.max_adults ?? 1,
          max_children: u.max_children ?? 0,
          adult_count: 1,
          child_count: 0,
        };
      }
      return copy;
    });
  };

  const handleUpdateCounts = (unitId: string, adultCount: number, childCount: number) => {
    setSelectedMap((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], adult_count: adultCount, child_count: childCount },
    }));
  };

  const handleProceedHold = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!selectedTripId) return;
    const activeTrip = trips.find((t) => t.id === selectedTripId);
    const seg = SEGMENT_PRESETS[segmentIdx];
    const fromSeq = activeTrip?.from_sequence ?? seg.from;
    const toSeq = activeTrip?.to_sequence ?? seg.to;
    const unitPayload = Object.values(selectedMap).map((item) => ({
      trip_unit_id: item.trip_unit_id,
      adult_count: item.adult_count,
      child_count: item.child_count,
    }));

    setHoldingBusy(true);
    setHoldError(null);
    try {
      const idemKey = `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await apiFetch<ActiveHoldBooking>('/holds', {
        method: 'POST',
        headers: { 'Idempotency-Key': idemKey },
        body: JSON.stringify({
          trip_id: selectedTripId,
          from_sequence: fromSeq,
          to_sequence: toSeq,
          units: unitPayload,
        }),
      });
      setActiveHold(res);
      void fetchTripUnits(selectedTripId, fromSeq, toSeq);
    } catch (err) {
      setHoldError(err instanceof Error ? err.message : 'Không thể giữ chỗ');
    } finally {
      setHoldingBusy(false);
    }
  };

  const openArticle = async (slug: string) => {
    try {
      const detail = await apiFetch<{ title: string; body: string; category: string }>(`/posts/${slug}`);
      setActivePostDetail(detail);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(
      '.gw-section, .gw-dark-section, .gw-activity-card, .gw-tour-card, .vxr-route-card'
    ));
    const setup = () => {
      observer?.disconnect();
      elements.forEach((el) => el.classList.remove('motion-pending'));
      if (preference.matches || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('motion-pending');
            entry.target.classList.add('motion-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.06 });
      elements.forEach((el) => {
        if (el.classList.contains('motion-visible')) return;
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        el.classList.add('motion-pending');
        observer?.observe(el);
      });
    };
    setup();
    preference.addEventListener('change', setup);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', setup);
      elements.forEach((el) => el.classList.remove('motion-pending'));
    };
  }, [activePortal, destinations.length, posts.length]);

  const activeSlide = HERO_SLIDES[slideIdx];

  /* Smooth automatic hero slider rotation every 4 seconds */
  useEffect(() => {
    if (activePortal !== 'PUBLIC') return;
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [activePortal]);

  /* Filter trips client-side according to Vexere Sidebar selections */
  const uniqueOperators = Array.from(
    new Map(trips.map((t) => [t.operator_id, { id: t.operator_id, name: t.operator_name }])).values()
  );

  const filteredTrips = trips.filter((t) => {
    if (filterOperatorId !== 'ALL' && t.operator_id !== filterOperatorId) return false;
    if (filterVehicleKind === 'LIMO' && !t.vehicle_type.toLowerCase().includes('limousine')) return false;
    if (filterVehicleKind === 'SLEEPER' && !t.vehicle_type.toLowerCase().includes('giường')) return false;
    if (filterTimeSlot !== 'ALL') {
      const hour = new Date(t.departure_at).getHours();
      if (filterTimeSlot === 'EARLY' && !(hour >= 0 && hour < 6)) return false;
      if (filterTimeSlot === 'MORNING' && !(hour >= 6 && hour < 12)) return false;
      if (filterTimeSlot === 'AFTERNOON' && !(hour >= 12 && hour < 18)) return false;
      if (filterTimeSlot === 'NIGHT' && !(hour >= 18 && hour <= 23)) return false;
    }
    return true;
  });

  const formatTimeHHMM = (isoStr?: string) => {
    if (!isoStr) return '08:00';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '08:00';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div>
      {/* 1. VEXERE DEEP OCEAN NAVY TOPBAR (#0D2E59) */}
      <div className="gw-topbar">
        <div className="gw-topbar-inner">
          <div className="gw-topbar-left">
            <span>
              <i>🛡️</i> Cam kết hoàn 150% nếu nhà xe không giữ chỗ
            </span>
            <span>
              <i>📞</i> Hotline 24/7: <strong>1900 6886</strong>
            </span>
            <span>
              <i>✉️</i> hotro@vexuyenviet.vn
            </span>
          </div>

          <div className="gw-topbar-right">
            <a href="#booking-map" className="gw-book-now-top" onClick={() => setActivePortal('PUBLIC')}>
              ĐẶT VÉ NGAY
            </a>
            <button
              type="button"
              className={`gw-portal-pill ${activePortal === 'PUBLIC' ? 'active' : ''}`}
              onClick={() => setActivePortal('PUBLIC')}
            >
              Trang chủ
            </button>
            <button
              type="button"
              className={`gw-portal-pill ${activePortal === 'MY_TICKETS' ? 'active' : ''}`}
              onClick={() => (currentUser ? setActivePortal('MY_TICKETS') : setShowAuthModal(true))}
            >
              Đơn hàng của tôi
            </button>
            <button
              type="button"
              className={`gw-portal-pill ${activePortal === 'OPERATOR' ? 'active' : ''}`}
              onClick={() => (currentUser ? setActivePortal('OPERATOR') : setShowAuthModal(true))}
            >
              Mở bán trên VéXuyênViệt
            </button>
            <button
              type="button"
              className={`gw-portal-pill ${activePortal === 'ADMIN' ? 'active' : ''}`}
              onClick={() => (currentUser ? setActivePortal('ADMIN') : setShowAuthModal(true))}
            >
              Quản trị sàn
            </button>
          </div>
        </div>
      </div>

      {/* 2. VEXERE OCEAN-BLUE & WHITE STICKY HEADER */}
      <header className="gw-header">
        <div className="gw-header-inner">
          <div className="gw-logo" onClick={() => setActivePortal('PUBLIC')}>
            <div className="gw-logo-mark">🚍</div>
            <div className="gw-logo-text">
              Vé<span>XuyênViệt</span>
            </div>
          </div>

          <nav className="gw-nav" aria-label="Điều hướng chính">
            <a href="#popular-routes" className="gw-nav-item" onClick={() => setActivePortal('PUBLIC')}>Tuyến phổ biến</a>
            <a href="#booking-map" className="gw-nav-item" onClick={() => setActivePortal('PUBLIC')}>Lịch trình & Sơ đồ 2 tầng</a>
            <a href="#about" className="gw-nav-item" onClick={() => setActivePortal('PUBLIC')}>Ưu điểm nền tảng</a>
            <a href="#destinations" className="gw-nav-item" onClick={() => setActivePortal('PUBLIC')}>Bến xe & Điểm đến</a>
            <a href="#news" className="gw-nav-item" onClick={() => setActivePortal('PUBLIC')}>Cẩm nang</a>
          </nav>

          <div className="gw-header-actions">
            {currentUser ? (
              <>
                <span className="gw-user-pill" title={currentUser.full_name || currentUser.email}>
                  👤 {currentUser.full_name || currentUser.email}
                </span>
                <button type="button" className="gw-logout-btn" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <button
                type="button"
                aria-label="Đăng nhập tài khoản"
                className="vx-btn-primary"
                style={{ padding: '8px 15px', fontSize: 13, minHeight: 38, whiteSpace: 'nowrap' }}
                onClick={() => setShowAuthModal(true)}
              >
                👤 Đăng nhập / Đăng ký
              </button>
            )}
            <button
              type="button"
              className="gw-hamburger-btn"
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Slide-down Drawer Menu */}
        <div id="mobile-navigation" className={`gw-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#top" onClick={() => { setActivePortal('PUBLIC'); setMobileMenuOpen(false); }}>🏠 Trang chủ</a>
          <a href="#popular-routes" onClick={() => { setActivePortal('PUBLIC'); setMobileMenuOpen(false); }}>🔥 Tuyến đường phổ biến</a>
          <a href="#booking-map" onClick={() => { setActivePortal('PUBLIC'); setMobileMenuOpen(false); }}>🛏️ Tìm chuyến & Sơ đồ 2 tầng</a>
          <a href="#about" onClick={() => { setActivePortal('PUBLIC'); setMobileMenuOpen(false); }}>🛡️ Cam kết Vé Xuyên Việt</a>
          <a href="#destinations" onClick={() => { setActivePortal('PUBLIC'); setMobileMenuOpen(false); }}>📍 Điểm đến nổi bật</a>
          <a href="#news" onClick={() => { setActivePortal('PUBLIC'); setMobileMenuOpen(false); }}>📰 Tin tức & Cẩm nang</a>
          <button
            type="button"
            className={`gw-mobile-nav-btn ${activePortal === 'MY_TICKETS' ? 'active' : ''}`}
            onClick={() => {
              setMobileMenuOpen(false);
              if (currentUser) setActivePortal('MY_TICKETS');
              else setShowAuthModal(true);
            }}
          >
            <span>🎟️ Đơn hàng của tôi</span>
            <span>➜</span>
          </button>
          <button
            type="button"
            className={`gw-mobile-nav-btn ${activePortal === 'OPERATOR' ? 'active' : ''}`}
            onClick={() => {
              setMobileMenuOpen(false);
              if (currentUser) setActivePortal('OPERATOR');
              else setShowAuthModal(true);
            }}
          >
            <span>🏢 Mở bán trên VéXuyênViệt</span>
            <span>➜</span>
          </button>
          <button
            type="button"
            className={`gw-mobile-nav-btn ${activePortal === 'ADMIN' ? 'active' : ''}`}
            onClick={() => {
              setMobileMenuOpen(false);
              if (currentUser) setActivePortal('ADMIN');
              else setShowAuthModal(true);
            }}
          >
            <span>⚙️ Quản trị sàn</span>
            <span>➜</span>
          </button>
          {currentUser && (
            <button
              type="button"
              className="gw-mobile-nav-btn"
              style={{ background: '#fee2e2', color: '#b91c1c' }}
              onClick={() => { setMobileMenuOpen(false); void handleLogout(); }}
            >
              <span>🚪 Đăng xuất ({currentUser.full_name || currentUser.email})</span>
              <span>✕</span>
            </button>
          )}
        </div>
      </header>

      {/* Portal Switch Views */}
      {activePortal === 'MY_TICKETS' && <MyTicketsPortal />}
      {activePortal === 'OPERATOR' && <OperatorPortal />}
      {activePortal === 'ADMIN' && <AdminPortal />}

      {/* PUBLIC VEXERE OCEAN-BLUE HOMEPAGE */}
      {activePortal === 'PUBLIC' && (
        <>
          {/* 3. FULL-SIZE CLEAR SCENIC HERO SLIDER (No blue tint, smooth automatic crossfade) */}
          <section className="gw-hero" id="top">
            {HERO_SLIDES.map((s, idx) => (
              <div
                key={s.bg}
                className={`gw-hero-slide-layer ${idx === slideIdx ? 'active' : ''}`}
                style={{ backgroundImage: `url(${s.bg})` }}
                aria-hidden="true"
              />
            ))}
            <div className="gw-hero-inner">
              <span key={`sub-${slideIdx}`} className="gw-hero-sub motion-hero-text">{activeSlide.sub}</span>
              <h1 key={`title-${slideIdx}`} className="motion-hero-text">{activeSlide.title}</h1>
              <p key={`desc-${slideIdx}`} className="motion-hero-text">{activeSlide.desc}</p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <a href="#booking-map" className="gw-btn-orange">
                  Chọn phòng 2 tầng ngay <span>➜</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSlideIdx((slideIdx + 1) % HERO_SLIDES.length)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.45)',
                    backdropFilter: 'blur(6px)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.45)',
                    borderRadius: 10,
                    padding: '12px 18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đổi banner ⟳
                </button>
                <div className="gw-hero-dots" role="tablist" aria-label="Chọn slide ảnh bìa">
                  {HERO_SLIDES.map((s, idx) => (
                    <button
                      key={s.title}
                      type="button"
                      role="tab"
                      aria-selected={idx === slideIdx}
                      aria-label={`Slide ${idx + 1}`}
                      className={`gw-hero-dot ${idx === slideIdx ? 'active' : ''}`}
                      onClick={() => setSlideIdx(idx)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. VEXERE TABBED SEARCH WIDGET + SWAP BUTTON + 4-PILLAR TRUST STRIP (Placed below Hero so it never covers the hero photo) */}
          <div className="gw-search-wrap">
            <div className="vxr-search-card">
              {/* Transport Mode Tabs */}
              <div className="vxr-mode-tabs">
                <button
                  type="button"
                  className={`vxr-mode-tab ${transportTab === 'ALL' ? 'active' : ''}`}
                  onClick={() => {
                    setTransportTab('ALL');
                    setFilterVehicleKind('ALL');
                  }}
                >
                  <span>🚍</span>
                  <span>Xe khách & Limousine 2 tầng</span>
                  <span className="vxr-tab-badge">Giữ chỗ 10p</span>
                </button>
                <button
                  type="button"
                  className={`vxr-mode-tab ${transportTab === 'LIMO' ? 'active' : ''}`}
                  onClick={() => {
                    setTransportTab('LIMO');
                    setFilterVehicleKind('LIMO');
                  }}
                >
                  <span>👑</span>
                  <span>Phòng đôi Limousine VIP (2NL + 1TE)</span>
                  <span className="vxr-tab-badge">Hot</span>
                </button>
                <button
                  type="button"
                  className={`vxr-mode-tab ${transportTab === 'SLEEPER' ? 'active' : ''}`}
                  onClick={() => {
                    setTransportTab('SLEEPER');
                    setFilterVehicleKind('SLEEPER');
                  }}
                >
                  <span>🛏️</span>
                  <span>Giường nằm 2 tầng tiêu chuẩn</span>
                </button>
              </div>

              {/* Search Inputs with Swap Button */}
              <form
                className="vxr-search-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  loadTrips();
                  document.getElementById('booking-map')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="vxr-input-box">
                  <span className="gw-field-icon">🔵</span>
                  <div style={{ width: '100%', minWidth: 0 }}>
                    <span className="gw-field-label">Nơi xuất phát</span>
                    <select
                      className="gw-field-control"
                      value={fromLocationId}
                      onChange={(e) => setFromLocationId(e.target.value)}
                    >
                      <option value="">Tất cả điểm đi</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.province || loc.name} ({loc.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="vxr-swap-btn"
                  title="Đổi chiều điểm đi và điểm đến"
                  aria-label="Đổi chiều điểm đi và điểm đến"
                  onClick={handleSwapLocations}
                >
                  ⇄
                </button>

                <div className="vxr-input-box">
                  <span className="gw-field-icon">📍</span>
                  <div style={{ width: '100%', minWidth: 0 }}>
                    <span className="gw-field-label">Nơi đến</span>
                    <select
                      className="gw-field-control"
                      value={toLocationId}
                      onChange={(e) => setToLocationId(e.target.value)}
                    >
                      <option value="">Tất cả điểm đến</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.province || loc.name} ({loc.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="vxr-input-box">
                  <span className="gw-field-icon">📅</span>
                  <div style={{ width: '100%', minWidth: 0 }}>
                    <span className="gw-field-label">Ngày đi</span>
                    <input
                      type="date"
                      className="gw-field-control"
                      value={dateQuery}
                      onChange={(e) => setDateQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="vxr-input-box">
                  <span className="gw-field-icon">🗺️</span>
                  <div style={{ width: '100%', minWidth: 0 }}>
                    <span className="gw-field-label">Đoạn chặng nhanh</span>
                    <select
                      className="gw-field-control"
                      value={segmentIdx}
                      onChange={(e) => {
                        const nextIdx = Number(e.target.value);
                        setSegmentIdx(nextIdx);
                        if (selectedTripId) {
                          void fetchTripUnits(
                            selectedTripId,
                            SEGMENT_PRESETS[nextIdx].from,
                            SEGMENT_PRESETS[nextIdx].to
                          );
                        }
                      }}
                    >
                      {SEGMENT_PRESETS.map((seg, i) => (
                        <option key={seg.label} value={i}>
                          {seg.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="vxr-search-submit">
                  🔍 Tìm kiếm
                </button>
              </form>

              {/* Vexere 4-Badge Trust Strip */}
              <div className="vxr-trust-strip">
                <div className="vxr-trust-item">
                  <span className="vxr-trust-icon">✔</span>
                  <span>Chắc chắn có chỗ (Giữ chỗ PostgreSQL 10 phút)</span>
                </div>
                <div className="vxr-trust-item">
                  <span className="vxr-trust-icon">🎧</span>
                  <span>Hỗ trợ khách hàng 24/7</span>
                </div>
                <div className="vxr-trust-item">
                  <span className="vxr-trust-icon">🏷️</span>
                  <span>Giá đúng theo từng đoạn chặng</span>
                </div>
                <div className="vxr-trust-item">
                  <span className="vxr-trust-icon">💳</span>
                  <span>Thanh toán VNPay QR 100% xuất vé tức thì</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. VEXERE "TUYẾN ĐƯỜNG PHỔ BIẾN" (4 Color-Header Cards with Instant Segment Price Tiers) */}
          <section className="gw-section" id="popular-routes">
            <div className="vx-section-header">
              <div>
                <span className="gw-sub-pill">Tuyến đường phổ biến</span>
                <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
                  Các tuyến xe khách & Limousine được đặt nhiều nhất
                </h2>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
                Chạm vào từng chặng để nạp ngay sơ đồ phòng/giường 2 tầng thời gian thực
              </div>
            </div>

            <div className="vxr-popular-grid">
              {POPULAR_ROUTE_CARDS.map((card) => (
                <div key={card.origin} className="vxr-route-card">
                  <div
                    className="vxr-route-card-header"
                    style={{ backgroundImage: `url(${card.img})`, backgroundColor: card.bgColor }}
                  >
                    <span style={{ fontSize: 12, color: '#ffc700', fontWeight: 700 }}>
                      Tuyến đường phổ biến từ
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800 }}>{card.origin}</h3>
                  </div>

                  <div className="vxr-route-sublist">
                    {card.routes.map((sub) => (
                      <div
                        key={sub.dest}
                        className="vxr-route-row"
                        onClick={() => {
                          setSegmentIdx(sub.segIdx);
                          setFromLocationId('');
                          setToLocationId('');
                          loadTrips(sub.segIdx);
                          document.getElementById('booking-map')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <div>
                          <strong style={{ display: 'block', fontSize: 14.5, color: 'var(--gw-dark)' }}>
                            {sub.dest}
                          </strong>
                          <span style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{sub.meta}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ color: 'var(--gw-green)', fontSize: 15 }}>{sub.price}</strong>
                          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Chọn chỗ ➜</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. VEXERE 2-COLUMN FILTER SIDEBAR + HORIZONTAL TICKET CARDS + LIVE 2-DECK SEAT MAP */}
          <section className="gw-section" id="booking-map" style={{ paddingTop: 0 }}>
            <div className="vx-section-header">
              <div>
                <span className="gw-sub-pill">Đặt vé trực tuyến</span>
                <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
                  Kết quả chuyến xe & Sơ đồ chọn phòng / giường 2 tầng
                </h2>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-green-dark)' }}>
                Tìm thấy {filteredTrips.length} chuyến đang mở bán cho {SEGMENT_PRESETS[segmentIdx].label}
              </div>
            </div>

            {/* Mobile Filter Accordion Button (Visible on <= 991px) */}
            <button
              type="button"
              className="vxr-mobile-filter-toggle"
              onClick={() => setMobileFilterOpen((v) => !v)}
            >
              <span>🎛️ Bộ lọc & Sắp xếp (Giờ đi, Loại xe, Nhà xe)</span>
              <span>{mobileFilterOpen ? 'Thu gọn ▴' : 'Mở bộ lọc ▾'}</span>
            </button>

            <div className="vxr-booking-workspace">
              {/* Left Sticky Vexere Filter Sidebar */}
              <aside className={`vxr-filter-sidebar ${mobileFilterOpen ? 'open-mobile' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 16, color: 'var(--gw-dark)' }}>Bộ lọc tìm kiếm</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('price_asc');
                      setFilterVehicleKind('ALL');
                      setFilterOperatorId('ALL');
                      setFilterTimeSlot('ALL');
                      setDateQuery('');
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--gw-green)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Xóa lọc
                  </button>
                </div>

                {/* Sort Group */}
                <div className="vxr-filter-group">
                  <div className="vxr-filter-title">Sắp xếp</div>
                  <div style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
                    {[
                      { val: 'price_asc', label: 'Giá tăng dần (Thấp nhất trước)' },
                      { val: 'departure_asc', label: 'Giờ đi sớm nhất' },
                      { val: 'price_desc', label: 'Giá giảm dần (Cao nhất trước)' },
                    ].map((opt) => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="vxr-sort"
                          checked={sortBy === opt.val}
                          onChange={() => {
                            setSortBy(opt.val);
                            loadTrips();
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Departure Time 2x2 Grid */}
                <div className="vxr-filter-group">
                  <div className="vxr-filter-title">Giờ đi</div>
                  <div className="vxr-time-grid">
                    {[
                      { id: 'EARLY', title: 'Sáng sớm', sub: '00:00 - 06:00' },
                      { id: 'MORNING', title: 'Buổi sáng', sub: '06:01 - 12:00' },
                      { id: 'AFTERNOON', title: 'Buổi chiều', sub: '12:01 - 18:00' },
                      { id: 'NIGHT', title: 'Buổi tối', sub: '18:01 - 24:00' },
                    ].map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={`vxr-time-slot ${filterTimeSlot === slot.id ? 'active' : ''}`}
                        onClick={() =>
                          setFilterTimeSlot((prev) => (prev === slot.id ? 'ALL' : (slot.id as typeof filterTimeSlot)))
                        }
                      >
                        <div>{slot.title}</div>
                        <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{slot.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehicle Kind Filter */}
                <div className="vxr-filter-group">
                  <div className="vxr-filter-title">Loại xe / Khoang</div>
                  <div style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
                    {[
                      { id: 'ALL', label: 'Tất cả loại xe' },
                      { id: 'LIMO', label: '👑 Limousine Phòng đôi (CABIN)' },
                      { id: 'SLEEPER', label: '🛏️ Giường nằm 2 tầng (BED)' },
                    ].map((vk) => (
                      <label key={vk.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="vxr-vkind"
                          checked={filterVehicleKind === vk.id}
                          onChange={() => setFilterVehicleKind(vk.id as typeof filterVehicleKind)}
                        />
                        <span>{vk.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Operator Filter */}
                <div className="vxr-filter-group">
                  <div className="vxr-filter-title">Nhà xe đối tác</div>
                  <div style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="vxr-operator"
                        checked={filterOperatorId === 'ALL'}
                        onChange={() => setFilterOperatorId('ALL')}
                      />
                      <span>Tất cả nhà xe ({trips.length})</span>
                    </label>
                    {uniqueOperators.map((op) => (
                      <label key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="vxr-operator"
                          checked={filterOperatorId === op.id}
                          onChange={() => setFilterOperatorId(op.id)}
                        />
                        <span>{op.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Right Column: Vexere Horizontal Trip Cards + Interactive 2-Deck Seat Map */}
              <div>
                {loading && <div className="vx-card">Đang tải danh sách chuyến xe và giá theo chặng…</div>}
                {error && (
                  <div className="vx-card" style={{ color: 'var(--gw-danger)', fontWeight: 700, marginBottom: 16 }}>
                    Lỗi API: {error}
                  </div>
                )}

                <div className="vxr-trip-list">
                  {filteredTrips.map((t) => {
                    const isSelectedTrip = selectedTripId === t.id;
                    const segPreset = SEGMENT_PRESETS[segmentIdx];
                    const fromSeq = t.from_sequence ?? segPreset.from;
                    const toSeq = t.to_sequence ?? segPreset.to;
                    const originName = t.from_location_name || segPreset.label.split('(')[1]?.split('→')[0]?.trim() || 'Điểm đón';
                    const destName = t.to_location_name || segPreset.label.split('→')[2]?.replace(')', '').trim() || 'Điểm trả';
                    const showDetails = expandedDetailTripId === t.id;

                    return (
                      <div key={t.id} className={`vxr-trip-card ${isSelectedTrip ? 'active' : ''}`}>
                        <div className="vxr-trip-main">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--gw-dark)' }}>
                                {t.operator_name}
                              </h3>
                              <span className="vxr-rating-pill">★ 4.9 (320+)</span>
                              <span className="vx-badge vx-badge-green">⚡ Xác nhận tức thì</span>
                            </div>
                            <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginTop: 4, fontWeight: 600 }}>
                              🚍 {t.vehicle_type} • Tuyến: {t.route_name}
                            </div>

                            {/* Vexere Visual Departure -> Arrival Timeline */}
                            <div className="vxr-timeline">
                              <div className="vxr-timeline-point">
                                <div className="vxr-timeline-time">{formatTimeHHMM(t.boarding_at || t.departure_at)}</div>
                                <div className="vxr-timeline-loc">🔵 {originName}</div>
                              </div>

                              <div className="vxr-timeline-connector">
                                <span>{segPreset.duration}</span>
                                <div className="vxr-timeline-line" />
                                <span>Chặng [{fromSeq} → {toSeq})</span>
                              </div>

                              <div className="vxr-timeline-point" style={{ textAlign: 'right' }}>
                                <div className="vxr-timeline-time">Dự kiến</div>
                                <div className="vxr-timeline-loc">📍 {destName}</div>
                              </div>
                            </div>
                          </div>

                          <div className="vxr-trip-price-col">
                            <div>
                              <div style={{ fontSize: 12, color: 'var(--gw-muted)', fontWeight: 600 }}>
                                Giá đúng theo chặng
                              </div>
                              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gw-green)' }}>
                                {t.min_price ? `${Number(t.min_price).toLocaleString('vi-VN')}₫` : 'Liên hệ'}
                              </div>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#059669', marginTop: 2 }}>
                                {t.available_units !== undefined
                                  ? `Còn ${t.available_units}/${t.total_units ?? 20} vị trí trống`
                                  : 'Đang mở bán'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                              <button
                                type="button"
                                className="vx-btn-outline"
                                style={{ fontSize: 12.5, padding: '8px 12px' }}
                                onClick={() => setExpandedDetailTripId(showDetails ? null : t.id)}
                              >
                                {showDetails ? 'Ẩn thông tin ▴' : 'Thông tin chi tiết ▾'}
                              </button>
                              <button
                                type="button"
                                className={isSelectedTrip ? 'gw-btn-orange' : 'vx-btn-primary'}
                                style={{ fontSize: 13.5, padding: '10px 18px' }}
                                onClick={() => {
                                  void fetchTripUnits(t.id, fromSeq, toSeq);
                                  document.getElementById('live-2deck-map')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                {isSelectedTrip ? '✓ Đang mở sơ đồ 2 tầng' : 'Chọn chỗ ➜'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {showDetails && (
                          <div
                            style={{
                              marginTop: 14,
                              paddingTop: 14,
                              borderTop: '1px solid var(--gw-border)',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                              gap: 14,
                              fontSize: 13,
                            }}
                          >
                            <div>
                              <strong style={{ color: 'var(--gw-dark)' }}>🛡️ Chính sách giữ chỗ & Hủy vé:</strong>
                              <p style={{ margin: '4px 0 0', color: 'var(--gw-muted)' }}>
                                Giữ chỗ nguyên tử 10 phút sau khi chọn phòng. Hỗ trợ gửi yêu cầu hủy vé trước giờ khởi hành theo chính sách từng hãng và giải phóng chỗ tự động.
                              </p>
                            </div>
                            <div>
                              <strong style={{ color: 'var(--gw-dark)' }}>✨ Tiện ích trên xe:</strong>
                              <p style={{ margin: '4px 0 0', color: 'var(--gw-muted)' }}>
                                Điều hòa riêng từng khoang, cổng sạc USB/Type-C, rèm che riêng tư, chăn gối khử khuẩn, Wifi tốc độ cao.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Full-Width Live 2-Deck Seat Map for Selected Trip (Spans full 1290px width below filter & trip list) */}
            <div id="live-2deck-map" style={{ marginTop: 28 }}>
              <div className="vx-card" style={{ background: 'var(--gw-bg-soft)', border: '1.5px solid #b6d4fa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <span className="gw-sub-pill">SƠ ĐỒ PHÒNG / GIƯỜNG 2 TẦNG TRỰC QUAN</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: 20, color: 'var(--gw-dark)' }}>
                      Chọn vị trí phòng đôi (2NL + 1TE) hoặc giường đơn trên sơ đồ
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <select
                      className="vx-select"
                      style={{ width: 'auto', minWidth: 260 }}
                      value={segmentIdx}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setSegmentIdx(idx);
                        if (selectedTripId) {
                          void fetchTripUnits(
                            selectedTripId,
                            SEGMENT_PRESETS[idx].from,
                            SEGMENT_PRESETS[idx].to
                          );
                        }
                      }}
                    >
                      {SEGMENT_PRESETS.map((s, idx) => (
                        <option key={s.label} value={idx}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {holdError && (
                  <div style={{ padding: 12, background: '#fef2f2', color: 'var(--gw-danger)', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>
                    ⚠️ {holdError}
                  </div>
                )}

                <SeatLayout2Deck
                  units={units}
                  selectedMap={selectedMap}
                  onToggleUnit={handleToggleUnit}
                  onUpdateCounts={handleUpdateCounts}
                  onProceedHold={handleProceedHold}
                  segmentLabel={SEGMENT_PRESETS[segmentIdx].label}
                  holdingBusy={holdingBusy}
                />
              </div>
            </div>
          </section>

          {/* 7. VEXERE "NỀN TẢNG KẾT NỐI NGƯỜI DÙNG VÀ NHÀ XE" (4 Guarantee Pillars + Split About) */}
          <section className="gw-section" id="about" style={{ paddingTop: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span className="gw-sub-pill">Nền tảng kết nối người dùng và nhà xe</span>
              <h2 className="gw-sec-title">Vì sao hàng triệu hành khách tin chọn Vé Xuyên Việt?</h2>
            </div>

            <div className="gw-features-6">
              {[
                { icon: '🛡️', title: 'Chắc chắn có chỗ 100%', desc: 'Cơ chế khóa phân đoạn PostgreSQL ExclusionConstraint chống bán trùng ghế trên mọi đoạn chặng giao nhau.' },
                { icon: '🧭', title: 'Giá vé đúng theo chặng', desc: 'Đi chặng nào trả tiền đúng chặng đó [Điểm lên → Điểm xuống), minh bạch không phụ thu ẩn.' },
                { icon: '👑', title: 'Sơ đồ phòng đôi 2 tầng thực', desc: 'Hỗ trợ chọn chính xác mã phòng đôi Limousine (2 người lớn + 1 trẻ em) hoặc giường nằm tầng 1 & tầng 2.' },
                { icon: '⏱️', title: 'Giữ nhiều phòng nguyên tử 10 phút', desc: 'Giữ chỗ đồng thời cho cả gia đình trong 10 phút với khóa chống deadlock All-or-Nothing.' },
                { icon: '📲', title: 'Thanh toán VNPay QR & Vé HMAC', desc: 'Xác thực chữ ký số HMAC-SHA512 từ cổng VNPay và phát hành ngay mã vé QR chống giả mạo.' },
                { icon: '🎧', title: 'Đồng hành & Hỗ trợ 24/7', desc: 'Đội ngũ vận hành hỗ trợ đón trả tận nơi, đổi/hủy vé trước giờ khởi hành và giải phóng chỗ tự động.' },
              ].map((f) => (
                <div key={f.title} className="gw-feature-box">
                  <div className="gw-feature-icon">{f.icon}</div>
                  <div>
                    <h4 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--gw-dark)' }}>{f.title}</h4>
                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 8. OCEAN-NAVY FEATURE SHOWCASE SECTION */}
          <section className="gw-dark-section">
            <div className="gw-dark-inner">
              <div style={{ textAlign: 'center' }}>
                <span className="gw-sub-pill-orange">Công nghệ đặt vé xe đường dài thế hệ mới</span>
                <h2 className="gw-sec-title" style={{ color: '#ffffff' }}>
                  Trải nghiệm tiện nghi & An tâm trên mọi cung đường
                </h2>
              </div>

              <div className="gw-dark-grid">
                <div className="gw-tab-buttons">
                  {ADVENTURE_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`gw-tab-btn ${advTab.id === t.id ? 'active' : ''}`}
                      onClick={() => setAdvTab(t)}
                    >
                      <span style={{ fontSize: 20 }}>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    background: 'var(--gw-dark-card)',
                    borderRadius: 16,
                    padding: 28,
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{advTab.icon}</div>
                  <h3 style={{ margin: '0 0 12px', fontSize: 22, color: '#fff' }}>{advTab.title}</h3>
                  <p style={{ margin: 0, color: '#dbeafe', fontSize: 14.5 }}>{advTab.desc}</p>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: 28,
                    backgroundImage:
                      'linear-gradient(180deg, rgba(13,46,89,0.45), rgba(13,46,89,0.92)), url(https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div style={{ color: 'var(--gw-orange)', fontWeight: 800, fontSize: 13 }}>
                    Ưu đãi đặt vé trực tuyến
                  </div>
                  <h3 style={{ margin: '8px 0 16px', fontSize: 22, color: '#fff' }}>
                    Giữ chỗ nhanh chóng cho cả gia đình chỉ với 1 mã thanh toán VNPay QR.
                  </h3>
                  <a href="#booking-map" className="gw-btn-orange" style={{ alignSelf: 'flex-start' }}>
                    Đặt vé ngay ➜
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 9. BẾN XE & ĐIỂM ĐẾN NỔI BẬT + PROMO CARD */}
          <section className="gw-section" id="destinations">
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span className="gw-sub-pill">Bến xe & Điểm đến phổ biến</span>
              <h2 className="gw-sec-title">Điểm đến nổi bật dọc hành trình Xuyên Việt</h2>
            </div>

            <div className="vx-grid-4">
              {[
                {
                  name: destinations[0]?.name || 'Cố đô Huế',
                  sub: 'Bến xe Phía Nam Huế',
                  count: '6 Chuyến/ngày',
                  img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
                },
                {
                  name: destinations[1]?.name || 'Đà Nẵng',
                  sub: 'Bến xe Trung tâm Đà Nẵng',
                  count: '9 Chuyến/ngày',
                  img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=700&q=80',
                },
                {
                  name: 'Thủ đô Hà Nội',
                  sub: 'Bến xe Nước Ngầm & Giáp Bát',
                  count: '12 Chuyến/ngày',
                  img: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=700&q=80',
                },
              ].map((d) => (
                <div
                  key={d.name}
                  className="gw-activity-card"
                  style={{ backgroundImage: `url(${d.img})`, height: 330 }}
                  onClick={() => document.getElementById('booking-map')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: 'var(--gw-green)',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {d.count}
                  </span>
                  <div style={{ color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}>
                    <div style={{ color: '#ffc700', fontWeight: 700, fontSize: 13 }}>{d.sub}</div>
                    <h3 style={{ margin: '4px 0 0', fontSize: 22 }}>{d.name}</h3>
                  </div>
                </div>
              ))}

              {/* Vexere Ocean Blue Promo Card */}
              <div
                style={{
                  background: 'linear-gradient(145deg, #2474e5 0%, #0d2e59 100%)',
                  color: '#fff',
                  borderRadius: 16,
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    background: 'rgba(255, 199, 0, 0.22)',
                    color: '#ffc700',
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 800,
                    alignSelf: 'flex-start',
                    marginBottom: 14,
                  }}
                >
                  ƯU ĐÃI ĐẶT NHIỀU PHÒNG
                </span>
                <h3 style={{ margin: '0 0 12px', fontSize: 23, lineHeight: 1.3 }}>
                  Đặt vé nhóm hoặc nhiều phòng đôi trong cùng một đơn
                </h3>
                <p style={{ fontSize: 13.5, color: '#dbeafe', margin: '0 0 20px' }}>
                  Giữ chỗ nguyên tử toàn bộ phòng cho gia đình trong 10 phút với 1 mã thanh toán VNPay QR duy nhất.
                </p>
                <a href="#booking-map" className="gw-btn-orange" style={{ alignSelf: 'flex-start' }}>
                  Chọn phòng ngay ➜
                </a>
              </div>
            </div>
          </section>

          {/* 10. TIN TỨC & CẨM NANG DI CHUYỂN */}
          <section className="gw-section" id="news" style={{ paddingTop: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span className="gw-sub-pill">Tin tức & Cẩm nang gần đây</span>
              <h2 className="gw-sec-title">Thông tin tuyến xe và kinh nghiệm di chuyển đường dài</h2>
            </div>

            <div className="vx-grid-3">
              {posts.map((p, idx) => (
                <article key={p.id} className="gw-tour-card">
                  <div
                    className="gw-tour-img"
                    style={{
                      backgroundImage: `url(${
                        idx % 2 === 0
                          ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
                          : 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80'
                      })`,
                    }}
                  >
                    <span className="gw-tour-badge-left" style={{ background: 'var(--gw-green)' }}>
                      {p.category}
                    </span>
                  </div>
                  <div className="gw-tour-body">
                    <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 6 }}>
                      👤 Ban biên tập Vé Xuyên Việt • 🚍 Cẩm nang
                    </div>
                    <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>{p.title}</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--gw-muted)' }}>{p.summary}</p>
                    <button type="button" className="vx-btn-outline" onClick={() => void openArticle(p.slug)}>
                      Đọc chi tiết ➜
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 11. PRE-FOOTER CTA BAR */}
          <div className="gw-cta-bar">
            <div className="gw-cta-inner">
              <div>
                <div style={{ color: 'var(--gw-green)', fontWeight: 800, fontSize: 14 }}>
                  Bạn cần tư vấn chọn phòng đôi Limousine hoặc đặt vé đoàn?
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: 25, fontWeight: 800, color: 'var(--gw-dark)' }}>
                  Sẵn sàng khởi hành cùng Vé Xuyên Việt ngay hôm nay!
                </h3>
              </div>
              <a href="#booking-map" className="gw-btn-green">
                Xem lịch trình & Chọn chỗ ➜
              </a>
            </div>
          </div>
        </>
      )}

      {/* 12. VEXERE DEEP OCEAN NAVY FOOTER (#0D2E59) */}
      <footer className="vx-footer">
        <div className="vx-footer-inner">
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', marginBottom: 12 }}>
              🚍 Vé<span style={{ color: '#ffc700' }}>XuyênViệt</span>
            </div>
            <p style={{ fontSize: 13.5, color: '#c5dcf8', margin: 0 }}>
              Nền tảng đặt vé xe khách & Limousine 2 tầng đa hãng: chọn đúng vị trí phòng/giường theo từng đoạn chặng, giữ chỗ nguyên tử 10 phút và thanh toán VNPay QR 100%.
            </p>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Tuyến xe nổi bật</strong>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13.5, lineHeight: 2.1, color: '#c5dcf8' }}>
              <li>Xe Limousine Hà Nội → Huế</li>
              <li>Xe giường nằm Huế → Đà Nẵng</li>
              <li>Xe phòng đôi Hà Nội → Đà Nẵng</li>
              <li>Tuyến Xuyên Việt Hà Nội → TP.HCM</li>
            </ul>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Bản tin ưu đãi</strong>
            <p style={{ fontSize: 13.5, color: '#c5dcf8' }}>
              Đăng ký nhận thông báo ưu đãi vé xe giờ chót và lịch chạy mới nhất.
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="vx-input" placeholder="Nhập địa chỉ Email..." />
              <button type="button" className="gw-btn-orange" style={{ padding: '10px 14px' }}>
                ➜
              </button>
            </div>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Hỗ trợ & Tài khoản Demo</strong>
            <div style={{ fontSize: 13.5, lineHeight: 1.9, marginTop: 8, color: '#c5dcf8' }}>
              <div>📞 Tổng đài: <strong style={{ color: '#fff' }}>1900 6886</strong></div>
              <div>✉️ Email: <strong style={{ color: '#fff' }}>hotro@vexuyenviet.vn</strong></div>
              <div>📍 Trụ sở: 250 Nguyễn Văn Linh, Đà Nẵng</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#ffc700' }}>
                Demo DB: <code>khach1@vexuyenviet.vn</code> | <code>owner.phuongtrang@vexuyenviet.vn</code> | <code>admin@vexuyenviet.vn</code>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {showAuthModal && <AuthDialog onClose={() => setShowAuthModal(false)} onSuccess={() => { refreshProfile(); setShowAuthModal(false); }} />}

      {/* 5-Step Checkout & VNPay QR Modal (WF-04) */}
      {activeHold && (
        <CheckoutFlowModal
          hold={activeHold}
          onClose={() => setActiveHold(null)}
          onSuccessIssued={() => setActivePortal('MY_TICKETS')}
        />
      )}

      {/* Article Reader Modal (P-10) */}
      {activePostDetail && (
        <div className="vx-modal-backdrop">
          <div className="vx-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="gw-sub-pill">{activePostDetail.category}</span>
              <button type="button" className="vx-btn-outline" onClick={() => setActivePostDetail(null)}>
                Đóng ✕
              </button>
            </div>
            <h2 style={{ marginTop: 0 }}>{activePostDetail.title}</h2>
            <p style={{ lineHeight: 1.7 }}>{activePostDetail.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
