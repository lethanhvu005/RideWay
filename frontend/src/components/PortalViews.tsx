import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

/* P-08: Vé của tôi & Lịch sử đặt vé */
export function MyTicketsPortal() {
  const [bookings, setBookings] = useState<Array<Record<string, unknown>>>([]);
  const [tickets, setTickets] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loadData = () => {
    apiFetch<{ results: Array<Record<string, unknown>> }>('/me/bookings')
      .then((r) => setBookings(r.results))
      .catch((e: Error) => setMsg(e.message));
    apiFetch<{ results: Array<Record<string, unknown>> }>('/me/tickets')
      .then((r) => setTickets(r.results))
      .catch(() => setTickets([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const requestCancel = async (bookingId: string) => {
    try {
      const res = await apiFetch<{ id: string; status: string }>(
        `/bookings/${bookingId}/cancellation-requests`,
        {
          method: 'POST',
          body: JSON.stringify({ kind: 'CANCEL', reason: 'Khách gửi yêu cầu hủy từ trang Vé của tôi' }),
        }
      );
      setMsg(`Đã tạo yêu cầu hủy (${res.status}) — chờ đối chiếu policy_versions.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Không thể gửi yêu cầu hủy');
    }
  };

  return (
    <div className="vx-container">
      <div className="vx-section-header">
        <div>
          <div className="vx-section-kicker">KHÁCH HÀNG • MÀN HÌNH P-08</div>
          <h2 className="vx-section-title">Vé điện tử & Lịch sử đặt chỗ của tôi</h2>
        </div>
      </div>

      {msg && (
        <div className="vx-card" style={{ marginBottom: 16, background: 'var(--vx-surface)', color: 'var(--vx-primary-dark)', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div className="vx-grid-3" style={{ marginBottom: 28 }}>
        {tickets.length === 0 ? (
          <div className="vx-card">Chưa có vé điện tử nào được phát hành cho tài khoản này.</div>
        ) : (
          tickets.map((t) => (
            <div key={String(t.id)} className="vx-card" style={{ borderLeft: '5px solid var(--vx-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="vx-badge vx-badge-green">VÉ ĐIỆN TỬ • {String(t.status)}</span>
                <strong>{String(t.code)}</strong>
              </div>
              <div style={{ marginTop: 10, fontSize: 14 }}>
                <div>Mã đơn: <strong>{String(t.booking_code)}</strong></div>
                <div>Vị trí phòng/giường: <strong>{String(t.unit_code)}</strong></div>
                <div style={{ fontSize: 12, color: 'var(--vx-muted)', marginTop: 4 }}>
                  Hash kiểm soát QR: <code>{String(t.qr_token_hash).slice(0, 18)}...</code>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <h3 style={{ color: 'var(--vx-primary-darker)' }}>Danh sách đơn đặt vé (`/api/v1/me/bookings`)</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {bookings.map((b) => (
          <div key={String(b.id)} className="vx-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>Mã đơn: {String(b.booking_code)}</div>
              <div style={{ fontSize: 13, color: 'var(--vx-muted)' }}>
                Trạng thái: <strong>{String(b.status)}</strong> • Hết hạn giữ chỗ: {String(b.hold_expires_at)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <strong className="vx-price-big">{Number(b.total_amount).toLocaleString('vi-VN')} đ</strong>
              <button type="button" className="vx-btn-outline" onClick={() => requestCancel(String(b.id))}>
                Yêu cầu Hủy / Đổi
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* O-01..O-04 / WF-05: Operator Dashboard Portal */
export function OperatorPortal() {
  const [vehicles, setVehicles] = useState<Array<Record<string, unknown>>>([]);
  const [layouts, setLayouts] = useState<Array<Record<string, unknown>>>([]);
  const [routes, setRoutes] = useState<Array<Record<string, unknown>>>([]);
  const [trips, setTrips] = useState<Array<Record<string, unknown>>>([]);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [pickups, setPickups] = useState<Array<Record<string, unknown>>>([]);
  const [qrInput, setQrInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ results: Array<Record<string, unknown>> }>('/operators/me/vehicles').then((r) => setVehicles(r.results)).catch((e: Error) => setNotice(e.message));
    apiFetch<{ results: Array<Record<string, unknown>> }>('/operators/me/layouts').then((r) => setLayouts(r.results)).catch(() => {});
    apiFetch<{ results: Array<Record<string, unknown>> }>('/operators/me/routes').then((r) => setRoutes(r.results)).catch(() => {});
    apiFetch<{ results: Array<Record<string, unknown>> }>('/operators/me/trips').then((r) => setTrips(r.results)).catch(() => {});
    apiFetch<{ results: Array<Record<string, unknown>> }>('/operators/me/booking-items').then((r) => setItems(r.results)).catch(() => {});
    apiFetch<{ results: Array<Record<string, unknown>> }>('/operators/me/pickup-requests').then((r) => setPickups(r.results)).catch(() => {});
  }, []);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ code: string; status: string }>('/operators/me/check-in', {
        method: 'POST',
        body: JSON.stringify({ qr_token: qrInput }),
      });
      setNotice(`Check-in thành công vé ${res.code} → ${res.status}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Check-in thất bại');
    }
  };

  return (
    <div className="vx-container">
      <div className="vx-section-header">
        <div>
          <div className="vx-section-kicker">PORTAL HÃNG XE • WF-05 (O-01..O-04)</div>
          <h2 className="vx-section-title">Quản lý Đội xe, Sơ đồ 2 tầng, Tuyến & Đặt chỗ (Cô lập theo operator_id)</h2>
        </div>
      </div>

      {notice && (
        <div className="vx-card" style={{ marginBottom: 16, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
          {notice}
        </div>
      )}

      <div className="vx-grid-4" style={{ marginBottom: 24 }}>
        <div className="vx-card">
          <div className="vx-section-kicker">PHƯƠNG TIỆN (O-02)</div>
          <div className="vx-price-big">{vehicles.length} xe</div>
          <div style={{ fontSize: 12, color: 'var(--vx-muted)' }}>
            {vehicles.map((v) => String(v.registration)).join(', ') || 'Chưa có xe'}
          </div>
        </div>
        <div className="vx-card">
          <div className="vx-section-kicker">SƠ ĐỒ CHỖ (O-02)</div>
          <div className="vx-price-big">{layouts.length} mẫu</div>
          <div style={{ fontSize: 12, color: 'var(--vx-muted)' }}>
            {layouts.map((l) => `${String(l.name)} (${String(l.deck_count)} tầng)`).join(', ')}
          </div>
        </div>
        <div className="vx-card">
          <div className="vx-section-kicker">TUYẾN & CHUYẾN (O-03)</div>
          <div className="vx-price-big">{routes.length} tuyến / {trips.length} chuyến</div>
          <div style={{ fontSize: 12, color: 'var(--vx-muted)' }}>
            {routes.map((r) => String(r.name)).join(', ')}
          </div>
        </div>
        <div className="vx-card">
          <div className="vx-section-kicker">PHÒNG/GIƯỜNG ĐÃ BÁN (O-04)</div>
          <div className="vx-price-big">{items.length} chỗ</div>
          <div style={{ fontSize: 12, color: 'var(--vx-muted)' }}>
            Yêu cầu đón/trả: {pickups.length}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="vx-card">
          <h3 style={{ marginTop: 0 }}>Danh sách phòng/giường đặt theo chặng (`/operators/me/booking-items`)</h3>
          {items.map((it) => (
            <div key={String(it.id)} style={{ padding: '10px 0', borderBottom: '1px solid var(--vx-border-neutral)', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                Đơn <strong>{String(it.booking__booking_code)}</strong> • Phòng <strong>{String(it.trip_unit__unit_code)}</strong> • Chặng [{String(it.from_sequence)}, {String(it.to_sequence)})
              </span>
              <span className="vx-badge vx-badge-green">{String(it.booking__status)}</span>
            </div>
          ))}
        </div>

        <form className="vx-card" onSubmit={handleCheckIn}>
          <h3 style={{ marginTop: 0 }}>Soát vé Check-in QR (`/operators/me/check-in`)</h3>
          <p style={{ fontSize: 13, color: 'var(--vx-muted)' }}>
            Nhập token vé hoặc hash QR (ví dụ: <code>TK-DEMO0001-SECRET</code>) để chuyển trạng thái vé sang <code>USED</code> đúng 1 lần.
          </p>
          <input
            className="vx-input"
            placeholder="Nhập mã token QR vé..."
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <button type="submit" className="vx-btn-primary">
            Xác nhận Check-in lên xe
          </button>
        </form>
      </div>
    </div>
  );
}

/* A-01..A-04 / S-01 / WF-06: Platform Admin & Staff Portal */
export function AdminPortal() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [operators, setOperators] = useState<Array<Record<string, unknown>>>([]);
  const [settlements, setSettlements] = useState<Array<Record<string, unknown>>>([]);
  const [audits, setAudits] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Record<string, unknown>>('/admin/reports/summary').then(setSummary).catch((e: Error) => setMsg(e.message));
    apiFetch<{ results: Array<Record<string, unknown>> }>('/admin/operators').then((r) => setOperators(r.results)).catch(() => {});
    apiFetch<{ results: Array<Record<string, unknown>> }>('/admin/settlements').then((r) => setSettlements(r.results)).catch(() => {});
    apiFetch<{ results: Array<Record<string, unknown>> }>('/admin/audit-logs').then((r) => setAudits(r.results)).catch(() => {});
  }, []);

  const approveSettlement = async (id: string) => {
    try {
      await apiFetch(`/admin/settlements/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
      setMsg('Đã duyệt đối soát thành công.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Chặn duyệt đối soát');
    }
  };

  return (
    <div className="vx-container">
      <div className="vx-section-header">
        <div>
          <div className="vx-section-kicker">QUẢN TRỊ NỀN TẢNG • WF-06 (A-01..A-04 & S-01)</div>
          <h2 className="vx-section-title">Bảng điều khiển Admin, Đối soát Đa hãng, Ngoại lệ & Audit Log</h2>
        </div>
      </div>

      {msg && (
        <div className="vx-card" style={{ marginBottom: 16, background: '#fef2f2', color: 'var(--vx-danger)', fontWeight: 700 }}>
          {msg}
        </div>
      )}

      {summary && (
        <div className="vx-grid-4" style={{ marginBottom: 24 }}>
          <div className="vx-card">
            <div className="vx-section-kicker">HÃNG HOẠT ĐỘNG</div>
            <div className="vx-price-big">{String(summary.active_operators)} hãng</div>
          </div>
          <div className="vx-card">
            <div className="vx-section-kicker">CHUYẾN ĐANG MỞ BÁN</div>
            <div className="vx-price-big">{String(summary.open_trips)} chuyến</div>
          </div>
          <div className="vx-card">
            <div className="vx-section-kicker">ĐƠN CONFIRMED / EXCEPTION</div>
            <div className="vx-price-big">
              {String(summary.confirmed_bookings)} / <span style={{ color: 'var(--vx-danger)' }}>{String(summary.exception_bookings)}</span>
            </div>
          </div>
          <div className="vx-card">
            <div className="vx-section-kicker">DOANH THU ĐÃ XÁC NHẬN</div>
            <div className="vx-price-big">{Number(summary.confirmed_gross_vnd).toLocaleString('vi-VN')} đ</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="vx-card">
          <h3 style={{ marginTop: 0 }}>Đối soát doanh thu hãng (`/admin/settlements` — Test T11)</h3>
          {settlements.map((s) => (
            <div key={String(s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--vx-border-neutral)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Kỳ: {String(s.period_start)} → {String(s.period_end)}</div>
                <div style={{ fontSize: 13, color: 'var(--vx-muted)' }}>
                  Gross: {Number(s.gross_amount).toLocaleString('vi-VN')} đ • Trạng thái: <strong>{String(s.status)}</strong>
                </div>
              </div>
              <button type="button" className="vx-btn-outline" onClick={() => approveSettlement(String(s.id))}>
                Duyệt đối soát
              </button>
            </div>
          ))}

          <h4 style={{ marginBottom: 8, marginTop: 20 }}>Danh sách hãng xe (`/admin/operators`)</h4>
          {operators.map((op) => (
            <div key={String(op.id)} style={{ fontSize: 13, padding: '6px 0', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{String(op.name)}</strong> ({String(op.legal_name)})</span>
              <span className="vx-badge vx-badge-green">{String(op.status)}</span>
            </div>
          ))}
        </div>

        <div className="vx-card">
          <h3 style={{ marginTop: 0 }}>Nhật ký kiểm toán bảo mật (`/admin/audit-logs`)</h3>
          {audits.map((a) => (
            <div key={String(a.id)} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--vx-border-neutral)' }}>
              <div style={{ fontWeight: 700, color: 'var(--vx-primary-dark)' }}>{String(a.action)}</div>
              <div style={{ color: 'var(--vx-muted)', fontSize: 12 }}>
                Resource: {String(a.resource_type)} ({String(a.resource_id)}) • {String(a.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
