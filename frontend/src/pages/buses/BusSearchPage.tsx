import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MultiServiceSearchBox } from '../../components/search/MultiServiceSearchBox';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppStore';
import {
  resetBusFilters,
  setDateQuery,
  setFilterOperatorId,
  setFilterTimeSlot,
  setFilterVehicleKind,
  setFromLocationId,
  setSegmentIdx,
  setSortBy,
  setToLocationId,
  type TimeSlotFilter,
  type VehicleKindFilter,
} from '../../features/buses/searchSlice';
import { useGetTripsQuery } from '../../services/ridewayApi';
import { SEGMENT_PRESETS } from '../../types/models';

export function BusSearchPage() {
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const {
    fromLocationId,
    toLocationId,
    dateQuery,
    segmentIdx,
    sortBy,
    filterVehicleKind,
    filterOperatorId,
    filterTimeSlot,
  } = useAppSelector((s) => s.search);

  useEffect(() => {
    const pFrom = searchParams.get('from');
    const pTo = searchParams.get('to');
    const pDate = searchParams.get('date');
    const pSeg = searchParams.get('segment');
    if (pFrom !== null) dispatch(setFromLocationId(pFrom));
    if (pTo !== null) dispatch(setToLocationId(pTo));
    if (pDate !== null) dispatch(setDateQuery(pDate));
    if (pSeg !== null && !Number.isNaN(Number(pSeg))) {
      const idx = Math.max(0, Math.min(SEGMENT_PRESETS.length - 1, Number(pSeg)));
      dispatch(setSegmentIdx(idx));
    }
  }, [searchParams, dispatch]);

  const activeSeg = SEGMENT_PRESETS[segmentIdx] ?? SEGMENT_PRESETS[2];

  const {
    data: trips = [],
    isLoading,
    error,
    refetch,
  } = useGetTripsQuery({
    fromLocationId: fromLocationId || undefined,
    toLocationId: toLocationId || undefined,
    fromSequence: activeSeg.from,
    toSequence: activeSeg.to,
    departureDate: dateQuery || undefined,
    sort: sortBy,
  });

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
      <section className="rw-page-banner" style={{ paddingBottom: 56 }}>
        <div className="vx-container">
          <div style={{ fontSize: 13, color: '#c5dcf8', marginBottom: 6 }}>
            <Link to="/" style={{ color: '#fff' }}>Trang chủ</Link> /{' '}
            <Link to="/xe-khach" style={{ color: '#fff' }}>Vé xe khách</Link> /{' '}
            <span>Tìm chuyến xe</span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 3vw, 34px)', margin: 0, color: '#fff' }}>
            Kết quả tìm chuyến xe khách & Limousine 2 tầng
          </h1>
        </div>
      </section>

      <div className="gw-search-wrap" style={{ marginTop: -38 }}>
        <MultiServiceSearchBox defaultTab="BUS" onBusSearchSubmit={() => void refetch()} />
      </div>

      <section className="gw-section" style={{ paddingTop: 32 }}>
        <div className="vx-section-header">
          <div>
            <span className="gw-sub-pill">Đặt vé theo đoạn chặng</span>
            <h2 className="gw-sec-title" style={{ marginBottom: 0 }}>
              Danh sách chuyến xe mở bán ({filteredTrips.length} chuyến)
            </h2>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-green-dark)' }}>
            Đang xem: {activeSeg.label}
          </div>
        </div>

        <button
          type="button"
          className="vxr-mobile-filter-toggle"
          onClick={() => setMobileFilterOpen((v) => !v)}
        >
          <span>🎛️ Bộ lọc & Sắp xếp (Giờ đi, Loại xe, Nhà xe)</span>
          <span>{mobileFilterOpen ? 'Thu gọn ▴' : 'Mở bộ lọc ▾'}</span>
        </button>

        <div className="vxr-booking-workspace">
          {/* LEFT FILTER SIDEBAR */}
          <aside className={`vxr-filter-sidebar ${mobileFilterOpen ? 'open-mobile' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 16, color: 'var(--gw-dark)' }}>Bộ lọc tìm kiếm</strong>
              <button
                type="button"
                onClick={() => dispatch(resetBusFilters())}
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
                      onChange={() => dispatch(setSortBy(opt.val))}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="vxr-filter-group">
              <div className="vxr-filter-title">Khung giờ xuất phát</div>
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
                      dispatch(
                        setFilterTimeSlot(filterTimeSlot === slot.id ? 'ALL' : (slot.id as TimeSlotFilter))
                      )
                    }
                  >
                    <div>{slot.title}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{slot.sub}</div>
                  </button>
                ))}
              </div>
            </div>

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
                      onChange={() => dispatch(setFilterVehicleKind(vk.id as VehicleKindFilter))}
                    />
                    <span>{vk.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="vxr-filter-group">
              <div className="vxr-filter-title">Nhà xe đối tác</div>
              <div style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="vxr-operator"
                    checked={filterOperatorId === 'ALL'}
                    onChange={() => dispatch(setFilterOperatorId('ALL'))}
                  />
                  <span>Tất cả nhà xe ({trips.length})</span>
                </label>
                {uniqueOperators.map((op) => (
                  <label key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="vxr-operator"
                      checked={filterOperatorId === op.id}
                      onChange={() => dispatch(setFilterOperatorId(op.id))}
                    />
                    <span>{op.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT RESULTS LIST */}
          <div>
            {isLoading && (
              <div className="vx-card">Đang tải danh sách chuyến xe và tính giá theo đoạn chặng…</div>
            )}
            {error && (
              <div className="vx-card" style={{ color: 'var(--gw-danger)', fontWeight: 700, marginBottom: 16 }}>
                Lỗi tải dữ liệu: {'message' in error ? error.message : 'Không kết nối được API'}
              </div>
            )}
            {!isLoading && filteredTrips.length === 0 && (
              <div className="vx-card" style={{ textAlign: 'center', padding: 36 }}>
                <h3 style={{ margin: '0 0 8px', color: 'var(--gw-dark)' }}>
                  Không tìm thấy chuyến xe phù hợp với bộ lọc hiện tại
                </h3>
                <p style={{ color: 'var(--gw-muted)', marginBottom: 16 }}>
                  Hãy thử xóa bớt điều kiện lọc hoặc đổi sang đoạn chặng khác để xem thêm các chuyến đang mở bán.
                </p>
                <button type="button" className="vx-btn-primary" onClick={() => dispatch(resetBusFilters())}>
                  Đặt lại bộ lọc
                </button>
              </div>
            )}

            <div className="vxr-trip-list">
              {filteredTrips.map((t) => {
                const fromSeq = t.from_sequence ?? activeSeg.from;
                const toSeq = t.to_sequence ?? activeSeg.to;
                const originName =
                  t.from_location_name || activeSeg.label.split('(')[1]?.split('→')[0]?.trim() || 'Điểm đón';
                const destName =
                  t.to_location_name || activeSeg.label.split('→')[2]?.replace(')', '').trim() || 'Điểm trả';

                return (
                  <article key={t.id} className="vxr-trip-card">
                    <div className="vxr-trip-main">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--gw-dark)' }}>
                            {t.operator_name}
                          </h3>
                          <span className="vxr-rating-pill">★ 4.9 (320+)</span>
                          <span className="vx-badge vx-badge-green">⚡ Giữ chỗ 10 phút</span>
                        </div>
                        <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginTop: 4, fontWeight: 600 }}>
                          🚍 {t.vehicle_type} • Tuyến: {t.route_name}
                        </div>

                        <div className="vxr-timeline">
                          <div className="vxr-timeline-point">
                            <div className="vxr-timeline-time">
                              {formatTimeHHMM(t.boarding_at || t.departure_at)}
                            </div>
                            <div className="vxr-timeline-loc">🔵 {originName}</div>
                          </div>

                          <div className="vxr-timeline-connector">
                            <span>{activeSeg.duration}</span>
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
                            Giá đúng theo đoạn chặng
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gw-green)' }}>
                            {t.min_price ? `${Number(t.min_price).toLocaleString('vi-VN')}₫` : 'Liên hệ'}
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-green-dark)', marginTop: 2 }}>
                            {t.available_units !== undefined
                              ? `Còn ${t.available_units}/${t.total_units ?? 20} vị trí trống`
                              : 'Đang mở bán'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                          <Link
                            to={`/xe-khach/chuyen/${t.id}?from=${fromSeq}&to=${toSeq}`}
                            className="vx-btn-outline"
                            style={{ fontSize: 13, padding: '9px 14px', textDecoration: 'none' }}
                          >
                            Xem chi tiết
                          </Link>
                          <Link
                            to={`/xe-khach/chuyen/${t.id}/chon-cho?from=${fromSeq}&to=${toSeq}`}
                            className="vx-btn-primary"
                            style={{ fontSize: 13.5, padding: '10px 18px', textDecoration: 'none' }}
                          >
                            Chọn phòng / giường ➜
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
