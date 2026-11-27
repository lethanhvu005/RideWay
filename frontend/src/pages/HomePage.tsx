import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MultiServiceSearchBox } from '../components/search/MultiServiceSearchBox';
import { useAppDispatch } from '../hooks/useAppStore';
import { setSegmentIdx } from '../features/buses/searchSlice';
import {
  useGetDestinationsQuery,
  useGetPostsQuery,
  useGetTripsQuery,
} from '../services/ridewayApi';
import {
  ADVENTURE_TABS,
  HERO_SLIDES,
  MONA_DISCOVER_CARDS,
  MONA_STATS,
  POPULAR_ROUTE_CARDS,
} from '../types/models';

export function HomePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [slideIdx, setSlideIdx] = useState(0);
  const [discoverIdx, setDiscoverIdx] = useState(0);
  const [discoverAnimating, setDiscoverAnimating] = useState(true);
  const [discoverPaused, setDiscoverPaused] = useState(false);
  const [advTab, setAdvTab] = useState(ADVENTURE_TABS[0]);

  const { data: trips = [] } = useGetTripsQuery({ fromSequence: 0, toSequence: 2 });
  const { data: destinations = [] } = useGetDestinationsQuery();
  const { data: posts = [] } = useGetPostsQuery();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (discoverPaused) return;
    const timer = window.setInterval(() => {
      setDiscoverAnimating(true);
      setDiscoverIdx((prev) => (prev >= MONA_DISCOVER_CARDS.length ? 1 : prev + 1));
    }, 2800);
    return () => window.clearInterval(timer);
  }, [discoverPaused]);

  useEffect(() => {
    if (discoverIdx !== MONA_DISCOVER_CARDS.length) return;
    let frameTimer: number | undefined;
    const snapTimer = window.setTimeout(() => {
      setDiscoverAnimating(false);
      setDiscoverIdx(0);
      frameTimer = window.setTimeout(() => {
        setDiscoverAnimating(true);
      }, 45);
    }, 730);
    return () => {
      window.clearTimeout(snapTimer);
      if (frameTimer) window.clearTimeout(frameTimer);
    };
  }, [discoverIdx]);

  const uniqueOperators = Array.from(
    new Map(
      trips.map((t) => [
        t.operator_id,
        {
          id: t.operator_id,
          name: t.operator_name,
          slug: t.operator_name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          vehicleType: t.vehicle_type,
          routeName: t.route_name,
        },
      ])
    ).values()
  );

  const activeSlide = HERO_SLIDES[slideIdx];

  return (
    <div>
      {/* 1. HERO BANNER */}
      <section className="gw-hero">
        {HERO_SLIDES.map((s, idx) => (
          <div
            key={s.bg}
            className={`gw-hero-slide-layer ${idx === slideIdx ? 'active' : ''}`}
            style={{ backgroundImage: `url(${s.bg})` }}
            aria-hidden="true"
          />
        ))}
        <div className="gw-hero-inner">
          <span key={`sub-${slideIdx}`} className="gw-hero-sub motion-hero-text">
            {activeSlide.sub}
          </span>
          <h1 key={`title-${slideIdx}`} className="motion-hero-text">
            {activeSlide.title}
          </h1>
          <p key={`desc-${slideIdx}`} className="motion-hero-text">
            {activeSlide.desc}
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/xe-khach/tim-kiem" className="gw-btn-orange">
              Tìm chuyến & Chọn phòng 2 tầng <span>➜</span>
            </Link>
            <Link
              to="/diem-den"
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.45)',
                borderRadius: 10,
                padding: '12px 18px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Khám phá điểm đến ➜
            </Link>
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

      {/* 2. FORM TÌM KIẾM THEO DỊCH VỤ */}
      <div className="gw-search-wrap">
        <MultiServiceSearchBox />
      </div>

      {/* 3. TUYẾN XE NỔI BẬT */}
      <section className="gw-section">
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Tuyến xe nổi bật</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Các tuyến xe khách & Limousine 2 tầng được đặt nhiều nhất
            </h2>
          </div>
          <Link to="/xe-khach/tim-kiem" className="vx-btn-outline" style={{ textDecoration: 'none' }}>
            Xem tất cả chuyến xe ➜
          </Link>
        </div>

        <div className="vxr-popular-grid">
          {POPULAR_ROUTE_CARDS.map((card) => (
            <div key={card.origin} className="vxr-route-card">
              <div
                className="vxr-route-card-header"
                style={{ backgroundImage: `url(${card.img})`, backgroundColor: card.bgColor }}
              >
                <span style={{ fontSize: 12, color: 'var(--gw-orange)', fontWeight: 700 }}>
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
                      dispatch(setSegmentIdx(sub.segIdx));
                      navigate(`/xe-khach/tim-kiem?segment=${sub.segIdx}`);
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
                      <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Tìm chuyến ➜</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DỊCH VỤ VẬN TẢI ĐA PHƯƠNG THỨC */}
      <section className="gw-section" style={{ paddingTop: 0 }}>
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Hệ sinh thái di chuyển RideWay</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Dịch vụ vận tải hành khách & Du lịch toàn diện
            </h2>
          </div>
        </div>

        <div className="vx-grid-4">
          {[
            {
              icon: '🚍',
              title: 'Vé xe khách & Limousine 2 tầng',
              badge: 'Đang mở bán trực tuyến',
              desc: 'Chọn chính xác mã phòng đôi VIP (2NL + 1TE) hoặc giường nằm tầng 1 & tầng 2 theo từng đoạn chặng, giữ chỗ 10 phút.',
              to: '/xe-khach',
              cta: 'Đặt vé xe khách ➜',
            },
            {
              icon: '✈️',
              title: 'Vé máy bay nội địa & quốc tế',
              badge: 'Tư vấn & Kết nối đối tác',
              desc: 'Tra cứu hành trình bay giữa Hà Nội, Huế, Đà Nẵng, TP.HCM và gửi yêu cầu hỗ trợ lịch bay hoặc kết hợp xe trung chuyển.',
              to: '/may-bay',
              cta: 'Khám phá dịch vụ bay ➜',
            },
            {
              icon: '🚆',
              title: 'Vé tàu hỏa Thống Nhất Bắc – Nam',
              badge: 'Hành trình đường sắt',
              desc: 'Thông tin tuyến đường sắt Bắc – Nam, khoang giường nằm điều hòa và kết nối phương tiện đón trả tại ga.',
              to: '/tau-hoa',
              cta: 'Xem thông tin tàu hỏa ➜',
            },
            {
              icon: '🚐',
              title: 'Thuê xe hợp đồng & Du lịch',
              badge: 'Báo giá theo lộ trình',
              desc: 'Dịch vụ thuê xe Limousine 9–20 chỗ, xe giường nằm hợp đồng cho đoàn du lịch, công tác và sự kiện riêng.',
              to: '/thue-xe',
              cta: 'Xem danh sách xe thuê ➜',
            },
          ].map((srv) => (
            <article key={srv.to} className="vx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{srv.icon}</span>
                  <span className="vx-badge vx-badge-green">{srv.badge}</span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18.5, color: 'var(--gw-dark)' }}>{srv.title}</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-muted)', lineHeight: 1.6 }}>{srv.desc}</p>
              </div>
              <Link to={srv.to} className="vx-btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                {srv.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* 5. HÃNG XE TIÊU BIỂU */}
      <section className="gw-section" style={{ paddingTop: 0 }}>
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Đối tác vận tải uy tín</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Hãng xe tiêu biểu trên sàn Vé Xuyên Việt
            </h2>
          </div>
          <Link to="/hang-xe" className="vx-btn-outline" style={{ textDecoration: 'none' }}>
            Xem tất cả hãng xe ➜
          </Link>
        </div>

        <div className="vx-grid-3">
          {(uniqueOperators.length > 0
            ? uniqueOperators
            : [
                {
                  id: 'op-1',
                  name: 'Phương Trang Futa Bus Lines',
                  slug: 'phuong-trang',
                  vehicleType: 'Limousine 20 Phòng Đôi VIP',
                  routeName: 'Tuyến Xuyên Việt Bắc – Nam',
                },
                {
                  id: 'op-2',
                  name: 'Hoàng Long Luxury Limousine',
                  slug: 'hoang-long',
                  vehicleType: 'Giường nằm 2 tầng cao cấp',
                  routeName: 'Hà Nội – Huế – Đà Nẵng – TP.HCM',
                },
              ]
          ).map((op) => (
            <article key={op.id} className="vx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="vx-badge vx-badge-green">★ 4.9 Đối tác chính thức</span>
                  <span style={{ fontSize: 12, color: 'var(--gw-muted)', fontWeight: 700 }}>Xác nhận tức thì</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: 19, color: 'var(--gw-dark)' }}>{op.name}</h3>
                <div style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
                  🚍 Dòng xe chủ lực: <strong>{op.vehicleType}</strong>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginTop: 4 }}>
                  🗺️ Tuyến khai thác: <strong>{op.routeName}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <Link to={`/hang-xe/${op.slug || op.id}`} className="vx-btn-outline" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>
                  Chi tiết hãng
                </Link>
                <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>
                  Xem lịch chạy ➜
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 6. ĐIỂM ĐẾN DU LỊCH & CAROUSEL TỰ ĐỘNG */}
      <section className="gw-section" style={{ paddingTop: 0 }}>
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Điểm đến du lịch</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Điểm đến nổi bật dọc hành trình Xuyên Việt
            </h2>
          </div>
          <Link to="/diem-den" className="vx-btn-outline" style={{ textDecoration: 'none' }}>
            Khám phá tất cả điểm đến ➜
          </Link>
        </div>

        <div className="vx-grid-4">
          {[
            {
              name: destinations[0]?.name || 'Cố đô Huế',
              slug: destinations[0]?.slug || 'co-do-hue',
              sub: 'Bến xe Phía Nam Huế',
              count: '6 Chuyến/ngày',
              img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
            },
            {
              name: destinations[1]?.name || 'Đà Nẵng',
              slug: destinations[1]?.slug || 'da-nang',
              sub: 'Bến xe Trung tâm Đà Nẵng',
              count: '9 Chuyến/ngày',
              img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=700&q=80',
            },
            {
              name: 'Thủ đô Hà Nội',
              slug: 'ha-noi',
              sub: 'Bến xe Nước Ngầm & Giáp Bát',
              count: '12 Chuyến/ngày',
              img: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=700&q=80',
            },
            {
              name: 'TP. Hồ Chí Minh',
              slug: 'tp-ho-chi-minh',
              sub: 'Bến xe Miền Đông Mới',
              count: '10 Chuyến/ngày',
              img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=700&q=80',
            },
          ].map((d) => (
            <Link
              key={d.slug}
              to={`/diem-den/${d.slug}`}
              className="gw-activity-card"
              style={{ backgroundImage: `url(${d.img})`, height: 310, textDecoration: 'none' }}
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
                <div style={{ color: 'var(--gw-orange)', fontWeight: 700, fontSize: 13 }}>{d.sub}</div>
                <h3 style={{ margin: '4px 0 0', fontSize: 22 }}>{d.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CAROUSEL KHÁM PHÁ TỰ ĐỘNG TRƯỢT MƯỢT MÀ */}
      <section
        className="mona-discover-section"
        aria-labelledby="discover-title"
        onMouseEnter={() => setDiscoverPaused(true)}
        onMouseLeave={() => setDiscoverPaused(false)}
      >
        <div className="mona-discover-heading">
          <div>
            <span className="gw-sub-pill">Trải nghiệm theo cách riêng</span>
            <h2 id="discover-title">Khám phá những điều tuyệt vời</h2>
          </div>
          <div className="mona-carousel-controls" aria-label="Điều khiển điểm đến">
            <button
              type="button"
              aria-label="Cuộn sang trái"
              onClick={() => {
                setDiscoverAnimating(true);
                setDiscoverIdx((prev) => (prev <= 0 ? MONA_DISCOVER_CARDS.length - 1 : prev - 1));
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Cuộn sang phải"
              onClick={() => {
                setDiscoverAnimating(true);
                setDiscoverIdx((prev) => (prev >= MONA_DISCOVER_CARDS.length ? 1 : prev + 1));
              }}
            >
              ›
            </button>
          </div>
        </div>
        <div className="mona-discover-viewport">
          <div
            className={`mona-discover-track${discoverAnimating ? '' : ' no-transition'}`}
            id="mona-discover-track"
            style={{ '--discover-index': discoverIdx } as React.CSSProperties}
          >
            {[...MONA_DISCOVER_CARDS, ...MONA_DISCOVER_CARDS.slice(0, 4)].map((card, i) => (
              <article
                className="mona-discover-card"
                key={`${card.title}-${i}`}
                style={{ backgroundImage: `url(${card.image})` }}
                onClick={() => navigate(`/diem-den/${card.slug}`)}
              >
                <div className="mona-discover-overlay" />
                <div className="mona-discover-content">
                  <span className="mona-plus">+</span>
                  <h3>{card.title}</h3>
                  <small>{card.label}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="mona-discover-dots" role="tablist" aria-label="Chỉ mục slide khám phá">
          {MONA_DISCOVER_CARDS.map((card, i) => {
            const activeDot = discoverIdx % MONA_DISCOVER_CARDS.length === i;
            return (
              <button
                key={card.title}
                type="button"
                aria-label={`Chuyển tới ${card.title}`}
                className={`mona-discover-dot${activeDot ? ' active' : ''}`}
                onClick={() => {
                  setDiscoverAnimating(true);
                  setDiscoverIdx(i);
                }}
              />
            );
          })}
        </div>
      </section>

      {/* 7. LỢI ÍCH KHI ĐẶT QUA RIDEWAY */}
      <section className="gw-section">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="gw-sub-pill">Lợi ích khi đặt qua RideWay</span>
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

      {/* CÔNG NGHỆ ĐẶT VÉ & THỐNG KÊ */}
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
              <Link to="/xe-khach/tim-kiem" className="gw-btn-orange" style={{ alignSelf: 'flex-start' }}>
                Tìm chuyến ngay ➜
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mona-stats-section" aria-labelledby="stats-title">
        <div className="mona-centered-heading">
          <span className="gw-sub-pill">Chuyến đi thú vị</span>
          <h2 id="stats-title">Thành tựu đạt được</h2>
        </div>
        <div className="mona-stats-grid">
          {MONA_STATS.map((stat) => (
            <article className="mona-stat-card" key={stat.label}>
              <span className="mona-stat-icon">{stat.icon}</span>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      {/* 8. BÀI VIẾT DU LỊCH & TIN TỨC */}
      <section className="gw-section" style={{ paddingTop: 0 }}>
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Bài viết du lịch & Cẩm nang</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Thông tin tuyến xe và kinh nghiệm di chuyển đường dài
            </h2>
          </div>
          <Link to="/tin-tuc" className="vx-btn-outline" style={{ textDecoration: 'none' }}>
            Xem tất cả bài viết ➜
          </Link>
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
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 6 }}>
                    👤 Ban biên tập Vé Xuyên Việt • 🚍 Cẩm nang
                  </div>
                  <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>{p.title}</h3>
                  <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--gw-muted)' }}>{p.summary}</p>
                </div>
                <Link to={`/tin-tuc/${p.slug}`} className="vx-btn-outline" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Đọc chi tiết ➜
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* PRE-FOOTER CTA */}
      <div className="gw-cta-bar">
        <div className="gw-cta-inner">
          <div>
            <div style={{ color: 'var(--gw-green)', fontWeight: 800, fontSize: 14 }}>
              Bạn cần tư vấn chọn phòng đôi Limousine hoặc đặt vé đoàn?
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: 25, fontWeight: 800, color: 'var(--gw-dark)' }}>
              Sẵn sàng khởi hành cùng Vé Xuyên Việt – RideWay ngay hôm nay!
            </h3>
          </div>
          <Link to="/xe-khach/tim-kiem" className="gw-btn-green">
            Tìm chuyến & Chọn chỗ ➜
          </Link>
        </div>
      </div>
    </div>
  );
}
