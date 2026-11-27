import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetLocationsQuery, useGetVehicleTypesQuery } from '../../services/ridewayApi';

const RENTAL_FLEET = [
  {
    id: 'limo-20-cabin',
    name: 'Xe Limousine 20 Phòng Đôi VIP (Hợp đồng nguyên chuyến)',
    seats: 20,
    category: 'Limousine 2 tầng cao cấp',
    usage: 'Phù hợp đoàn gia đình, doanh nghiệp, tour xuyên Việt Hà Nội – Huế – Đà Nẵng',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sleeper-34-bed',
    name: 'Xe Giường Nằm 2 Tầng 34 Chỗ Tiêu Chuẩn',
    seats: 34,
    category: 'Giường nằm đường dài',
    usage: 'Phù hợp đoàn du lịch lữ hành, hành hương, đưa đón sự kiện liên tỉnh',
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'minivan-9-vip',
    name: 'Limousine DCar 9–11 Ghế Boeing Massage',
    seats: 9,
    category: 'Minivan VIP trung chuyển',
    usage: 'Phù hợp đón tiễn sân bay, công tác nội vùng Hà Nội / Huế / Đà Nẵng / Hội An',
    image: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=900&q=80',
  },
];

export function RentalsLandingPage() {
  const { data: locations = [] } = useGetLocationsQuery();
  const { data: vehicleTypes = [] } = useGetVehicleTypesQuery();

  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Dịch vụ Thuê xe Hợp đồng & Du lịch (/thue-xe)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', margin: '8px 0', color: '#fff' }}>
            Thuê xe Limousine & Xe du lịch nguyên chuyến theo lộ trình riêng
          </h1>
          <p style={{ maxWidth: 680, color: '#dbeafe', margin: 0 }}>
            Đặt thuê xe hợp đồng từ mạng lưới các hãng xe đối tác trên RideWay. Nhận báo giá minh bạch theo điểm nhận/trả, thời gian và dòng xe yêu cầu.
          </p>
        </div>
      </section>

      <section className="gw-section">
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Danh mục xe hợp đồng</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Các dòng xe cho thuê phổ biến ({vehicleTypes.length || RENTAL_FLEET.length} dòng xe)
            </h2>
          </div>
          <Link to="/thue-xe/danh-sach" className="vx-btn-primary" style={{ textDecoration: 'none' }}>
            Xem toàn bộ danh sách xe thuê ➜
          </Link>
        </div>

        <div className="vx-grid-3">
          {RENTAL_FLEET.map((item) => (
            <article key={item.id} className="gw-tour-card">
              <div className="gw-tour-img" style={{ backgroundImage: `url(${item.image})` }}>
                <span className="gw-tour-badge-left" style={{ background: 'var(--gw-green)' }}>
                  {item.seats} vị trí
                </span>
              </div>
              <div className="gw-tour-body">
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-green-dark)' }}>{item.category}</span>
                  <h3 style={{ margin: '4px 0 8px', fontSize: 18.5, color: 'var(--gw-dark)' }}>{item.name}</h3>
                  <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--gw-muted)' }}>{item.usage}</p>
                </div>
                <Link to={`/thue-xe/${item.id}`} className="vx-btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Xem chi tiết & Yêu cầu báo giá ➜
                </Link>
              </div>
            </article>
          ))}
        </div>

        {locations.length > 0 && (
          <div className="vx-card" style={{ marginTop: 28, background: 'var(--gw-green-light)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>
              Phạm vi phục vụ đón trả hợp đồng
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--gw-muted)' }}>
              Hỗ trợ nhận và trả khách tại tất cả các điểm thuộc hệ thống RideWay:{' '}
              <strong>{locations.map((l) => `${l.name} (${l.province})`).join(' • ')}</strong>.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function RentalsListPage() {
  const [seatFilter, setSeatFilter] = useState<'ALL' | '9' | '20' | '34'>('ALL');
  const filtered =
    seatFilter === 'ALL'
      ? RENTAL_FLEET
      : RENTAL_FLEET.filter((item) => String(item.seats) === seatFilter);

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/thue-xe" style={{ color: 'var(--gw-green)' }}>Thuê xe</Link> /{' '}
        <span>Danh sách xe cho thuê</span>
      </div>

      <div className="vx-section-header">
        <div>
          <span className="gw-sub-pill">Danh sách phương tiện (/thue-xe/danh-sach)</span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, color: 'var(--gw-dark)' }}>
            Chọn dòng xe phù hợp với quy mô đoàn của bạn
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'Tất cả số chỗ' },
            { id: '9', label: '9–11 chỗ VIP' },
            { id: '20', label: '20 Phòng đôi' },
            { id: '34', label: '34 Giường nằm' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={seatFilter === f.id ? 'vx-btn-primary' : 'vx-btn-outline'}
              onClick={() => setSeatFilter(f.id as typeof seatFilter)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="vx-grid-3">
        {filtered.map((item) => (
          <article key={item.id} className="gw-tour-card">
            <div className="gw-tour-img" style={{ backgroundImage: `url(${item.image})` }}>
              <span className="gw-tour-badge-left" style={{ background: 'var(--gw-green)' }}>
                {item.seats} chỗ
              </span>
            </div>
            <div className="gw-tour-body">
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: 18.5, color: 'var(--gw-dark)' }}>{item.name}</h2>
                <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--gw-muted)' }}>{item.usage}</p>
              </div>
              <Link to={`/thue-xe/${item.id}`} className="vx-btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                Chi tiết & Gửi yêu cầu báo giá ➜
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function RentalDetailPage() {
  const { id = '' } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const vehicle = RENTAL_FLEET.find((v) => v.id === id) ?? RENTAL_FLEET[0];

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/thue-xe/danh-sach" style={{ color: 'var(--gw-green)' }}>Danh sách xe thuê</Link> /{' '}
        <span>{vehicle.name}</span>
      </div>

      <div className="gw-split-2">
        <div className="vx-card">
          <div
            style={{
              height: 260,
              borderRadius: 12,
              backgroundImage: `url(${vehicle.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              marginBottom: 16,
            }}
          />
          <span className="vx-badge vx-badge-green">{vehicle.category} • {vehicle.seats} chỗ</span>
          <h1 style={{ margin: '10px 0 8px', fontSize: 24, color: 'var(--gw-dark)' }}>{vehicle.name}</h1>
          <p style={{ fontSize: 14, color: 'var(--gw-muted)', lineHeight: 1.65 }}>{vehicle.usage}</p>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9, fontSize: 14 }}>
            <li>Báo giá trọn gói bao gồm tài xế đường dài kinh nghiệm, phí cầu đường và bảo hiểm hành khách.</li>
            <li>Lộ trình và thời gian đón trả linh hoạt theo yêu cầu riêng của đoàn.</li>
          </ul>
        </div>

        <form
          className="vx-card"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <span className="gw-sub-pill">Gửi yêu cầu báo giá hợp đồng</span>
          <h2 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
            Nhận báo giá từ Hãng xe đối tác
          </h2>
          {submitted ? (
            <div style={{ padding: 16, background: 'var(--gw-green-light)', borderRadius: 10, color: 'var(--gw-green-dark)', fontWeight: 700 }}>
              ✓ Đã gửi yêu cầu báo giá thuê dòng xe <strong>{vehicle.name}</strong>. Bộ phận điều hành xe hợp đồng sẽ liên hệ báo giá chi tiết theo lộ trình của bạn.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="vx-field-label">Điểm đón (Nhận xe)</label>
                <input className="vx-input" required placeholder="VD: Quận Hoàn Kiếm, Hà Nội" />
              </div>
              <div>
                <label className="vx-field-label">Điểm đến & Lộ trình dự kiến</label>
                <input className="vx-input" required placeholder="VD: Hà Nội → Cố đô Huế → Đà Nẵng (3 ngày 2 đêm)" />
              </div>
              <div className="vx-grid-3">
                <div>
                  <label className="vx-field-label">Ngày khởi hành</label>
                  <input type="date" className="vx-input" required />
                </div>
                <div>
                  <label className="vx-field-label">Ngày kết thúc</label>
                  <input type="date" className="vx-input" required />
                </div>
                <div>
                  <label className="vx-field-label">Số lượng khách</label>
                  <input type="number" min={1} max={100} defaultValue={vehicle.seats} className="vx-input" required />
                </div>
              </div>
              <div>
                <label className="vx-field-label">Họ tên & Số điện thoại người đặt</label>
                <input className="vx-input" required placeholder="Nguyễn Văn A - 0901234567" />
              </div>
              <button type="submit" className="vx-btn-primary">
                Gửi yêu cầu báo giá thuê xe ➜
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
