import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppStore';
import {
  setActiveServiceTab,
  setDateQuery,
  setFromLocationId,
  setSegmentIdx,
  setToLocationId,
  swapSearchLocations,
  type TransportModeTab,
} from '../../features/buses/searchSlice';
import { useGetLocationsQuery } from '../../services/ridewayApi';
import { SEGMENT_PRESETS } from '../../types/models';

interface Props {
  defaultTab?: TransportModeTab;
  onBusSearchSubmit?: () => void;
}

export function MultiServiceSearchBox({ defaultTab, onBusSearchSubmit }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: locations = [] } = useGetLocationsQuery();
  const {
    activeServiceTab,
    fromLocationId,
    toLocationId,
    dateQuery,
    segmentIdx,
  } = useAppSelector((s) => s.search);

  const currentTab = defaultTab ?? activeServiceTab;

  const handleSelectTab = (tab: TransportModeTab) => {
    dispatch(setActiveServiceTab(tab));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (fromLocationId) qs.set('from', fromLocationId);
    if (toLocationId) qs.set('to', toLocationId);
    if (dateQuery) qs.set('date', dateQuery);
    qs.set('segment', String(segmentIdx));
    const queryStr = qs.toString() ? `?${qs.toString()}` : '';

    if (currentTab === 'BUS') {
      if (onBusSearchSubmit) {
        onBusSearchSubmit();
      } else {
        navigate(`/xe-khach/tim-kiem${queryStr}`);
      }
    } else if (currentTab === 'FLIGHT') {
      navigate(`/may-bay/tim-kiem${queryStr}`);
    } else if (currentTab === 'TRAIN') {
      navigate(`/tau-hoa/tim-kiem${queryStr}`);
    } else if (currentTab === 'RENTAL') {
      navigate(`/thue-xe/danh-sach${queryStr}`);
    }
  };

  return (
    <div className="vxr-search-card">
      <div className="vxr-mode-tabs" role="tablist" aria-label="Chọn loại hình di chuyển">
        <button
          type="button"
          className={`vxr-mode-tab ${currentTab === 'BUS' ? 'active' : ''}`}
          onClick={() => handleSelectTab('BUS')}
        >
          <span>🚍</span>
          <span>Xe khách & Limousine 2 tầng</span>
          <span className="vxr-tab-badge">Giữ chỗ 10p</span>
        </button>
        <button
          type="button"
          className={`vxr-mode-tab ${currentTab === 'FLIGHT' ? 'active' : ''}`}
          onClick={() => handleSelectTab('FLIGHT')}
        >
          <span>✈️</span>
          <span>Máy bay</span>
        </button>
        <button
          type="button"
          className={`vxr-mode-tab ${currentTab === 'TRAIN' ? 'active' : ''}`}
          onClick={() => handleSelectTab('TRAIN')}
        >
          <span>🚆</span>
          <span>Tàu hỏa Bắc – Nam</span>
        </button>
        <button
          type="button"
          className={`vxr-mode-tab ${currentTab === 'RENTAL' ? 'active' : ''}`}
          onClick={() => handleSelectTab('RENTAL')}
        >
          <span>🚐</span>
          <span>Thuê xe du lịch</span>
        </button>
      </div>

      <form className="vxr-search-form" onSubmit={handleSubmit}>
        <div className="vxr-input-box">
          <span className="gw-field-icon">🔵</span>
          <div style={{ width: '100%', minWidth: 0 }}>
            <span className="gw-field-label">
              {currentTab === 'FLIGHT'
                ? 'Sân bay / Thành phố đi'
                : currentTab === 'TRAIN'
                ? 'Ga xuất phát'
                : 'Nơi xuất phát'}
            </span>
            <select
              className="gw-field-control"
              value={fromLocationId}
              onChange={(e) => dispatch(setFromLocationId(e.target.value))}
            >
              <option value="">Tất cả điểm đi</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.province || loc.name} ({loc.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="vxr-swap-btn"
          title="Đổi chiều điểm đi và điểm đến"
          aria-label="Đổi chiều điểm đi và điểm đến"
          onClick={() => dispatch(swapSearchLocations())}
        >
          ⇄
        </button>

        <div className="vxr-input-box">
          <span className="gw-field-icon">📍</span>
          <div style={{ width: '100%', minWidth: 0 }}>
            <span className="gw-field-label">
              {currentTab === 'FLIGHT'
                ? 'Sân bay / Thành phố đến'
                : currentTab === 'TRAIN'
                ? 'Ga đến'
                : 'Nơi đến'}
            </span>
            <select
              className="gw-field-control"
              value={toLocationId}
              onChange={(e) => dispatch(setToLocationId(e.target.value))}
            >
              <option value="">Tất cả điểm đến</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.province || loc.name} ({loc.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="vxr-input-box">
          <span className="gw-field-icon">📅</span>
          <div style={{ width: '100%', minWidth: 0 }}>
            <span className="gw-field-label">Ngày khởi hành</span>
            <input
              type="date"
              className="gw-field-control"
              value={dateQuery}
              onChange={(e) => dispatch(setDateQuery(e.target.value))}
            />
          </div>
        </div>

        <div className="vxr-input-box">
          <span className="gw-field-icon">🗺️</span>
          <div style={{ width: '100%', minWidth: 0 }}>
            <span className="gw-field-label">Đoạn chặng tuyến</span>
            <select
              className="gw-field-control"
              value={segmentIdx}
              onChange={(e) => dispatch(setSegmentIdx(Number(e.target.value)))}
            >
              {SEGMENT_PRESETS.map((seg, i) => (
                <option key={seg.label} value={i}>
                  {seg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="vxr-search-submit">
          🔍 Tìm chuyến
        </button>
      </form>

      <div className="vxr-trust-strip">
        <div className="vxr-trust-item">
          <span className="vxr-trust-icon">✔</span>
          <span>Chắc chắn có chỗ (Khóa phân đoạn PostgreSQL 10 phút)</span>
        </div>
        <div className="vxr-trust-item">
          <span className="vxr-trust-icon">🎧</span>
          <span>Hỗ trợ hành khách 24/7</span>
        </div>
        <div className="vxr-trust-item">
          <span className="vxr-trust-icon">🏷️</span>
          <span>Giá đúng theo từng đoạn chặng</span>
        </div>
        <div className="vxr-trust-item">
          <span className="vxr-trust-icon">💳</span>
          <span>Thanh toán VNPay QR 100% xuất vé tức thì</span>
        </div>
      </div>
    </div>
  );
}
