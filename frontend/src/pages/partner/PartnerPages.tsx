import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

function usePartnerResource<T>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    apiFetch<{ results: T[] }>(endpoint)
      .then((r) => setData(r.results ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [endpoint]);

  return { data, loading, error, reload };
}

export function PartnerDashboardPage() {
  const vehicles = usePartnerResource<Record<string, unknown>>('/operators/me/vehicles');
  const layouts = usePartnerResource<Record<string, unknown>>('/operators/me/layouts');
  const routes = usePartnerResource<Record<string, unknown>>('/operators/me/routes');
  const trips = usePartnerResource<Record<string, unknown>>('/operators/me/trips');
  const items = usePartnerResource<Record<string, unknown>>('/operators/me/booking-items');
  const pickups = usePartnerResource<Record<string, unknown>>('/operators/me/pickup-requests');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="vx-card" style={{ background: 'var(--gw-green-light)', borderLeft: '5px solid var(--gw-green)' }}>
        <span className="gw-sub-pill">Dashboard Hãng xe (/doi-tac)</span>
        <h1 style={{ margin: '4px 0', fontSize: 24, color: 'var(--gw-dark)' }}>
          Trung tâm điều hành đội xe & Bán vé theo đoạn chặng
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-muted)' }}>
          Quản lý phương tiện, mẫu sơ đồ 2 tầng, lịch chạy, bảng giá đoạn chặng, danh sách hành khách và soát vé QR.
        </p>
      </div>

      <div className="vx-grid-4">
        <div className="vx-card">
          <div className="vx-section-kicker">ĐỘI XE VẬN HÀNH</div>
          <div className="vx-price-big">{vehicles.data.length} xe</div>
          <Link to="/doi-tac/xe-va-so-do" style={{ fontSize: 12.5, color: 'var(--gw-green)', fontWeight: 700 }}>
            Quản lý xe & sơ đồ ➜
          </Link>
        </div>
        <div className="vx-card">
          <div className="vx-section-kicker">MẪU SƠ ĐỒ 2 TẦNG</div>
          <div className="vx-price-big">{layouts.data.length} sơ đồ</div>
          <Link to="/doi-tac/xe-va-so-do" style={{ fontSize: 12.5, color: 'var(--gw-green)', fontWeight: 700 }}>
            Cấu hình phòng/giường ➜
          </Link>
        </div>
        <div className="vx-card">
          <div className="vx-section-kicker">TUYẾN & CHUYẾN MỞ BÁN</div>
          <div className="vx-price-big">
            {routes.data.length} tuyến / {trips.data.length} chuyến
          </div>
          <Link to="/doi-tac/chuyen-xe" style={{ fontSize: 12.5, color: 'var(--gw-green)', fontWeight: 700 }}>
            Xem lịch chạy ➜
          </Link>
        </div>
        <div className="vx-card">
          <div className="vx-section-kicker">CHỖ ĐÃ ĐẶT & ĐÓN/TRẢ</div>
          <div className="vx-price-big">{items.data.length} chỗ</div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
            Yêu cầu đón riêng: {pickups.data.length}
          </div>
        </div>
      </div>

      <div className="gw-split-2">
        <div className="vx-card">
          <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Chuyến xe đang vận hành</h3>
          {trips.data.map((t) => (
            <div key={String(t.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
              <div>
                <strong>{String(t.route__name || 'Tuyến Xuyên Việt')}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
                  Khởi hành: {String(t.departure_at)}
                </div>
              </div>
              <span className="vx-badge vx-badge-green">{String(t.status)}</span>
            </div>
          ))}
        </div>

        <div className="vx-card">
          <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Đơn đặt phòng / giường mới nhất</h3>
          {items.data.slice(0, 6).map((it) => (
            <div key={String(it.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
              <span>
                Đơn <strong>{String(it.booking__booking_code)}</strong> • Vị trí <strong>{String(it.trip_unit__unit_code)}</strong> • Chặng [{String(it.from_sequence)}, {String(it.to_sequence)})
              </span>
              <span className="vx-badge vx-badge-green">{String(it.booking__status)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PartnerVehiclesPage() {
  const vehicles = usePartnerResource<Record<string, unknown>>('/operators/me/vehicles');
  const layouts = usePartnerResource<Record<string, unknown>>('/operators/me/layouts');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="vx-card">
        <span className="gw-sub-pill">Đội xe & Sơ đồ chỗ (/doi-tac/xe-va-so-do)</span>
        <h1 style={{ margin: '6px 0 0', fontSize: 22, color: 'var(--gw-dark)' }}>
          Quản lý Phương tiện & Mẫu sơ đồ phòng/giường 2 tầng
        </h1>
      </div>

      <div className="gw-split-2">
        <div className="vx-card">
          <h3 style={{ marginTop: 0 }}>Danh sách xe (`/api/v1/operators/me/vehicles`)</h3>
          {vehicles.data.map((v) => (
            <div key={String(v.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
              <div>
                <strong>Biển số: {String(v.registration)}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
                  Loại xe: {String(v.vehicle_type__name || 'Limousine / Giường nằm')}
                </div>
              </div>
              <span className="vx-badge vx-badge-green">{String(v.active ? 'Đang hoạt động' : 'Tạm ngưng')}</span>
            </div>
          ))}
        </div>

        <div className="vx-card">
          <h3 style={{ marginTop: 0 }}>Mẫu sơ đồ 2 tầng (`/api/v1/operators/me/layouts`)</h3>
          {layouts.data.map((l) => (
            <div key={String(l.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
              <div>
                <strong>{String(l.name)}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
                  Số tầng: {String(l.deck_count)} tầng
                </div>
              </div>
              <span className="vx-badge vx-badge-green">Đang áp dụng</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PartnerRoutesPage() {
  const routes = usePartnerResource<Record<string, unknown>>('/operators/me/routes');
  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Tuyến đường (/doi-tac/tuyen-duong)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Danh sách tuyến vận tải & Thứ tự trạm dừng
      </h1>
      {routes.data.map((r) => (
        <div key={String(r.id)} className="gw-card-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--gw-border)' }}>
          <div>
            <strong>{String(r.name)}</strong>
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Mã tuyến: <code>{String(r.id)}</code></div>
          </div>
          <span className="vx-badge vx-badge-green">Hoạt động</span>
        </div>
      ))}
    </div>
  );
}

export function PartnerTripsPage() {
  const trips = usePartnerResource<Record<string, unknown>>('/operators/me/trips');
  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Lịch chạy chuyến xe (/doi-tac/chuyen-xe)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Quản lý chuyến xe mở bán (`/api/v1/operators/me/trips`)
      </h1>
      {trips.data.map((t) => (
        <div key={String(t.id)} className="gw-card-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--gw-border)' }}>
          <div>
            <strong>{String(t.route__name || 'Tuyến đường dài')}</strong>
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
              Khởi hành: {String(t.departure_at)} • Mã chuyến: <code>{String(t.id)}</code>
            </div>
          </div>
          <span className="vx-badge vx-badge-green">{String(t.status)}</span>
        </div>
      ))}
    </div>
  );
}

export function PartnerPricingPage() {
  const trips = usePartnerResource<Record<string, unknown>>('/operators/me/trips');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [fromSeq, setFromSeq] = useState(0);
  const [toSeq, setToSeq] = useState(2);
  const [price, setPrice] = useState('600000');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSaveFare = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedTripId || String(trips.data[0]?.id || '');
    if (!targetId) return;
    try {
      await apiFetch(`/operators/me/trips/${targetId}/fares`, {
        method: 'PUT',
        body: JSON.stringify({
          fares: [{ from_sequence: fromSeq, to_sequence: toSeq, price }],
        }),
      });
      setMsg(`Đã cập nhật giá chặng [${fromSeq} → ${toSeq}) = ${Number(price).toLocaleString('vi-VN')} ₫`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Không thể cập nhật bảng giá');
    }
  };

  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Bảng giá theo đoạn chặng (/doi-tac/gia-ve)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Cấu hình giá vé theo từng đoạn chặng `[from_sequence, to_sequence)`
      </h1>

      {msg && (
        <div style={{ padding: 12, background: 'var(--gw-green-light)', color: 'var(--gw-green-dark)', borderRadius: 10, marginBottom: 14, fontWeight: 700 }}>
          {msg}
        </div>
      )}

      <form onSubmit={(e) => void handleSaveFare(e)} className="vx-grid-4" style={{ alignItems: 'end' }}>
        <div>
          <label className="vx-field-label">Chọn chuyến xe</label>
          <select className="vx-select" value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)}>
            {trips.data.map((t) => (
              <option key={String(t.id)} value={String(t.id)}>
                {String(t.route__name)} ({String(t.departure_at)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="vx-field-label">Trạm đi (`from_sequence`)</label>
          <input type="number" min={0} max={10} className="vx-input" value={fromSeq} onChange={(e) => setFromSeq(Number(e.target.value))} />
        </div>
        <div>
          <label className="vx-field-label">Trạm đến (`to_sequence`)</label>
          <input type="number" min={1} max={10} className="vx-input" value={toSeq} onChange={(e) => setToSeq(Number(e.target.value))} />
        </div>
        <div>
          <label className="vx-field-label">Giá vé VNĐ</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="vx-input" value={price} onChange={(e) => setPrice(e.target.value)} />
            <button type="submit" className="vx-btn-primary">Lưu giá</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function PartnerPassengersPage() {
  const [qrInput, setQrInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ code: string; status: string }>('/operators/me/check-in', {
        method: 'POST',
        body: JSON.stringify({ qr_token: qrInput }),
      });
      setNotice(`✓ Check-in thành công mã vé ${res.code} → Trạng thái: ${res.status}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Check-in thất bại');
    }
  };

  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Soát vé & Hành khách (/doi-tac/hanh-khach)</span>
      <h1 style={{ margin: '6px 0 12px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Soát vé Check-in QR lên xe (`/api/v1/operators/me/check-in`)
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
        Quét hoặc nhập mã chữ ký token QR của hành khách (VD: <code>TK-DEMO0001-SECRET</code>) để xác thực và chuyển vé sang trạng thái <code>USED</code> đúng 1 lần duy nhất.
      </p>

      {notice && (
        <div style={{ padding: 12, background: 'var(--gw-green-light)', color: 'var(--gw-green-dark)', borderRadius: 10, marginBottom: 14, fontWeight: 700 }}>
          {notice}
        </div>
      )}

      <form onSubmit={(e) => void handleCheckIn(e)} style={{ display: 'flex', gap: 10, maxWidth: 540 }}>
        <input
          className="vx-input"
          required
          placeholder="Nhập mã Token QR vé điện tử..."
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
        />
        <button type="submit" className="vx-btn-primary" style={{ whiteSpace: 'nowrap' }}>
          Xác nhận Check-in ➜
        </button>
      </form>
    </div>
  );
}

export function PartnerBookingsPage() {
  const items = usePartnerResource<Record<string, unknown>>('/operators/me/booking-items');
  const pickups = usePartnerResource<Record<string, unknown>>('/operators/me/pickup-requests');

  return (
    <div className="gw-split-2">
      <div className="vx-card">
        <span className="gw-sub-pill">Đơn đặt chỗ (/doi-tac/don-dat-ve)</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Danh sách phòng/giường đã đặt ({items.data.length})
        </h2>
        {items.data.map((it) => (
          <div key={String(it.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <span>
              Đơn <strong>{String(it.booking__booking_code)}</strong> • Vị trí <strong>{String(it.trip_unit__unit_code)}</strong> • Chặng [{String(it.from_sequence)}, {String(it.to_sequence)})
            </span>
            <span className="vx-badge vx-badge-green">{String(it.booking__status)}</span>
          </div>
        ))}
      </div>

      <div className="vx-card">
        <span className="gw-sub-pill">Yêu cầu đón / trả riêng</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Danh sách yêu cầu báo giá đón tận nơi ({pickups.data.length})
        </h2>
        {pickups.data.map((p) => (
          <div key={String(p.id)} style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <strong>{String(p.requested_address)}</strong>
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
              Trạng thái: {String(p.status)} • Phụ phí báo giá: {Number(p.quoted_fee || 0).toLocaleString('vi-VN')} ₫
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartnerStaffPage() {
  const memberships = usePartnerResource<Record<string, unknown>>('/operators/me/memberships');
  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Nhân sự nhà xe (/doi-tac/nhan-vien)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Danh sách thành viên & Phân quyền vận hành (`/api/v1/operators/me/memberships`)
      </h1>
      {memberships.data.map((m) => (
        <div key={String(m.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
          <div>
            <strong>{String(m.user__full_name || m.user__email)}</strong>
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>{String(m.user__email)}</div>
          </div>
          <span className="vx-badge vx-badge-green">{String(m.role)}</span>
        </div>
      ))}
    </div>
  );
}

export function PartnerReportsPage() {
  const settlements = usePartnerResource<Record<string, unknown>>('/operators/me/settlements');
  const policies = usePartnerResource<Record<string, unknown>>('/operators/me/policies');

  return (
    <div className="gw-split-2">
      <div className="vx-card">
        <span className="gw-sub-pill">Đối soát doanh thu (/doi-tac/bao-cao)</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Kỳ đối soát doanh thu hãng (`/api/v1/operators/me/settlements`)
        </h2>
        {settlements.data.map((s) => (
          <div key={String(s.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <div>
              <strong>Kỳ: {String(s.period_start)} → {String(s.period_end)}</strong>
              <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
                Doanh thu gộp: {Number(s.gross_amount || 0).toLocaleString('vi-VN')} ₫ • Thực nhận: {Number(s.net_amount || 0).toLocaleString('vi-VN')} ₫
              </div>
            </div>
            <span className="vx-badge vx-badge-green">{String(s.status)}</span>
          </div>
        ))}
      </div>

      <div className="vx-card">
        <span className="gw-sub-pill">Chính sách hoàn / hủy</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Chính sách hủy vé đang áp dụng ({policies.data.length})
        </h2>
        {policies.data.map((p) => (
          <div key={String(p.id)} style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <strong>{String(p.name)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
