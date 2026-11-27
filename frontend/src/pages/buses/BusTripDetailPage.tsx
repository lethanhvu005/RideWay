import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGetTripDetailQuery, useGetTripUnitsQuery } from '../../services/ridewayApi';
import { SEGMENT_PRESETS } from '../../types/models';

export function BusTripDetailPage() {
  const { tripId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromSequence = Number(searchParams.get('from') ?? 0);
  const toSequence = Number(searchParams.get('to') ?? 2);

  const { data: trip, isLoading, error } = useGetTripDetailQuery(tripId, { skip: !tripId });
  const { data: units = [] } = useGetTripUnitsQuery(
    { tripId, fromSequence, toSequence },
    { skip: !tripId }
  );

  const availableCount = units.filter((u) => u.available).length;
  const minUnitPrice = units.reduce<number | null>((acc, u) => {
    if (!u.price) return acc;
    const val = Number(u.price);
    return acc === null || val < acc ? val : acc;
  }, null);

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/xe-khach/tim-kiem" style={{ color: 'var(--gw-green)' }}>Tìm chuyến xe</Link> /{' '}
        <span>Chi tiết chuyến</span>
      </div>

      {isLoading && <div className="vx-card">Đang tải thông tin chi tiết chuyến xe…</div>}
      {error && (
        <div className="vx-card" style={{ color: 'var(--gw-danger)', fontWeight: 700 }}>
          Không tìm thấy thông tin chuyến xe ({tripId}).
        </div>
      )}

      {trip && (
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="vx-card" style={{ borderLeft: '5px solid var(--gw-green)' }}>
            <div className="gw-card-row">
              <div>
                <span className="vx-badge vx-badge-green">ĐANG MỞ BÁN • {trip.vehicle_type}</span>
                <h1 style={{ margin: '8px 0 4px', fontSize: 'clamp(22px, 2.8vw, 30px)', color: 'var(--gw-dark)' }}>
                  {trip.operator_name} — {trip.route_name}
                </h1>
                <div style={{ fontSize: 14, color: 'var(--gw-muted)' }}>
                  🕒 Giờ khởi hành: <strong>{new Date(trip.departure_at).toLocaleString('vi-VN')}</strong>
                  {trip.vehicle_registration ? ` • Biển số: ${trip.vehicle_registration}` : ''}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
                  Giá chặng [{fromSequence} → {toSequence})
                </div>
                <div className="vx-price-big" style={{ fontSize: 26 }}>
                  {minUnitPrice !== null
                    ? `${minUnitPrice.toLocaleString('vi-VN')}₫`
                    : trip.min_price
                    ? `${Number(trip.min_price).toLocaleString('vi-VN')}₫`
                    : 'Theo chặng'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green-dark)', marginBottom: 10 }}>
                  Còn {availableCount}/{units.length || 20} phòng/giường trống
                </div>
                <Link
                  to={`/xe-khach/chuyen/${trip.id}/chon-cho?from=${fromSequence}&to=${toSequence}`}
                  className="vx-btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-block' }}
                >
                  Tiếp tục Chọn phòng / giường 2 tầng ➜
                </Link>
              </div>
            </div>
          </div>

          <div className="gw-split-2">
            <div className="vx-card">
              <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>
                🗺️ Lộ trình các trạm dừng theo thứ tự (Sequence)
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
                Hệ thống khóa phân đoạn PostgreSQL tính giá và kiểm tra chỗ trống chính xác trên nửa khoảng <code>[from_sequence, to_sequence)</code>.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="vx-field-label">Đổi đoạn chặng muốn tra cứu</label>
                <select
                  className="vx-select"
                  value={SEGMENT_PRESETS.findIndex((s) => s.from === fromSequence && s.to === toSequence)}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const seg = SEGMENT_PRESETS[idx];
                    if (seg) {
                      setSearchParams({ from: String(seg.from), to: String(seg.to) });
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

              <div style={{ display: 'grid', gap: 10 }}>
                {(trip.stops && trip.stops.length > 0
                  ? trip.stops
                  : [
                      { sequence: 0, location_id: '0', location_name: 'Bến xe Nước Ngầm (Hà Nội)' },
                      { sequence: 1, location_id: '1', location_name: 'Bến xe Phía Nam (Cố đô Huế)' },
                      { sequence: 2, location_id: '2', location_name: 'Bến xe Trung tâm (Đà Nẵng)' },
                      { sequence: 3, location_id: '3', location_name: 'Bến xe Miền Đông Mới (TP.HCM)' },
                    ]
                ).map((st) => {
                  const isActiveStop = st.sequence >= fromSequence && st.sequence <= toSequence;
                  return (
                    <div
                      key={st.sequence}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: isActiveStop ? '1.5px solid var(--gw-green)' : '1px solid var(--gw-border)',
                        background: isActiveStop ? 'var(--gw-green-light)' : '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>Trạm #{st.sequence}: {st.location_name}</strong>
                        {st.province && <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>{st.province}</div>}
                      </div>
                      <span className={`vx-badge ${st.sequence === fromSequence ? 'vx-badge-green' : st.sequence === toSequence ? 'vx-badge-amber' : 'vx-badge-gray'}`}>
                        {st.sequence === fromSequence
                          ? 'Điểm lên xe'
                          : st.sequence === toSequence
                          ? 'Điểm xuống xe'
                          : 'Trạm trung gian'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="vx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>
                  ✨ Tiện ích khoang & Chính sách giữ chỗ
                </h3>
                <ul style={{ paddingLeft: 18, lineHeight: 1.9, fontSize: 14, color: 'var(--gw-text)' }}>
                  <li><strong>Khoang Phòng đôi VIP (CABIN):</strong> Tối đa 2 người lớn + 1 trẻ em, rèm che riêng tư, màn hình giải trí, ghế chỉnh điện massage.</li>
                  <li><strong>Giường nằm 2 tầng (BED):</strong> Sắp xếp Tầng 1 (Dưới) và Tầng 2 (Trên), chăn gối khử khuẩn, cổng sạc USB/Type-C.</li>
                  <li><strong>Giữ chỗ nguyên tử 10 phút:</strong> Ngay khi bấm giữ chỗ, PostgreSQL khóa phân đoạn <code>[from_sequence, to_sequence)</code> trong 10 phút để bạn điền thông tin hành khách và quét mã VNPay QR.</li>
                  <li><strong>Đón / trả linh hoạt:</strong> Hỗ trợ đón tại bến cố định (0đ), vùng trung chuyển hoặc gửi yêu cầu đón tận nơi để nhà xe báo giá.</li>
                </ul>
              </div>

              <div style={{ padding: 16, background: 'var(--gw-green-light)', borderRadius: 12 }}>
                <div style={{ fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 8 }}>
                  Sẵn sàng chọn vị trí phòng / giường trên sơ đồ 2 tầng?
                </div>
                <Link
                  to={`/xe-khach/chuyen/${trip.id}/chon-cho?from=${fromSequence}&to=${toSequence}`}
                  className="vx-btn-primary"
                  style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}
                >
                  Mở sơ đồ 2 tầng & Chọn chỗ ngay ➜
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
