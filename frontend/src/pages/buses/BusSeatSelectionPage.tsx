import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  SeatLayout2Deck,
  type SelectedUnitConfig,
  type TripUnitItem,
} from '../../components/SeatLayout2Deck';
import {
  useCreateHoldMutation,
  useGetMeQuery,
  useGetTripDetailQuery,
  useGetTripUnitsQuery,
} from '../../services/ridewayApi';
import { SEGMENT_PRESETS } from '../../types/models';
import { useAppDispatch } from '../../hooks/useAppStore';
import { setLastHold, setLastTripId } from '../../features/booking/bookingSlice';

export function BusSeatSelectionPage() {
  const { tripId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const fromSequence = Number(searchParams.get('from') ?? 0);
  const toSequence = Number(searchParams.get('to') ?? 2);

  const { data: currentUser } = useGetMeQuery();
  const { data: trip } = useGetTripDetailQuery(tripId, { skip: !tripId });
  const {
    data: units = [],
    isLoading,
    refetch,
  } = useGetTripUnitsQuery({ tripId, fromSequence, toSequence }, { skip: !tripId });

  const [createHold, { isLoading: holdingBusy }] = useCreateHoldMutation();
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectedUnitConfig>>({});
  const [holdError, setHoldError] = useState<string | null>(null);

  const matchedSegIdx = SEGMENT_PRESETS.findIndex(
    (s) => s.from === fromSequence && s.to === toSequence
  );
  const segmentLabel =
    matchedSegIdx >= 0
      ? SEGMENT_PRESETS[matchedSegIdx].label
      : `Chặng ${fromSequence} → ${toSequence}`;

  const handleToggleUnit = (u: TripUnitItem) => {
    setSelectedMap((prev) => {
      const copy = { ...prev };
      if (copy[u.id]) {
        delete copy[u.id];
      } else {
        copy[u.id] = {
          trip_unit_id: u.id,
          unit_code: u.unit_code,
          kind: u.kind,
          price: Number(u.price || 0),
          max_adults: u.max_adults ?? 1,
          max_children: u.max_children ?? 0,
          adult_count: 1,
          child_count: 0,
        };
      }
      return copy;
    });
  };

  const handleUpdateCounts = (unitId: string, adultCount: number, childCount: number) => {
    setSelectedMap((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], adult_count: adultCount, child_count: childCount },
    }));
  };

  const handleProceedHold = async () => {
    if (!currentUser) {
      const redirectUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/dang-nhap?redirect=${redirectUrl}`);
      return;
    }
    if (!tripId) return;

    const unitPayload = Object.values(selectedMap).map((item) => ({
      trip_unit_id: item.trip_unit_id,
      adult_count: item.adult_count,
      child_count: item.child_count,
    }));

    setHoldError(null);
    try {
      const holdRes = await createHold({
        trip_id: tripId,
        from_sequence: fromSequence,
        to_sequence: toSequence,
        units: unitPayload,
      }).unwrap();

      dispatch(setLastHold(holdRes));
      dispatch(setLastTripId(tripId));
      void refetch();
      navigate(`/dat-ve/${holdRes.booking_id}`);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Không thể giữ chỗ (vị trí vừa có khách khác khóa hoặc chặng không hợp lệ)';
      setHoldError(msg);
    }
  };

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/xe-khach/tim-kiem" style={{ color: 'var(--gw-green)' }}>Tìm chuyến xe</Link> /{' '}
        <Link to={`/xe-khach/chuyen/${tripId}?from=${fromSequence}&to=${toSequence}`} style={{ color: 'var(--gw-green)' }}>
          Chi tiết chuyến
        </Link>{' '}
        / <span>Chọn phòng / giường 2 tầng</span>
      </div>

      <div className="vx-card" style={{ marginBottom: 20 }}>
        <div className="gw-card-row">
          <div>
            <span className="gw-sub-pill">BƯỚC 1 / 3 • CHỌN VỊ TRÍ PHÒNG ĐÔI HOẶC GIƯỜNG 2 TẦNG</span>
            <h1 style={{ margin: '4px 0', fontSize: 'clamp(20px, 2.5vw, 26px)', color: 'var(--gw-dark)' }}>
              {trip ? `${trip.operator_name} • ${trip.route_name}` : 'Sơ đồ phòng / giường 2 tầng'}
            </h1>
            <div style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
              Giá và tình trạng chỗ trống được xác nhận trực tiếp từ PostgreSQL Backend theo đoạn chặng đã chọn.
            </div>
          </div>

          <div>
            <label className="vx-field-label">Đoạn chặng hành trình</label>
            <select
              className="vx-select"
              style={{ minWidth: 260 }}
              value={matchedSegIdx >= 0 ? matchedSegIdx : 2}
              onChange={(e) => {
                const idx = Number(e.target.value);
                const seg = SEGMENT_PRESETS[idx];
                if (seg) {
                  setSelectedMap({});
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
        </div>
      </div>

      {holdError && (
        <div
          className="vx-card"
          style={{
            marginBottom: 16,
            background: '#fef2f2',
            borderColor: '#fecaca',
            color: 'var(--gw-danger)',
            fontWeight: 700,
          }}
        >
          ⚠️ {holdError}
        </div>
      )}

      {isLoading ? (
        <div className="vx-card">Đang tải sơ đồ 2 tầng thời gian thực từ máy chủ…</div>
      ) : (
        <SeatLayout2Deck
          units={units}
          selectedMap={selectedMap}
          onToggleUnit={handleToggleUnit}
          onUpdateCounts={handleUpdateCounts}
          onProceedHold={() => void handleProceedHold()}
          segmentLabel={segmentLabel}
          holdingBusy={holdingBusy}
        />
      )}
    </div>
  );
}
