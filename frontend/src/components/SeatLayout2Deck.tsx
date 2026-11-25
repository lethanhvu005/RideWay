import { useState } from 'react';

export interface TripUnitItem {
  id: string;
  unit_code: string;
  kind: string;
  deck: number;
  row: number;
  col: number;
  max_adults: number | null;
  max_children: number | null;
  price: string | null;
  available: boolean;
}

export interface SelectedUnitConfig {
  trip_unit_id: string;
  unit_code: string;
  kind: string;
  price: number;
  max_adults: number;
  max_children: number;
  adult_count: number;
  child_count: number;
}

interface Props {
  units: TripUnitItem[];
  selectedMap: Record<string, SelectedUnitConfig>;
  onToggleUnit: (unit: TripUnitItem) => void;
  onUpdateCounts: (unitId: string, adultCount: number, childCount: number) => void;
  onProceedHold: () => void;
  segmentLabel: string;
  holdingBusy?: boolean;
}

export function SeatLayout2Deck({
  units,
  selectedMap,
  onToggleUnit,
  onUpdateCounts,
  onProceedHold,
  segmentLabel,
  holdingBusy,
}: Props) {
  const decks = Array.from(new Set(units.map((u) => u.deck))).sort((a, b) => a - b);
  const [mobileDeck, setMobileDeck] = useState<number>(decks[0] ?? 1);
  const selectedList = Object.values(selectedMap);
  const totalEstimated = selectedList.reduce((acc, item) => acc + item.price, 0);

  if (units.length === 0) {
    return <div className="vx-card">Không có dữ liệu sơ đồ chỗ cho chặng này.</div>;
  }

  return (
    <div className="gw-seat-layout-wrapper">
      {/* Left: 2-Deck Visual Cabin/Bed Map (WF-03) — Responsive across Desktop, Tablet & Mobile */}
      <div className="vx-card" style={{ background: '#f8fafc' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--vx-primary-darker)' }}>
            Sơ đồ vị trí theo chặng: <span style={{ color: 'var(--vx-primary)' }}>{segmentLabel}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 600, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fff', border: '1px solid #63ab45' }} />
              ✓ Còn trống
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ebf5e6', border: '2px solid #4e8c33' }} />
              ● Đang chọn
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#e2e8f0', border: '1px solid #94a3b8' }} />
              🔒 Đã khóa
            </span>
          </div>
        </div>

        {/* Mobile Deck Switcher Tabs (Only visible on <= 640px screens) */}
        {decks.length > 1 && (
          <div className="gw-deck-mobile-tabs">
            {decks.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMobileDeck(d)}
                className={mobileDeck === d ? 'vx-btn-primary' : 'vx-btn-outline'}
                style={{ flex: 1 }}
              >
                {d === 1 ? 'Tầng 1 (Dưới)' : `Tầng ${d} (Trên)`}
              </button>
            ))}
          </div>
        )}

        <div className="gw-decks-grid">
          {decks.map((deckNum) => {
            const deckUnits = units.filter((u) => u.deck === deckNum);
            const maxCol = Math.max(...deckUnits.map((u) => u.col), 2);
            const hiddenOnMobile = decks.length > 1 && mobileDeck !== deckNum;
            return (
              <div
                key={deckNum}
                className={`gw-deck-panel ${hiddenOnMobile ? 'hidden-mobile' : ''}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--vx-border)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    padding: '6px 10px',
                    background: 'var(--vx-surface)',
                    color: 'var(--vx-primary-dark)',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  {deckNum === 1 ? 'TẦNG 1 (DƯỚI) — ĐẦU XE 🛞' : 'TẦNG 2 (TRÊN)'}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${maxCol}, minmax(78px, 1fr))`,
                    gap: 8,
                  }}
                >
                  {deckUnits.map((u) => {
                    const isSelected = Boolean(selectedMap[u.id]);
                    const statusText = !u.available ? '🔒 Đã khóa' : isSelected ? '● Đang chọn' : '✓ Trống';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        disabled={!u.available}
                        onClick={() => onToggleUnit(u)}
                        aria-label={`Phòng ${u.unit_code} - ${statusText}`}
                        style={{
                          padding: '9px 8px',
                          borderRadius: 10,
                          border: isSelected
                            ? '2px solid var(--vx-primary-dark)'
                            : !u.available
                            ? '1px dashed #cbd5e1'
                            : '1px solid #9fd487',
                          background: !u.available ? '#f1f5f9' : isSelected ? '#ebf5e6' : '#ffffff',
                          color: !u.available ? '#94a3b8' : 'var(--vx-text)',
                          cursor: u.available ? 'pointer' : 'not-allowed',
                          textAlign: 'left',
                          transition: 'all 0.12s',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 13 }}>{u.unit_code}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>{u.kind}</span>
                        </div>
                        <div style={{ fontSize: 10.5, marginTop: 2, fontWeight: 600 }}>{statusText}</div>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: !u.available ? '#94a3b8' : 'var(--vx-primary-dark)',
                            marginTop: 3,
                          }}
                        >
                          {u.price ? `${Number(u.price).toLocaleString('vi-VN')}đ` : '—'}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--vx-muted)', marginTop: 2 }}>
                          {u.max_adults ?? 1}NL + {u.max_children ?? 0}TE
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Booking Summary Sidebar (WF-03 TÓM TẮT ĐẶT VÉ) */}
      <div className="vx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: '0 0 12px', color: 'var(--vx-primary-darker)', fontSize: '1.1rem' }}>
            TÓM TẮT ĐẶT VÉ ({selectedList.length} phòng/giường)
          </h3>
          <div style={{ fontSize: 13, color: 'var(--vx-muted)', marginBottom: 12 }}>
            Chặng đã chọn: <strong style={{ color: 'var(--vx-text)' }}>{segmentLabel}</strong>
          </div>

          {selectedList.length === 0 ? (
            <div style={{ padding: 18, background: 'var(--vx-surface)', borderRadius: 10, fontSize: 13, color: 'var(--vx-primary-dark)' }}>
              Vui lòng chạm/bấm chọn ít nhất 1 phòng hoặc giường còn trống trên sơ đồ để giữ chỗ 10 phút.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
              {selectedList.map((item) => (
                <div
                  key={item.trip_unit_id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--vx-surface)',
                    border: '1px solid var(--vx-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>
                      Vị trí {item.unit_code} ({item.kind})
                    </span>
                    <span style={{ color: 'var(--vx-primary-dark)' }}>
                      {item.price.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', fontSize: 12, flexWrap: 'wrap' }}>
                    <label>
                      Người lớn (tối đa {item.max_adults}):{' '}
                      <select
                        value={item.adult_count}
                        onChange={(e) =>
                          onUpdateCounts(item.trip_unit_id, Number(e.target.value), item.child_count)
                        }
                      >
                        {Array.from({ length: item.max_adults }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Trẻ em (tối đa {item.max_children}):{' '}
                      <select
                        value={item.child_count}
                        onChange={(e) =>
                          onUpdateCounts(item.trip_unit_id, item.adult_count, Number(e.target.value))
                        }
                      >
                        {Array.from({ length: item.max_children + 1 }, (_, i) => i).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--vx-border)', paddingTop: 14, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--vx-muted)' }}>Thời hạn giữ chỗ (Backend cấp):</span>
            <span className="vx-badge vx-badge-green">10:00 phút</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700 }}>Tạm tính (chưa gồm phụ phí):</span>
            <span className="vx-price-big">{totalEstimated.toLocaleString('vi-VN')} đ</span>
          </div>
          <button
            type="button"
            className="vx-btn-primary"
            style={{ width: '100%' }}
            disabled={selectedList.length === 0 || holdingBusy}
            onClick={onProceedHold}
          >
            {holdingBusy ? 'Đang khóa chỗ 10 phút...' : 'GIỮ CHỖ 10 PHÚT & TIẾP TỤC →'}
          </button>
        </div>
      </div>
    </div>
  );
}
