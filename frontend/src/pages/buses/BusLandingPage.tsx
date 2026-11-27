import { Link, useNavigate } from 'react-router-dom';
import { MultiServiceSearchBox } from '../../components/search/MultiServiceSearchBox';
import { useAppDispatch } from '../../hooks/useAppStore';
import { setSegmentIdx } from '../../features/buses/searchSlice';
import { useGetTripsQuery, useGetVehicleTypesQuery } from '../../services/ridewayApi';
import { POPULAR_ROUTE_CARDS, SEGMENT_PRESETS } from '../../types/models';

export function BusLandingPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: trips = [] } = useGetTripsQuery({ fromSequence: 0, toSequence: 2 });
  const { data: vehicleTypes = [] } = useGetVehicleTypesQuery();

  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Dịch vụ Vé Xe Khách & Limousine 2 Tầng (/xe-khach)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 42px)', margin: '8px 0 12px', color: '#fff' }}>
            Đặt vé xe khách & Phòng đôi Limousine 2 tầng theo từng đoạn chặng
          </h1>
          <p style={{ maxWidth: 680, color: '#dbeafe', fontSize: 15, margin: 0 }}>
            Tự do lựa chọn chặng đi [Điểm lên → Điểm xuống), xem trực tiếp sơ đồ phòng đôi VIP (2 người lớn + 1 trẻ em) và giữ chỗ nguyên tử 10 phút từ PostgreSQL Backend.
          </p>
        </div>
      </section>

      <div className="gw-search-wrap" style={{ marginTop: -44 }}>
        <MultiServiceSearchBox defaultTab="BUS" />
      </div>

      <section className="gw-section">
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Chuyến xe đang mở bán</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Lịch khởi hành tiêu biểu hôm nay
            </h2>
          </div>
          <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none' }}>
            Mở bộ lọc & Tìm kiếm nâng cao ➜
          </Link>
        </div>

        <div className="vx-grid-3">
          {trips.slice(0, 6).map((t) => (
            <article key={t.id} className="vx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="vx-badge vx-badge-green">{t.vehicle_type}</span>
                  <strong style={{ color: 'var(--gw-green)', fontSize: 18 }}>
                    {t.min_price ? `${Number(t.min_price).toLocaleString('vi-VN')}₫` : 'Liên hệ'}
                  </strong>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--gw-dark)' }}>{t.operator_name}</h3>
                <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', fontWeight: 600 }}>
                  🗺️ Tuyến: {t.route_name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginTop: 6 }}>
                  🕒 Khởi hành: {new Date(t.departure_at).toLocaleString('vi-VN')}
                </div>
                {t.available_units !== undefined && (
                  <div style={{ fontSize: 13, color: 'var(--gw-green-dark)', fontWeight: 700, marginTop: 6 }}>
                    ✓ Còn {t.available_units}/{t.total_units ?? 20} phòng/giường trống
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  to={`/xe-khach/chuyen/${t.id}?from=${t.from_sequence ?? 0}&to=${t.to_sequence ?? 2}`}
                  className="vx-btn-outline"
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                >
                  Chi tiết chuyến
                </Link>
                <Link
                  to={`/xe-khach/chuyen/${t.id}/chon-cho?from=${t.from_sequence ?? 0}&to=${t.to_sequence ?? 2}`}
                  className="vx-btn-primary"
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                >
                  Chọn chỗ 2 tầng ➜
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="gw-section" style={{ paddingTop: 0 }}>
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Đoạn chặng thông minh</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Chọn nhanh theo đoạn chặng Bắc – Trung – Nam
            </h2>
          </div>
        </div>

        <div className="vxr-popular-grid">
          {POPULAR_ROUTE_CARDS.map((card) => (
            <div key={card.origin} className="vxr-route-card">
              <div
                className="vxr-route-card-header"
                style={{ backgroundImage: `url(${card.img})`, backgroundColor: card.bgColor }}
              >
                <span style={{ fontSize: 12, color: 'var(--gw-orange)', fontWeight: 700 }}>Hành trình từ</span>
                <h3 style={{ margin: '2px 0 0', fontSize: 19, fontWeight: 800 }}>{card.origin}</h3>
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
                      <strong style={{ display: 'block', fontSize: 14, color: 'var(--gw-dark)' }}>{sub.dest}</strong>
                      <span style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{sub.meta}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: 'var(--gw-green)', fontSize: 14.5 }}>{sub.price}</strong>
                      <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
                        {SEGMENT_PRESETS[sub.segIdx]?.label.split('(')[0]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {vehicleTypes.length > 0 && (
        <section className="gw-section" style={{ paddingTop: 0 }}>
          <div className="vx-section-header">
            <div>
              <span className="gw-sub-pill">Chuẩn phương tiện</span>
              <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
                Các dòng xe khách & Limousine 2 tầng đang vận hành
              </h2>
            </div>
          </div>
          <div className="vx-grid-3">
            {vehicleTypes.map((vt) => (
              <div key={vt.id} className="vx-card">
                <span className="vx-badge vx-badge-green">Sức chứa chuẩn: {vt.seat_capacity} vị trí</span>
                <h3 style={{ margin: '10px 0 6px', color: 'var(--gw-dark)' }}>{vt.name}</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-muted)' }}>
                  Hỗ trợ sơ đồ 2 tầng trực quan, theo dõi tình trạng chỗ trống độc lập trên từng đoạn chặng.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
