import { Link, useParams } from 'react-router-dom';
import {
  useGetDestinationsQuery,
  useGetLocationsQuery,
  useGetTripsQuery,
} from '../../services/ridewayApi';

const FALLBACK_IMAGES: Record<string, string> = {
  hue: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=900&q=80',
  'da-nang': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=900&q=80',
  'ha-noi': 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=900&q=80',
  default: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80',
};

function pickImage(slug: string): string {
  if (slug.includes('hue')) return FALLBACK_IMAGES.hue;
  if (slug.includes('da-nang')) return FALLBACK_IMAGES['da-nang'];
  if (slug.includes('ha-noi')) return FALLBACK_IMAGES['ha-noi'];
  return FALLBACK_IMAGES.default;
}

export function DestinationsListPage() {
  const { data: destinations = [], isLoading } = useGetDestinationsQuery();
  const { data: locations = [] } = useGetLocationsQuery();

  const mergedDestinations =
    destinations.length >= 4
      ? destinations
      : [
          ...destinations,
          {
            id: 'dest-hn',
            name: 'Thủ đô Hà Nội',
            slug: 'ha-noi',
            intro: 'Trung tâm văn hóa nghìn năm văn hiến, điểm khởi đầu của các tuyến Limousine 2 tầng Xuyên Việt từ Bến xe Nước Ngầm.',
          },
          {
            id: 'dest-hcm',
            name: 'TP. Hồ Chí Minh',
            slug: 'tp-ho-chi-minh',
            intro: 'Đô thị sôi động bậc nhất phía Nam, kết nối toàn tuyến Bắc – Nam tại Bến xe Miền Đông Mới.',
          },
        ];

  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Cẩm nang Điểm đến & Bến xe (/diem-den)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 38px)', margin: '8px 0', color: '#fff' }}>
            Khám phá các điểm đến du lịch dọc hành trình Xuyên Việt
          </h1>
          <p style={{ maxWidth: 660, color: '#dbeafe', margin: 0 }}>
            Thông tin bến xe trung tâm, gợi ý lịch trình khám phá và các chuyến xe Limousine phòng đôi 2 tầng kết nối trực tiếp từng điểm đến.
          </p>
        </div>
      </section>

      <section className="gw-section">
        {isLoading && <div className="vx-card">Đang tải danh sách điểm đến…</div>}

        <div className="vx-grid-3">
          {mergedDestinations.map((d) => (
            <article key={d.id} className="gw-tour-card">
              <div
                className="gw-tour-img"
                style={{ backgroundImage: `url(${pickImage(d.slug)})`, height: 220 }}
              >
                <span className="gw-tour-badge-left" style={{ background: 'var(--gw-green)' }}>
                  Điểm đến nổi bật
                </span>
              </div>
              <div className="gw-tour-body">
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--gw-dark)' }}>{d.name}</h2>
                  <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--gw-muted)', lineHeight: 1.6 }}>
                    {d.intro}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link to={`/diem-den/${d.slug}`} className="vx-btn-outline" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                    Khám phá
                  </Link>
                  <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                    Tìm chuyến xe ➜
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {locations.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <h2 className="gw-sec-title">Hệ thống Bến xe & Trạm dừng trong Cơ sở dữ liệu (`/api/v1/locations`)</h2>
            <div className="vx-grid-4">
              {locations.map((loc) => (
                <div key={loc.id} className="vx-card">
                  <span className="vx-badge vx-badge-green">{loc.province}</span>
                  <h3 style={{ margin: '8px 0 6px', fontSize: 17, color: 'var(--gw-dark)' }}>{loc.name}</h3>
                  <Link to={`/xe-khach/tim-kiem?to=${loc.id}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green)' }}>
                    Tìm chuyến đi {loc.province} ➜
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function DestinationDetailPage() {
  const { slug = '' } = useParams();
  const { data: destinations = [] } = useGetDestinationsQuery();
  const { data: trips = [] } = useGetTripsQuery({ fromSequence: 0, toSequence: 2 });

  const matched = destinations.find((d) => d.slug === slug);
  const title =
    matched?.name ||
    (slug.includes('hue')
      ? 'Cố đô Huế'
      : slug.includes('da-nang')
      ? 'TP. Đà Nẵng'
      : slug.includes('ha-noi')
      ? 'Thủ đô Hà Nội'
      : 'Điểm đến Du lịch Việt Nam');

  return (
    <div>
      <section
        className="rw-page-banner"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(13,46,89,0.72), rgba(13,46,89,0.92)), url(${pickImage(slug)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="vx-container">
          <div style={{ fontSize: 13, color: '#c5dcf8', marginBottom: 6 }}>
            <Link to="/" style={{ color: '#fff' }}>Trang chủ</Link> /{' '}
            <Link to="/diem-den" style={{ color: '#fff' }}>Điểm đến</Link> /{' '}
            <span>{title}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', margin: '6px 0 10px', color: '#fff' }}>
            {title}
          </h1>
          <p style={{ maxWidth: 680, color: '#dbeafe', fontSize: 15, margin: 0 }}>
            {matched?.intro ||
              `Khám phá vẻ đẹp văn hóa, ẩm thực và danh lam thắng cảnh tại ${title} cùng hệ thống xe khách & Limousine 2 tầng đặt chỗ theo đoạn chặng.`}
          </p>
        </div>
      </section>

      <div className="vx-container">
        <div className="gw-split-2" style={{ marginBottom: 28 }}>
          <div className="vx-card">
            <h2 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Cẩm nang di chuyển đến {title}</h2>
            <p style={{ fontSize: 14, color: 'var(--gw-muted)', lineHeight: 1.7 }}>
              Hành khách di chuyển đến <strong>{title}</strong> qua nền tảng Vé Xuyên Việt – RideWay có thể chọn đúng đoạn chặng từ trạm xuất phát đến bến xe trung tâm mà không phải trả cước toàn tuyến. Hệ thống sơ đồ 2 tầng cho phép bạn chọn phòng đôi Limousine (2NL + 1TE) hoặc giường đơn tầng dưới êm ái.
            </p>
            <ul style={{ paddingLeft: 18, lineHeight: 1.9, fontSize: 14 }}>
              <li>Giữ chỗ nguyên tử 10 phút ngay khi chọn vị trí trên sơ đồ.</li>
              <li>Thanh toán 100% qua VNPay QR, nhận ngay mã vé điện tử HMAC.</li>
              <li>Hỗ trợ đón tại bến cố định hoặc gửi yêu cầu đón tận nơi.</li>
            </ul>
          </div>

          <div className="vx-card" style={{ background: 'var(--gw-green-light)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Đặt vé đi {title} ngay hôm nay</h3>
            <p style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
              Hiện có <strong>{trips.length}</strong> chuyến xe đường dài đi qua tuyến kết nối này đang mở bán trực tuyến.
            </p>
            <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Mở danh sách chuyến & Chọn chỗ 2 tầng ➜
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
