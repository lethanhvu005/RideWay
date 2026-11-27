import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function RailwaysLandingPage() {
  const navigate = useNavigate();
  const [fromStation, setFromStation] = useState('Ga Hà Nội');
  const [toStation, setToStation] = useState('Ga Huế / Ga Đà Nẵng');
  const [departDate, setDepartDate] = useState('');
  const [seatType, setSeatType] = useState('Giường nằm khoang 4 điều hòa');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams({ fromStation, toStation, departDate, seatType });
    navigate(`/tau-hoa/tim-kiem?${qs.toString()}`);
  };

  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Khu vực Đường sắt Bắc – Nam (/tau-hoa)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', margin: '8px 0', color: '#fff' }}>
            Hành trình Tàu hỏa Thống Nhất & Kết nối xe trung chuyển
          </h1>
          <p style={{ maxWidth: 680, color: '#dbeafe', margin: 0 }}>
            Tra cứu thông tin các ga tàu Bắc – Nam (Hà Nội, Huế, Đà Nẵng, Sài Gòn), lựa chọn loại ghế/giường và đăng ký hỗ trợ đặt vé đoàn hoặc xe đón tại ga.
          </p>
        </div>
      </section>

      <div className="vx-container" style={{ marginTop: -36 }}>
        <form className="vx-card" onSubmit={handleSubmit}>
          <div className="vx-grid-4" style={{ alignItems: 'end' }}>
            <div>
              <label className="vx-field-label">Ga đi</label>
              <select className="vx-select" value={fromStation} onChange={(e) => setFromStation(e.target.value)}>
                <option>Ga Hà Nội</option>
                <option>Ga Huế</option>
                <option>Ga Đà Nẵng</option>
                <option>Ga Sài Gòn</option>
              </select>
            </div>
            <div>
              <label className="vx-field-label">Ga đến</label>
              <select className="vx-select" value={toStation} onChange={(e) => setToStation(e.target.value)}>
                <option>Ga Huế / Ga Đà Nẵng</option>
                <option>Ga Đà Nẵng</option>
                <option>Ga Sài Gòn</option>
                <option>Ga Hà Nội</option>
              </select>
            </div>
            <div>
              <label className="vx-field-label">Loại ghế / giường</label>
              <select className="vx-select" value={seatType} onChange={(e) => setSeatType(e.target.value)}>
                <option>Giường nằm khoang 4 điều hòa</option>
                <option>Giường nằm khoang 6 điều hòa</option>
                <option>Ghế ngồi mềm điều hòa</option>
              </select>
            </div>
            <div>
              <label className="vx-field-label">Ngày khởi hành</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" className="vx-input" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
                <button type="submit" className="vx-btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  Tra cứu ➜
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="vx-card" style={{ marginTop: 22, background: 'var(--gw-green-light)', borderLeft: '5px solid var(--gw-green)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>
            ℹ️ Trạng thái tích hợp đối tác Đường sắt
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gw-text)', lineHeight: 1.65 }}>
            Cổng dữ liệu trực tuyến của Tổng công ty Đường sắt hiện đang trong giai đoạn tích hợp đối tác affiliate. RideWay <strong>không tạo lịch tàu hay tình trạng toa/giường giả lập</strong>. Nếu bạn cần giữ chỗ trực tuyến ngay lập tức với sơ đồ 2 tầng thời gian thực trên trục Bắc – Trung – Nam, vui lòng chọn tuyến <strong>Xe khách & Limousine 2 tầng</strong> bên dưới.
          </p>
          <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            🚍 Đặt vé Xe Limousine 2 tầng trực tuyến (Có sơ đồ chỗ thật) ➜
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RailwaysSearchPage() {
  const [searchParams] = useSearchParams();
  const [sent, setSent] = useState(false);
  const fromStation = searchParams.get('fromStation') || 'Ga Hà Nội';
  const toStation = searchParams.get('toStation') || 'Ga Đà Nẵng';
  const seatType = searchParams.get('seatType') || 'Giường nằm khoang 4 điều hòa';

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/tau-hoa" style={{ color: 'var(--gw-green)' }}>Tàu hỏa</Link> /{' '}
        <span>Kết quả tra cứu</span>
      </div>

      <div className="gw-split-2">
        <div className="vx-card">
          <span className="vx-badge vx-badge-amber">KẾT NỐI ĐỐI TÁC ĐƯỜNG SẮT</span>
          <h1 style={{ margin: '10px 0 8px', fontSize: 24, color: 'var(--gw-dark)' }}>
            Tuyến: {fromStation} → {toStation}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gw-muted)' }}>
            Hạng chỗ quan tâm: <strong>{seatType}</strong>
          </p>
          <p style={{ fontSize: 14, color: 'var(--gw-text)', lineHeight: 1.65 }}>
            Chức năng xuất vé tàu tự động đang chờ kết nối API đối tác chính thức. Để không làm gián đoạn kế hoạch di chuyển của bạn, chúng tôi gợi ý các chuyến <strong>Limousine 20 Phòng Đôi VIP & Giường nằm 2 tầng</strong> đang mở bán trực tuyến trên cùng hành trình với giá theo từng đoạn chặng.
          </p>
          <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            🚍 Xem ngay các chuyến Xe Limousine 2 tầng trên chặng này ➜
          </Link>
        </div>

        <form
          className="vx-card"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>
            Gửi yêu cầu hỗ trợ vé tàu đoàn / Affiliate
          </h3>
          {sent ? (
            <div style={{ padding: 16, background: 'var(--gw-green-light)', borderRadius: 10, color: 'var(--gw-green-dark)', fontWeight: 700 }}>
              ✓ Đã ghi nhận yêu cầu hỗ trợ tuyến {fromStation} → {toStation}.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="vx-field-label">Họ và tên</label>
                <input className="vx-input" required placeholder="Nhập họ và tên..." />
              </div>
              <div>
                <label className="vx-field-label">Số điện thoại liên hệ</label>
                <input className="vx-input" required placeholder="0901234567" />
              </div>
              <button type="submit" className="vx-btn-primary">
                Đăng ký nhận tư vấn ➜
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
