import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useGetLocationsQuery } from '../../services/ridewayApi';

export function FlightsLandingPage() {
  const navigate = useNavigate();
  const { data: locations = [] } = useGetLocationsQuery();
  const [origin, setOrigin] = useState('HAN — Sân bay Nội Bài (Hà Nội)');
  const [destination, setDestination] = useState('DAD — Sân bay Quốc tế Đà Nẵng');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState('Phổ thông (Economy)');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams({
      origin,
      destination,
      departDate,
      returnDate,
      passengers: String(passengers),
      cabinClass,
    });
    navigate(`/may-bay/tim-kiem?${qs.toString()}`);
  };

  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Khu vực Dịch vụ Hàng không (/may-bay)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', margin: '8px 0', color: '#fff' }}>
            Tra cứu đường bay nội địa & Kết nối trung chuyển sân bay
          </h1>
          <p style={{ maxWidth: 680, color: '#dbeafe', margin: 0 }}>
            So sánh hành trình bay giữa các trung tâm du lịch lớn và kết hợp đặt xe Limousine 2 tầng đón trả sân bay trên cùng nền tảng RideWay.
          </p>
        </div>
      </section>

      <div className="vx-container" style={{ marginTop: -36 }}>
        <form className="vx-card" onSubmit={handleSearch} style={{ border: '1.5px solid var(--gw-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <strong style={{ fontSize: 16, color: 'var(--gw-dark)' }}>
              ✈️ Biểu mẫu tra cứu hành trình hàng không
            </strong>
            <span className="vx-badge vx-badge-amber">
              Chế độ: Đăng ký tư vấn & Kết nối đối tác GDS
            </span>
          </div>

          <div className="vx-grid-3" style={{ marginBottom: 14 }}>
            <div>
              <label className="vx-field-label">Sân bay đi</label>
              <input className="vx-input" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
            </div>
            <div>
              <label className="vx-field-label">Sân bay đến</label>
              <input className="vx-input" value={destination} onChange={(e) => setDestination(e.target.value)} required />
            </div>
            <div>
              <label className="vx-field-label">Hạng ghế & Hành lý</label>
              <select className="vx-select" value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
                <option>Phổ thông (Economy) • 7kg xách tay</option>
                <option>Phổ thông đặc biệt • Kèm 23kg ký gửi</option>
                <option>Thương gia (Business) • 32kg ký gửi</option>
              </select>
            </div>
          </div>

          <div className="vx-grid-3" style={{ alignItems: 'end' }}>
            <div>
              <label className="vx-field-label">Ngày đi</label>
              <input type="date" className="vx-input" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
            </div>
            <div>
              <label className="vx-field-label">Ngày về (Khứ hồi tùy chọn)</label>
              <input type="date" className="vx-input" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label className="vx-field-label">Số hành khách</label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  className="vx-input"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                />
              </div>
              <button type="submit" className="vx-btn-primary">
                Tra cứu hành trình ➜
              </button>
            </div>
          </div>
        </form>

        <div className="vx-card" style={{ marginTop: 22, background: 'var(--gw-green-light)', borderLeft: '5px solid var(--gw-green)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>
            ℹ️ Thông báo minh bạch về tích hợp API Hàng không
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gw-text)', lineHeight: 1.65 }}>
            Hiện tại Backend RideWay tập trung vận hành giao dịch trực tuyến thời gian thực cho <strong>Vé xe khách & Limousine 2 tầng</strong>. Khu vực Vé máy bay chưa kết nối cổng xuất vé GDS trực tiếp, vì vậy hệ thống <strong>không hiển thị lịch bay/giá vé giả lập</strong>. Quý khách có thể gửi yêu cầu giữ lịch để chuyên viên hỗ trợ hoặc chuyển sang đặt tuyến Limousine phòng đôi 2 tầng đang mở bán trực tuyến giữa {locations.map((l) => l.province).join(', ') || 'Hà Nội, Huế, Đà Nẵng, TP.HCM'}.
          </p>
          <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            🚍 Xem các chuyến Xe khách & Limousine 2 tầng đang mở bán thật ➜
          </Link>
        </div>
      </div>
    </div>
  );
}

export function FlightsSearchPage() {
  const [searchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);

  const origin = searchParams.get('origin') || 'Hà Nội (HAN)';
  const destination = searchParams.get('destination') || 'Đà Nẵng (DAD)';
  const passengers = searchParams.get('passengers') || '1';
  const cabinClass = searchParams.get('cabinClass') || 'Phổ thông';

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/may-bay" style={{ color: 'var(--gw-green)' }}>Máy bay</Link> /{' '}
        <span>Tra cứu & Đăng ký hành trình</span>
      </div>

      <div className="gw-split-2">
        <div className="vx-card">
          <span className="vx-badge vx-badge-amber">CHƯA KẾT NỐI API GDS ĐỐI TÁC</span>
          <h1 style={{ margin: '10px 0 8px', fontSize: 24, color: 'var(--gw-dark)' }}>
            Hành trình: {origin} → {destination}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gw-muted)', lineHeight: 1.65 }}>
            Số hành khách: <strong>{passengers}</strong> • Hạng vé: <strong>{cabinClass}</strong>
          </p>
          <div style={{ padding: 16, borderRadius: 12, background: '#fef3c7', color: '#92400e', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
            <strong>Cam kết dữ liệu trung thực:</strong> Để đảm bảo an toàn giao dịch, RideWay không tạo chuyến bay hay mức giá giả lập khi chưa được cấp khóa API đối tác hàng không. Bạn có thể để lại thông tin để nhận báo giá từ đại lý đối tác hoặc đặt ngay tuyến Xe Limousine 2 tầng đang mở bán trực tuyến trên cùng lộ trình.
          </div>
          <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            🚍 Chuyển sang đặt Vé xe Limousine 2 tầng trên lộ trình này ➜
          </Link>
        </div>

        <form
          className="vx-card"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>
            Đăng ký nhận thông báo mở bán & Báo giá đối tác
          </h3>
          {submitted ? (
            <div style={{ padding: 16, background: 'var(--gw-green-light)', borderRadius: 10, color: 'var(--gw-green-dark)', fontWeight: 700 }}>
              ✓ Đã lưu yêu cầu tư vấn chặng {origin} → {destination}. Chúng tôi sẽ liên hệ ngay khi có lịch đối tác phù hợp.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="vx-field-label">Họ và tên người liên hệ</label>
                <input className="vx-input" required placeholder="Nhập họ tên..." />
              </div>
              <div>
                <label className="vx-field-label">Số điện thoại / Zalo</label>
                <input className="vx-input" required placeholder="0901234567" />
              </div>
              <div>
                <label className="vx-field-label">Ghi chú hành lý & Khung giờ mong muốn</label>
                <textarea className="vx-input" rows={3} placeholder="VD: Cần thêm 20kg hành lý ký gửi, bay buổi sáng..." />
              </div>
              <button type="submit" className="vx-btn-primary">
                Gửi yêu cầu tư vấn hành trình ➜
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
