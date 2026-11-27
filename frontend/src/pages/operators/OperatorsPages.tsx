import { Link, useParams } from 'react-router-dom';
import { useGetTripsQuery } from '../../services/ridewayApi';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function OperatorsListPage() {
  const { data: trips = [], isLoading } = useGetTripsQuery({ fromSequence: 0, toSequence: 2 });

  const operatorsMap = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      tripCount: number;
      vehicleTypes: Set<string>;
      routes: Set<string>;
    }
  >();

  for (const t of trips) {
    const slug = toSlug(t.operator_name) || t.operator_id;
    const existing = operatorsMap.get(t.operator_id);
    if (existing) {
      existing.tripCount += 1;
      existing.vehicleTypes.add(t.vehicle_type);
      existing.routes.add(t.route_name);
    } else {
      operatorsMap.set(t.operator_id, {
        id: t.operator_id,
        name: t.operator_name,
        slug,
        tripCount: 1,
        vehicleTypes: new Set([t.vehicle_type]),
        routes: new Set([t.route_name]),
      });
    }
  }

  const operators = Array.from(operatorsMap.values());

  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Đối tác vận tải chính thức (/hang-xe)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 38px)', margin: '8px 0', color: '#fff' }}>
            Hệ thống Hãng xe khách & Limousine 2 tầng trên sàn RideWay
          </h1>
          <p style={{ maxWidth: 660, color: '#dbeafe', margin: 0 }}>
            Tất cả hãng xe đều được kiểm duyệt giấy phép kinh doanh vận tải, đồng bộ sơ đồ phòng đôi/giường nằm 2 tầng thời gian thực và cam kết giữ chỗ 100%.
          </p>
        </div>
      </section>

      <section className="gw-section">
        {isLoading && <div className="vx-card">Đang tải danh sách hãng xe đối tác…</div>}

        <div className="vx-grid-3">
          {operators.map((op) => (
            <article key={op.id} className="vx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div className="gw-card-row" style={{ marginBottom: 8 }}>
                  <span className="vx-badge vx-badge-green">★ 4.9 Đối tác xác thực</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-green-dark)' }}>
                    {op.tripCount} chuyến mở bán
                  </span>
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--gw-dark)' }}>{op.name}</h2>
                <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 4 }}>
                  🚍 Dòng xe: <strong>{Array.from(op.vehicleTypes).join(', ')}</strong>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
                  🗺️ Tuyến khai thác: <strong>{Array.from(op.routes).join(', ')}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link to={`/hang-xe/${op.slug}`} className="vx-btn-outline" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                  Xem hồ sơ hãng
                </Link>
                <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                  Đặt vé ngay ➜
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="vx-card" style={{ marginTop: 28, background: 'var(--gw-green-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', color: 'var(--gw-dark)' }}>
              Bạn là doanh nghiệp vận tải hành khách muốn mở bán trên RideWay?
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-muted)' }}>
              Đăng ký tài khoản đối tác trực tuyến để quản lý đội xe, sơ đồ 2 tầng, giá vé theo đoạn chặng và đối soát minh bạch.
            </p>
          </div>
          <Link to="/doi-tac" className="vx-btn-primary" style={{ textDecoration: 'none' }}>
            Truy cập Kênh Đối tác (/doi-tac) ➜
          </Link>
        </div>
      </section>
    </div>
  );
}

export function OperatorDetailPage() {
  const { slug = '' } = useParams();
  const { data: trips = [], isLoading } = useGetTripsQuery({ fromSequence: 0, toSequence: 2 });

  const matchingTrips = trips.filter(
    (t) => toSlug(t.operator_name) === slug || t.operator_id === slug || toSlug(t.operator_name).includes(slug)
  );
  const displayTrips = matchingTrips.length > 0 ? matchingTrips : trips;
  const operatorName =
    matchingTrips[0]?.operator_name ||
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/hang-xe" style={{ color: 'var(--gw-green)' }}>Hãng xe</Link> /{' '}
        <span>{operatorName}</span>
      </div>

      <div className="vx-card" style={{ marginBottom: 24, borderLeft: '5px solid var(--gw-green)' }}>
        <span className="vx-badge vx-badge-green">ĐỐI TÁC CHÍNH THỨC TRÊN SÀN RIDEWAY</span>
        <h1 style={{ margin: '8px 0 6px', fontSize: 'clamp(22px, 2.8vw, 32px)', color: 'var(--gw-dark)' }}>
          Nhà xe {operatorName}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--gw-muted)' }}>
          Cam kết giữ đúng mã phòng đôi / giường nằm 2 tầng khách chọn trên sơ đồ, hỗ trợ thanh toán VNPay QR 100% và xuất vé điện tử tức thì.
        </p>
      </div>

      <h2 className="gw-sec-title">Các chuyến xe đang mở bán của hãng</h2>
      {isLoading && <div className="vx-card">Đang tải lịch chạy của hãng…</div>}

      <div className="vx-grid-3">
        {displayTrips.map((t) => (
          <article key={t.id} className="vx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="gw-card-row" style={{ marginBottom: 8 }}>
                <span className="vx-badge vx-badge-green">{t.vehicle_type}</span>
                <strong style={{ color: 'var(--gw-green)', fontSize: 18 }}>
                  {t.min_price ? `${Number(t.min_price).toLocaleString('vi-VN')}₫` : 'Theo chặng'}
                </strong>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--gw-dark)' }}>{t.route_name}</h3>
              <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
                🕒 Khởi hành: {new Date(t.departure_at).toLocaleString('vi-VN')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to={`/xe-khach/chuyen/${t.id}`} className="vx-btn-outline" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                Chi tiết
              </Link>
              <Link to={`/xe-khach/chuyen/${t.id}/chon-cho`} className="vx-btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                Chọn chỗ ➜
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
