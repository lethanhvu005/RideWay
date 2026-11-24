import { useEffect, useState } from 'react';
import { apiFetch } from './api/client';
import { CheckoutFlowModal, type ActiveHoldBooking } from './components/CheckoutFlowModal';
import { AdminPortal, MyTicketsPortal, OperatorPortal } from './components/PortalViews';
import { SeatLayout2Deck, type SelectedUnitConfig, type TripUnitItem } from './components/SeatLayout2Deck';
import './styles/theme.css';
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
  min_price: string | null;
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
  { label: 'Chặng 0 → 1 (Hà Nội → Cố đô Huế)', from: 0, to: 1 },
  { label: 'Chặng 1 → 2 (Cố đô Huế → Đà Nẵng)', from: 1, to: 2 },
  { label: 'Chặng 0 → 2 (Hà Nội → Đà Nẵng)', from: 0, to: 2 },
  { label: 'Chặng 0 → 3 (Hà Nội → TP.HCM • Toàn tuyến)', from: 0, to: 3 },
];

const HERO_SLIDES = [
  {
    sub: 'Tour & Travels • Vé Xuyên Việt',
    title: 'Khám phá vùng núi & cung đường hùng vĩ Việt Nam',
    desc: 'Tận hưởng những chuyến hành trình xuyên Việt êm ái trên xe Limousine 20 phòng đôi & giường nằm 2 tầng. Chọn đúng vị trí phòng theo chặng, giữ chỗ 10 phút.',
    bg: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1800&q=80',
  },
  {
    sub: 'Tour & Travels • Limousine 2 Tầng VIP',
    title: 'Lên đỉnh và ngắm hoàng hôn dọc dải đất chữ S',
    desc: 'Thách thức mọi cung đường dài Hà Nội – Huế – Đà Nẵng – TP.HCM với khoang phòng đôi riêng tư, thanh toán VNPay QR 100% xuất vé tức thì.',
    bg: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1800&q=80',
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
    desc: 'Công nghệ PostgreSQL int4range cho phép cùng một phòng bán chặng A→B và B→C liên tiếp mà tuyệt đối không bao giờ bán trùng chặng giao nhau.',
  },
  {
    id: 'hold',
    icon: '⏱️',
    label: 'Giữ chỗ 10 phút',
    title: 'Giữ nhiều phòng nguyên tử All-or-Nothing trong 10 phút',
    desc: 'Chọn nhiều phòng trong một đơn hàng duy nhất; thời hạn giữ chỗ 10 phút do Backend cấp và tự động thu hồi an toàn khi quá hạn.',
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
  const [slideIdx, setSlideIdx] = useState(0);
  const [advTab, setAdvTab] = useState(ADVENTURE_TABS[0]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('khach1@vexuyenviet.vn');
  const [authPassword, setAuthPassword] = useState('Khach@123456');
  const [authError, setAuthError] = useState<string | null>(null);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [activePostDetail, setActivePostDetail] = useState<{ title: string; body: string; category: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Search & Filter States */
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [dateQuery] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [filterVehicleKind] = useState('ALL');

  /* 2-Deck Seat Layout & Segment Selection */
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [segmentIdx, setSegmentIdx] = useState<number>(2);
  const [units, setUnits] = useState<TripUnitItem[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectedUnitConfig>>({});
  const [holdingBusy, setHoldingBusy] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [activeHold, setActiveHold] = useState<ActiveHoldBooking | null>(null);

  const refreshProfile = () => {
    apiFetch<UserProfile>('/me')
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  };

  const loadTrips = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (fromLocationId) params.set('from_location_id', fromLocationId);
    if (toLocationId) params.set('to_location_id', toLocationId);
    if (dateQuery) params.set('departure_date', dateQuery);
    if (sortBy) params.set('sort', sortBy);

    apiFetch<{ results: TripSummary[] }>(`/trips?${params.toString()}`)
      .then((res) => {
        setTrips(res.results);
        if (res.results.length > 0 && !selectedTripId) {
          void fetchTripUnits(res.results[0].id, SEGMENT_PRESETS[segmentIdx].from, SEGMENT_PRESETS[segmentIdx].to);
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

  const handleLogin = async (emailInput: string, passwordInput: string) => {
    setAuthError(null);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      refreshProfile();
      setShowAuthModal(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    }
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
    const seg = SEGMENT_PRESETS[segmentIdx];
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
          from_sequence: seg.from,
          to_sequence: seg.to,
          units: unitPayload,
        }),
      });
      setActiveHold(res);
      void fetchTripUnits(selectedTripId, seg.from, seg.to);
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

  // Chỉ chạy hiệu ứng xuất hiện một lần; tôn trọng tùy chọn giảm chuyển động.
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(
      '.gw-section, .gw-dark-section, .gw-activity-card, .gw-tour-card'
    ));
    const setup = () => {
      observer?.disconnect();
      elements.forEach(el => el.classList.remove('motion-pending'));
      if (preference.matches || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('motion-pending');
            entry.target.classList.add('motion-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.06 });
      elements.forEach((el) => {
        if (el.classList.contains('motion-visible')) return;
        // Không ẩn nội dung đã ở trong khung nhìn, tránh nhấp nháy khi dữ liệu cập nhật.
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
      elements.forEach(el => el.classList.remove('motion-pending'));
    };
  }, [activePortal, destinations.length, posts.length]);

  const activeSlide = HERO_SLIDES[slideIdx];

  return (
    <div>
      {/* 1. EXACT GOWILDS / MONA-TOUR TOPBAR (#1C231F) */}
      <div className="gw-topbar">
        <div className="gw-topbar-inner">
          <div className="gw-topbar-left">
            <span>
              <i>📍</i> 250 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng
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
              Vé của tôi (P-08)
            </button>
            <button
              type="button"
              className={`gw-portal-pill ${activePortal === 'OPERATOR' ? 'active' : ''}`}
              onClick={() => (currentUser ? setActivePortal('OPERATOR') : setShowAuthModal(true))}
            >
              Portal Hãng xe
            </button>
            <button
              type="button"
              className={`gw-portal-pill ${activePortal === 'ADMIN' ? 'active' : ''}`}
              onClick={() => (currentUser ? setActivePortal('ADMIN') : setShowAuthModal(true))}
            >
              Portal Admin
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXACT GOWILDS / MONA-TOUR WHITE STICKY HEADER */}
      <header className="gw-header">
        <div className="gw-header-inner">
          <div className="gw-logo" onClick={() => setActivePortal('PUBLIC')}>
            <div className="gw-logo-mark">🌲</div>
            <div className="gw-logo-text">
              Vé<span>XuyênViệt</span>
            </div>
          </div>

          <nav className="gw-nav">
            <a href="#top" onClick={() => setActivePortal('PUBLIC')}>Trang chủ ▾</a>
            <a href="#about" onClick={() => setActivePortal('PUBLIC')}>Giới thiệu</a>
            <a href="#tours" onClick={() => setActivePortal('PUBLIC')}>Chuyến xe / Tours ▾</a>
            <a href="#destinations" onClick={() => setActivePortal('PUBLIC')}>Các điểm đến ▾</a>
            <a href="#booking-map" onClick={() => setActivePortal('PUBLIC')}>Sơ đồ 2 tầng</a>
            <a href="#news" onClick={() => setActivePortal('PUBLIC')}>Tin tức & Ảnh</a>
          </nav>

          <div className="gw-header-actions">
            {currentUser ? (
              <>
                <span className="vx-badge vx-badge-green">
                  👤 {currentUser.full_name || currentUser.email}
                </span>
                <button type="button" className="vx-btn-outline" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <div
                className="gw-user-circle"
                title="Login / Đăng ký"
                onClick={() => setShowAuthModal(true)}
              >
                👤
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Portal Switch Views */}
      {activePortal === 'MY_TICKETS' && <MyTicketsPortal />}
      {activePortal === 'OPERATOR' && <OperatorPortal />}
      {activePortal === 'ADMIN' && <AdminPortal />}

      {/* PUBLIC MONA-TOUR / GOWILDS HOMEPAGE */}
      {activePortal === 'PUBLIC' && (
        <>
          {/* 3. FULL-BLEED HERO SLIDER ("Khám phá vùng núi hùng vĩ") */}
          <section
            className="gw-hero"
            id="top"
            style={{ backgroundImage: `url(${activeSlide.bg})` }}
          >
            <div className="motion-hero-image" key={`image-${slideIdx}`} style={{ backgroundImage: `url(${activeSlide.bg})` }} aria-hidden="true" />
            <div className="gw-hero-inner">
              <span key={`sub-${slideIdx}`} className="gw-hero-sub motion-hero-text">{activeSlide.sub}</span>
              <h1 key={`title-${slideIdx}`} className="motion-hero-text">{activeSlide.title}</h1>
              <p key={`desc-${slideIdx}`} className="motion-hero-text">{activeSlide.desc}</p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <a href="#booking-map" className="gw-btn-green">
                  Bắt đầu ngay <span>➜</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSlideIdx((slideIdx + 1) % HERO_SLIDES.length)}
                  style={{
                    background: 'rgba(255,255,255,0.16)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 10,
                    padding: '12px 18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đổi slide ⟳
                </button>
              </div>
            </div>
          </section>

          {/* 4. OVERLAPPING HORIZONTAL SEARCH BAR (5 Columns with Green Icons) */}
          <div className="gw-search-wrap">
            <form
              className="gw-search-box"
              onSubmit={(e) => {
                e.preventDefault();
                loadTrips();
                document.getElementById('booking-map')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className="gw-search-field">
                <span className="gw-field-icon">📍</span>
                <div style={{ width: '100%' }}>
                  <span className="gw-field-label">Chọn điểm khởi hành</span>
                  <select
                    className="gw-field-control"
                    value={fromLocationId}
                    onChange={(e) => setFromLocationId(e.target.value)}
                  >
                    <option value="">Tất cả bến đi</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.province} ({loc.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="gw-search-field">
                <span className="gw-field-icon">🗺️</span>
                <div style={{ width: '100%' }}>
                  <span className="gw-field-label">Chọn địa điểm đến</span>
                  <select
                    className="gw-field-control"
                    value={toLocationId}
                    onChange={(e) => setToLocationId(e.target.value)}
                  >
                    <option value="">Tất cả điểm đến</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.province} ({loc.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="gw-search-field">
                <span className="gw-field-icon">🚍</span>
                <div style={{ width: '100%' }}>
                  <span className="gw-field-label">Chọn loại xe / chặng</span>
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

              <div className="gw-search-field">
                <span className="gw-field-icon">📅</span>
                <div style={{ width: '100%' }}>
                  <span className="gw-field-label">Ngày đi & Sắp xếp</span>
                  <select
                    className="gw-field-control"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="price_asc">Giá thấp nhất trước</option>
                    <option value="price_desc">Giá cao nhất trước</option>
                    <option value="departure_asc">Giờ chạy sớm nhất</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="gw-btn-green">
                🔍 Tìm kiếm
              </button>
            </form>
          </div>

          {/* 5. GOWILDS "Hoạt động phổ biến / Khám phá phiêu lưu" (5 Tall Rounded Photo Cards) */}
          <section className="gw-section">
            <div style={{ textAlign: 'center' }}>
              <span className="gw-sub-pill">Hoạt động phổ biến</span>
              <h2 className="gw-sec-title">Khám phá phiêu lưu & Hành trình Xuyên Việt</h2>
            </div>

            <div className="gw-activity-grid">
              {[
                {
                  title: 'Limousine Phòng Đôi VIP',
                  img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=700&q=80',
                },
                {
                  title: 'Giường nằm 2 tầng êm ái',
                  img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=700&q=80',
                },
                {
                  title: 'Khám phá Cố đô Huế',
                  img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
                },
                {
                  title: 'Cầu Vàng & Biển Đà Nẵng',
                  img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=700&q=80',
                },
                {
                  title: 'Hành trình Bắc – Nam',
                  img: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=700&q=80',
                },
              ].map((act) => (
                <div
                  key={act.title}
                  className="gw-activity-card"
                  style={{ backgroundImage: `url(${act.img})` }}
                  onClick={() => document.getElementById('booking-map')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="gw-activity-pill">
                    <span>{act.title}</span>
                    <span className="gw-activity-arrow">➜</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. GOWILDS "18 Năm kinh nghiệm / Dịch vụ cao cấp — Du lịch tuyệt vời" SPLIT SECTION */}
          <section className="gw-section" id="about" style={{ paddingTop: 10 }}>
            <div className="gw-about-grid">
              <div>
                <div className="gw-exp-box">
                  <div className="gw-exp-num">50+</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Hãng xe & Tuyến đường dài</div>
                </div>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="gw-feature-icon">🛡️</div>
                    <div>
                      <div style={{ fontWeight: 800 }}>An toàn là ưu tiên</div>
                      <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
                        Chống bán trùng chặng tuyệt đối bằng PostgreSQL GiST Exclusion.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="gw-feature-icon">🏷️</div>
                    <div>
                      <div style={{ fontWeight: 800 }}>Giá ưu đãi và hấp dẫn</div>
                      <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
                        Bán vé theo từng đoạn chặng trung gian, tối ưu chi phí.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="gw-feature-icon">🤝</div>
                    <div>
                      <div style={{ fontWeight: 800 }}>Hãng xe đáng tin cậy</div>
                      <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
                        Phương Trang FUTA, Sao Việt Limousine và 50+ đối tác.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <img
                  src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80"
                  alt="Du lịch tuyệt vời"
                  style={{ width: '100%', height: 420, objectFit: 'cover', borderRadius: 20, boxShadow: 'var(--gw-shadow-lg)' }}
                />
              </div>

              <div>
                <span className="gw-sub-pill">Dịch vụ cao cấp</span>
                <h2 className="gw-sec-title">Du lịch tuyệt vời & Đặt phòng xe 2 tầng trực tuyến</h2>
                <p style={{ color: 'var(--gw-muted)', marginBottom: 24 }}>
                  Hệ thống Marketplace Vé Xuyên Việt kết nối trực tiếp hành khách với các hãng xe đường dài uy tín. Bạn có thể xem sơ đồ 2 tầng theo thời gian thực, chọn nhiều phòng cho cả gia đình, giữ chỗ 10 phút và nhận vé điện tử QR ngay lập tức.
                </p>
                <a href="#booking-map" className="gw-btn-green">
                  Chọn phòng 2 tầng ngay <span>➜</span>
                </a>
              </div>
            </div>
          </section>

          {/* 7. GOWILDS DARK SECTION ("Hoạt động nổi bật / Cảm giác phiêu lưu") */}
          <section className="gw-dark-section">
            <div className="gw-dark-inner">
              <div style={{ textAlign: 'center' }}>
                <span className="gw-sub-pill-orange">Hoạt động nổi bật</span>
                <h2 className="gw-sec-title" style={{ color: '#ffffff' }}>
                  Cảm giác phiêu lưu & Tiện nghi trên mọi hành trình
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
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{advTab.icon}</div>
                  <h3 style={{ margin: '0 0 12px', fontSize: 22, color: '#fff' }}>{advTab.title}</h3>
                  <p style={{ margin: 0, color: '#cfd6d1', fontSize: 14 }}>{advTab.desc}</p>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: 28,
                    backgroundImage:
                      'linear-gradient(180deg, rgba(28,35,31,0.55), rgba(28,35,31,0.92)), url(https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div style={{ color: 'var(--gw-orange)', fontWeight: 700, fontSize: 13 }}>
                    Phiêu lưu độc đáo
                  </div>
                  <h3 style={{ margin: '8px 0 16px', fontSize: 22, color: '#fff' }}>
                    Cuộc phiêu lưu thực sự và tận hưởng những chuyến đi mơ ước của bạn.
                  </h3>
                  <a href="#booking-map" className="gw-btn-orange" style={{ alignSelf: 'flex-start' }}>
                    Đặt vé ngay ➜
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 8. GOWILDS "Trải nghiệm tuyệt vời / Các địa điểm thú vị" (4-Column Tour Cards + Live 2-Deck Map) */}
          <section className="gw-section" id="tours">
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <span className="gw-sub-pill">Trải nghiệm tuyệt vời</span>
              <h2 className="gw-sec-title">Các chuyến xe & Tuyến đường thú vị đang mở bán</h2>
            </div>

            <div className="gw-tour-grid-4">
              {[
                {
                  title: 'Limousine Hà Nội – Cố đô Huế',
                  loc: 'Bến xe Nước Ngầm, Hà Nội',
                  price: '450.000₫',
                  hours: '10 Giờ',
                  seats: '20 Phòng đôi',
                  img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
                  seg: 0,
                },
                {
                  title: 'Giường nằm Huế – Đà Nẵng',
                  loc: 'Bến xe Phía Nam, TP. Huế',
                  price: '150.000₫',
                  hours: '3 Giờ',
                  seats: '24 Giường',
                  img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=700&q=80',
                  seg: 1,
                },
                {
                  title: 'Limousine VIP Hà Nội – Đà Nẵng',
                  loc: 'Bến xe Nước Ngầm, Hà Nội',
                  price: '600.000₫',
                  hours: '13 Giờ',
                  seats: '20 Phòng đôi',
                  img: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=700&q=80',
                  seg: 2,
                },
                {
                  title: 'Tuyến Xuyên Việt Hà Nội – TP.HCM',
                  loc: 'Bến xe Miền Đông Mới',
                  price: '1.150.000₫',
                  hours: '30 Giờ',
                  seats: '20 Phòng đôi',
                  img: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=700&q=80',
                  seg: 3,
                },
              ].map((card, i) => (
                <div key={card.title} className="gw-tour-card">
                  <div className="gw-tour-img" style={{ backgroundImage: `url(${card.img})` }}>
                    <span className="gw-tour-badge-left">NỔI BẬT</span>
                    <span className="gw-tour-heart">♡</span>
                  </div>
                  <div className="gw-tour-body">
                    <div className="gw-tour-metrics">
                      <span>Quality 4.9</span>
                      <span>Amenities 4.8</span>
                      <span>Services 5.0</span>
                    </div>
                    <div className="gw-stars">★★★★★</div>
                    <h3 style={{ margin: '4px 0 6px', fontSize: 17, fontWeight: 800 }}>{card.title}</h3>
                    <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 10 }}>
                      📍 {card.loc}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-muted)', marginBottom: 12 }}>
                      💲 Từ <strong style={{ color: 'var(--gw-green)', fontSize: 18 }}>{card.price}</strong>
                    </div>
                    <div
                      style={{
                        borderTop: '1px solid var(--gw-border)',
                        paddingTop: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        color: 'var(--gw-muted)',
                      }}
                    >
                      <span>⏱ {card.hours} • 👥 {card.seats}</span>
                      <button
                        type="button"
                        className="vx-btn-outline"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => {
                          setSegmentIdx(card.seg);
                          const t = trips[i % Math.max(trips.length, 1)];
                          if (t) {
                            void fetchTripUnits(
                              t.id,
                              SEGMENT_PRESETS[card.seg].from,
                              SEGMENT_PRESETS[card.seg].to
                            );
                          }
                          document.getElementById('booking-map')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Chọn chỗ ➜
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* LIVE INTERACTIVE 2-DECK SEAT MAP FROM POSTGRESQL (WF-03) */}
            <div id="booking-map" style={{ marginTop: 48 }}>
              <div className="vx-card" style={{ background: 'var(--gw-bg-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <span className="gw-sub-pill">Đặt chỗ trực tiếp từ Docker PostgreSQL (WF-03)</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: 22 }}>
                      Chọn chuyến & Sơ đồ phòng / giường 2 tầng
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <select
                      className="vx-select"
                      style={{ width: 270 }}
                      value={selectedTripId ?? ''}
                      onChange={(e) =>
                        void fetchTripUnits(
                          e.target.value,
                          SEGMENT_PRESETS[segmentIdx].from,
                          SEGMENT_PRESETS[segmentIdx].to
                        )
                      }
                    >
                      {trips
                        .filter((t) =>
                          filterVehicleKind === 'ALL'
                            ? true
                            : filterVehicleKind === 'LIMO'
                            ? t.vehicle_type.toLowerCase().includes('limousine')
                            : t.vehicle_type.toLowerCase().includes('giường')
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.operator_name} — {t.route_name}
                          </option>
                        ))}
                    </select>

                    <select
                      className="vx-select"
                      style={{ width: 260 }}
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

                {loading && <div>Đang kết nối PostgreSQL...</div>}
                {error && <div style={{ color: 'var(--gw-danger)', fontWeight: 700 }}>Lỗi API: {error}</div>}
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

          {/* 9. GOWILDS 6-FEATURE GRID ("Chuyến đi tùy chỉnh / Hướng dẫn viên chuyên nghiệp...") */}
          <section className="gw-section" style={{ paddingTop: 0 }}>
            <div className="gw-features-6">
              {[
                { icon: '🧭', title: 'Chặng đi tùy chỉnh', desc: 'Lựa chọn linh hoạt từng đoạn chặng trung gian trên tuyến Bắc – Nam.' },
                { icon: '🚍', title: 'Nhà xe chuyên nghiệp', desc: 'Đội ngũ tài xế đường dài giàu kinh nghiệm từ các hãng xe uy tín.' },
                { icon: '⭐', title: 'Chất lượng dịch vụ cao', desc: 'Phòng đôi Limousine 2 tầng đầy đủ tiện nghi giải trí và nghỉ ngơi.' },
                { icon: '📍', title: 'Địa điểm đa dạng', desc: 'Kết nối hơn 50 tuyến đường và điểm dừng du lịch khắp Việt Nam.' },
                { icon: '🛏️', title: 'Trải nghiệm độc đáo', desc: 'Chọn chính xác mã phòng/giường trên sơ đồ 2 tầng theo thời gian thực.' },
                { icon: '🎧', title: 'Hỗ trợ dịch vụ 24/7', desc: 'Đội ngũ nhân viên nền tảng hỗ trợ tra cứu đơn và xử lý ngoại lệ.' },
              ].map((f) => (
                <div key={f.title} className="gw-feature-box">
                  <div className="gw-feature-icon">{f.icon}</div>
                  <div>
                    <h4 style={{ margin: '0 0 6px', fontSize: 17 }}>{f.title}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 10. GOWILDS "Điểm đến nổi bật" + Discount Banner */}
          <section className="gw-section" id="destinations" style={{ paddingTop: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span className="gw-sub-pill">Danh sách điểm đến phổ biến</span>
              <h2 className="gw-sec-title">Điểm đến nổi bật dọc hành trình Xuyên Việt</h2>
            </div>

            <div className="vx-grid-4">
              {[
                {
                  name: destinations[0]?.name || 'Cố đô Huế',
                  sub: 'Miền Trung Di Sản',
                  count: '6 Chuyến',
                  img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
                },
                {
                  name: destinations[1]?.name || 'Đà Nẵng',
                  sub: 'Cầu Vàng & Biển Mỹ Khê',
                  count: '9 Chuyến',
                  img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=700&q=80',
                },
                {
                  name: 'Thủ đô Hà Nội',
                  sub: 'Điểm xuất phát Miền Bắc',
                  count: '12 Chuyến',
                  img: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=700&q=80',
                },
              ].map((d) => (
                <div
                  key={d.name}
                  className="gw-activity-card"
                  style={{ backgroundImage: `url(${d.img})`, height: 330 }}
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
                  <div style={{ color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    <div style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>{d.sub}</div>
                    <h3 style={{ margin: '4px 0 0', fontSize: 22 }}>{d.name}</h3>
                  </div>
                </div>
              ))}

              {/* GoWilds Green Promo Card ("Khi đăng ký tour với số lượng lớn") */}
              <div
                style={{
                  background: 'var(--gw-green)',
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
                    background: 'rgba(255,255,255,0.2)',
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    alignSelf: 'flex-start',
                    marginBottom: 14,
                  }}
                >
                  ƯU ĐÃI ĐẶT NHIỀU PHÒNG
                </span>
                <h3 style={{ margin: '0 0 12px', fontSize: 24, lineHeight: 1.3 }}>
                  Khi đặt vé nhóm hoặc nhiều phòng đôi trong cùng một đơn
                </h3>
                <p style={{ fontSize: 13, color: '#ebf5e6', margin: '0 0 20px' }}>
                  Giữ chỗ nguyên tử toàn bộ phòng cho gia đình trong 10 phút với 1 mã thanh toán VNPay QR duy nhất.
                </p>
                <a href="#booking-map" className="gw-btn-orange" style={{ alignSelf: 'flex-start' }}>
                  Xem ngay ➜
                </a>
              </div>
            </div>
          </section>

          {/* 11. GOWILDS BLOG / NEWS ("Thông tin địa điểm hấp dẫn và thú vị") */}
          <section className="gw-section" id="news" style={{ paddingTop: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span className="gw-sub-pill">Tin tức & Cẩm nang gần đây</span>
              <h2 className="gw-sec-title">Thông tin địa điểm hấp dẫn và kinh nghiệm di chuyển</h2>
            </div>

            <div className="vx-grid-3">
              {posts.map((p, idx) => (
                <article key={p.id} className="gw-tour-card">
                  <div
                    className="gw-tour-img"
                    style={{
                      backgroundImage: `url(${
                        idx % 2 === 0
                          ? 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80'
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
                      👤 Admin Vé Xuyên Việt • 💬 0 Bình luận
                    </div>
                    <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>{p.title}</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--gw-muted)' }}>{p.summary}</p>
                    <button type="button" className="vx-btn-outline" onClick={() => void openArticle(p.slug)}>
                      Đọc thêm ➜
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 12. GOWILDS PRE-FOOTER CTA BAR ("Bạn cần hỗ trợ gì cho chuyến du lịch ?") */}
          <div className="gw-cta-bar">
            <div className="gw-cta-inner">
              <div>
                <div style={{ color: 'var(--gw-green)', fontWeight: 700, fontSize: 14 }}>
                  Bạn cần hỗ trợ gì cho chuyến hành trình Xuyên Việt ?
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 800 }}>
                  Sẵn sàng để bắt đầu chuyến đi tuyệt vời ngay hôm nay!
                </h3>
              </div>
              <a href="#booking-map" className="gw-btn-green">
                Khám phá thêm ➜
              </a>
            </div>
          </div>
        </>
      )}

      {/* 13. GOWILDS DARK FOOTER (#1C231F) */}
      <footer className="vx-footer">
        <div className="vx-footer-inner">
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', marginBottom: 12 }}>
              🌲 Vé<span style={{ color: 'var(--gw-green)' }}>XuyênViệt</span>
            </div>
            <p style={{ fontSize: 13, color: '#b2bdb6', margin: 0 }}>
              Để thuận tiện cho việc chăm sóc khách hàng và đặt vé xe đường dài đa hãng, Vé Xuyên Việt cung cấp sơ đồ phòng/giường 2 tầng thời gian thực, giữ chỗ 10 phút và thanh toán VNPay QR 100%.
            </p>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Liên kết</strong>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, lineHeight: 2.1 }}>
              <li>Trang chủ</li>
              <li>Giới thiệu</li>
              <li>Chuyến xe & Sơ đồ 2 tầng</li>
              <li>Các điểm đến</li>
              <li>Tin tức & Cẩm nang</li>
            </ul>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Bản tin</strong>
            <p style={{ fontSize: 13, color: '#b2bdb6' }}>
              Đăng ký nhận thông báo ưu đãi vé xe giờ chót và lịch chạy mới nhất.
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="vx-input" placeholder="Nhập địa chỉ Email..." />
              <button type="button" className="gw-btn-green" style={{ padding: '10px 14px' }}>
                ➜
              </button>
            </div>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Liên hệ & Tài khoản Demo</strong>
            <div style={{ fontSize: 13, lineHeight: 1.9, marginTop: 8 }}>
              <div>📞 Số điện thoại: <strong>1900 6886</strong></div>
              <div>✉️ Email: <strong>hotro@vexuyenviet.vn</strong></div>
              <div>📍 Địa chỉ: 250 Nguyễn Văn Linh, Đà Nẵng</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#86efac' }}>
                Demo DB: <code>khach1@vexuyenviet.vn</code> | <code>owner.phuongtrang@vexuyenviet.vn</code> | <code>admin@vexuyenviet.vn</code>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal (P-04) */}
      {showAuthModal && (
        <div className="vx-modal-backdrop">
          <div className="vx-modal" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Login / Đăng nhập tài khoản (P-04)</h3>
              <button type="button" className="vx-btn-outline" onClick={() => setShowAuthModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="vx-field-label">Chọn nhanh tài khoản mẫu trong Docker DB:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="vx-btn-outline"
                  onClick={() => void handleLogin('khach1@vexuyenviet.vn', 'Khach@123456')}
                >
                  👤 Khách hàng 1
                </button>
                <button
                  type="button"
                  className="vx-btn-outline"
                  onClick={() => void handleLogin('owner.phuongtrang@vexuyenviet.vn', 'Owner@123456')}
                >
                  🚍 Chủ hãng Phương Trang
                </button>
                <button
                  type="button"
                  className="vx-btn-outline"
                  onClick={() => void handleLogin('admin@vexuyenviet.vn', 'Admin@123456')}
                >
                  🛡️ Platform Admin
                </button>
              </div>
            </div>

            {authError && (
              <div style={{ padding: 10, background: '#fef2f2', color: 'var(--gw-danger)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                {authError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin(authEmail, authPassword);
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              <div>
                <label className="vx-field-label">Email</label>
                <input className="vx-input" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              </div>
              <div>
                <label className="vx-field-label">Mật khẩu</label>
                <input
                  className="vx-input"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="gw-btn-green" style={{ justifyContent: 'center' }}>
                Đăng nhập ➜
              </button>
            </form>
          </div>
        </div>
      )}

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
