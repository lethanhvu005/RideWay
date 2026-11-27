import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

function useAdminList<T>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    apiFetch<{ results: T[] }>(endpoint)
      .then((r) => setData(r.results ?? []))
      .catch((e: Error) => setMsg(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [endpoint]);

  return { data, loading, msg, setMsg, reload };
}

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const operators = useAdminList<Record<string, unknown>>('/admin/operators');
  const audits = useAdminList<Record<string, unknown>>('/admin/audit-logs');

  useEffect(() => {
    apiFetch<Record<string, unknown>>('/admin/reports/summary').then(setSummary).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="vx-card" style={{ background: 'var(--gw-green-light)', borderLeft: '5px solid var(--gw-dark)' }}>
        <span className="gw-sub-pill">Dashboard Quản trị Sàn (/admin)</span>
        <h1 style={{ margin: '4px 0', fontSize: 24, color: 'var(--gw-dark)' }}>
          Tổng quan Vận hành, Tài chính & Kiểm toán Nền tảng RideWay
        </h1>
      </div>

      {summary && (
        <div className="vx-grid-4">
          <div className="vx-card">
            <div className="vx-section-kicker">HÃNG XE HOẠT ĐỘNG</div>
            <div className="vx-price-big">{String(summary.active_operators)} hãng</div>
          </div>
          <div className="vx-card">
            <div className="vx-section-kicker">CHUYẾN ĐANG MỞ BÁN</div>
            <div className="vx-price-big">{String(summary.open_trips)} chuyến</div>
          </div>
          <div className="vx-card">
            <div className="vx-section-kicker">ĐƠN CONFIRMED / EXCEPTION</div>
            <div className="vx-price-big">
              {String(summary.confirmed_bookings)} /{' '}
              <span style={{ color: 'var(--gw-danger)' }}>{String(summary.exception_bookings)}</span>
            </div>
          </div>
          <div className="vx-card">
            <div className="vx-section-kicker">DOANH THU ĐÃ XÁC NHẬN</div>
            <div className="vx-price-big">
              {Number(summary.confirmed_gross_vnd || 0).toLocaleString('vi-VN')} ₫
            </div>
          </div>
        </div>
      )}

      <div className="gw-split-2">
        <div className="vx-card">
          <h3 style={{ marginTop: 0 }}>Danh sách hãng xe đối tác ({operators.data.length})</h3>
          {operators.data.map((op) => (
            <div key={String(op.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
              <span>
                <strong>{String(op.name)}</strong> ({String(op.legal_name)})
              </span>
              <span className="vx-badge vx-badge-green">{String(op.status)}</span>
            </div>
          ))}
        </div>

        <div className="vx-card">
          <h3 style={{ marginTop: 0 }}>Nhật ký kiểm toán gần đây ({audits.data.length})</h3>
          {audits.data.slice(0, 8).map((a) => (
            <div key={String(a.id)} style={{ padding: '8px 0', borderBottom: '1px solid var(--gw-border)', fontSize: 13 }}>
              <strong style={{ color: 'var(--gw-dark)' }}>{String(a.action)}</strong>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
                {String(a.resource_type)} ({String(a.resource_id)}) • {String(a.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminOperatorsPage() {
  const { data: operators, msg, setMsg, reload } = useAdminList<Record<string, unknown>>('/admin/operators');

  const updateStatus = async (operatorId: string, status: string) => {
    try {
      await apiFetch(`/admin/operators/${operatorId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setMsg(`Đã chuyển trạng thái hãng sang ${status}.`);
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái hãng');
    }
  };

  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Quản lý Hãng xe (/admin/hang-xe)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Xét duyệt & Quản lý Hãng xe trên sàn (`/api/v1/admin/operators`)
      </h1>
      {msg && <div style={{ padding: 12, background: 'var(--gw-green-light)', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
      {operators.map((op) => (
        <div key={String(op.id)} className="gw-card-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--gw-border)' }}>
          <div>
            <strong>{String(op.name)}</strong> • Pháp nhân: {String(op.legal_name)}
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Mã số thuế: {String(op.tax_code || '—')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="vx-badge vx-badge-green">{String(op.status)}</span>
            <button type="button" className="vx-btn-outline" onClick={() => void updateStatus(String(op.id), 'APPROVED')}>
              Phê duyệt
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminUsersPage() {
  const { data: operators } = useAdminList<Record<string, unknown>>('/admin/operators');
  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Quản lý Người dùng & Thành viên hãng (/admin/nguoi-dung)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Phân quyền Tài khoản & Nhân sự Hãng xe
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
        Quản lý phân quyền <code>OperatorMembership</code> cho từng hãng xe đối tác trên hệ thống.
      </p>
      {operators.map((op) => (
        <div key={String(op.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
          <strong>{String(op.name)}</strong>
          <span className="vx-badge vx-badge-green">ID: {String(op.id)}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminTripsPage() {
  const { data: trips } = useAdminList<Record<string, unknown>>('/admin/trips');
  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Giám sát Chuyến xe (/admin/chuyen-xe)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Toàn bộ chuyến xe trên sàn (`/api/v1/admin/trips`)
      </h1>
      {trips.map((t) => (
        <div key={String(t.id)} className="gw-card-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--gw-border)' }}>
          <div>
            <strong>{String(t.operator__name)} — {String(t.route__name)}</strong>
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Khởi hành: {String(t.departure_at)}</div>
          </div>
          <span className="vx-badge vx-badge-green">{String(t.status)}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminBookingsPage() {
  const { data: requests, msg, setMsg, reload } = useAdminList<Record<string, unknown>>(
    '/admin/cancellation-requests'
  );

  const decideRequest = async (reqId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await apiFetch(`/admin/cancellation-requests/${reqId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          refund_amount: '450000',
          note: `Admin xử lý ${decision}`,
        }),
      });
      setMsg(`Đã xử lý yêu cầu hủy (${decision}) & giải phóng tồn kho tự động.`);
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu hủy');
    }
  };

  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Quản lý Đơn & Hủy vé (/admin/don-dat-ve)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Xét duyệt Yêu cầu Hủy/Đổi vé (`/api/v1/admin/cancellation-requests`)
      </h1>
      {msg && <div style={{ padding: 12, background: 'var(--gw-green-light)', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
      {requests.length === 0 ? (
        <p style={{ color: 'var(--gw-muted)' }}>Hiện chưa có yêu cầu hủy vé nào đang chờ duyệt.</p>
      ) : (
        requests.map((r) => (
          <div key={String(r.id)} className="gw-card-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <div>
              <strong>Đơn: {String(r.booking__booking_code || r.booking_id)}</strong> • Lý do: {String(r.reason)}
              <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Trạng thái: {String(r.status)}</div>
            </div>
            {String(r.status) === 'PENDING' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="vx-btn-primary" onClick={() => void decideRequest(String(r.id), 'APPROVED')}>
                  Duyệt hủy & Giải phóng chỗ
                </button>
                <button type="button" className="vx-btn-outline" onClick={() => void decideRequest(String(r.id), 'REJECTED')}>
                  Từ chối
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function AdminPaymentsPage() {
  const { data: refunds, msg, setMsg, reload } = useAdminList<Record<string, unknown>>('/admin/refunds');

  const executeRefund = async (refundId: string) => {
    try {
      await apiFetch(`/admin/refunds/${refundId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ provider_refund_ref: `RF-${Date.now()}` }),
      });
      setMsg('Đã thực thi hoàn tiền thành công.');
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi thực thi hoàn tiền');
    }
  };

  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Thanh toán & Hoàn tiền (/admin/thanh-toan)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Quản lý Lệnh Hoàn tiền (`/api/v1/admin/refunds`)
      </h1>
      {msg && <div style={{ padding: 12, background: 'var(--gw-green-light)', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
      {refunds.length === 0 ? (
        <p style={{ color: 'var(--gw-muted)' }}>Chưa có lệnh hoàn tiền nào đang chờ xử lý.</p>
      ) : (
        refunds.map((rf) => (
          <div key={String(rf.id)} className="gw-card-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <div>
              <strong>Lệnh hoàn #{String(rf.id).slice(0, 8)}</strong> • Số tiền:{' '}
              <strong>{Number(rf.amount || 0).toLocaleString('vi-VN')} ₫</strong>
              <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Trạng thái: {String(rf.status)}</div>
            </div>
            {String(rf.status) !== 'REFUNDED' && (
              <button type="button" className="vx-btn-primary" onClick={() => void executeRefund(String(rf.id))}>
                Xác nhận Hoàn tiền
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function AdminFinancePage() {
  const { data: settlements, msg, setMsg, reload } = useAdminList<Record<string, unknown>>('/admin/settlements');
  const agreements = useAdminList<Record<string, unknown>>('/admin/commission-agreements');

  const approveSettlement = async (id: string) => {
    try {
      await apiFetch(`/admin/settlements/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
      setMsg('Đã phê duyệt kỳ đối soát thành công.');
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Chặn duyệt đối soát (Kiểm tra quyền hai người)');
    }
  };

  return (
    <div className="gw-split-2">
      <div className="vx-card">
        <span className="gw-sub-pill">Tài chính & Đối soát (/admin/tai-chinh)</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Đối soát doanh thu hãng (`/api/v1/admin/settlements`)
        </h2>
        {msg && <div style={{ padding: 12, background: '#fef2f2', color: 'var(--gw-danger)', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
        {settlements.map((s) => (
          <div key={String(s.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <div>
              <strong>Kỳ: {String(s.period_start)} → {String(s.period_end)}</strong>
              <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
                Gross: {Number(s.gross_amount || 0).toLocaleString('vi-VN')} ₫ • Trạng thái: {String(s.status)}
              </div>
            </div>
            <button type="button" className="vx-btn-outline" onClick={() => void approveSettlement(String(s.id))}>
              Duyệt đối soát
            </button>
          </div>
        ))}
      </div>

      <div className="vx-card">
        <span className="gw-sub-pill">Thỏa thuận hoa hồng</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Hợp đồng hoa hồng sàn ({agreements.data.length})
        </h2>
        {agreements.data.map((c) => (
          <div key={String(c.id)} style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
            <strong>Tỷ lệ phí sàn: {String(c.commission_rate_percent)}%</strong>
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
              Hiệu lực từ: {String(c.effective_from)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminContentPage() {
  const posts = useAdminList<Record<string, unknown>>('/admin/posts');
  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Quản trị Nội dung (/admin/noi-dung)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Danh sách Bài viết & Điểm đến (`/api/v1/admin/posts`)
      </h1>
      {posts.data.map((p) => (
        <div key={String(p.id)} className="gw-card-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)' }}>
          <div>
            <strong>{String(p.title)}</strong>
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>
              Slug: <code>{String(p.slug)}</code> • Chuyên mục: {String(p.category)}
            </div>
          </div>
          <span className="vx-badge vx-badge-green">{String(p.status)}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminConfigPage() {
  const policies = useAdminList<Record<string, unknown>>('/admin/policies');
  const [locName, setLocName] = useState('');
  const [province, setProvince] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/locations', {
        method: 'POST',
        body: JSON.stringify({ name: locName.trim(), province: province.trim() }),
      });
      setMsg(`Đã thêm bến xe / điểm dừng: ${locName} (${province})`);
      setLocName('');
      setProvince('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi thêm bến xe');
    }
  };

  return (
    <div className="gw-split-2">
      <form className="vx-card" onSubmit={(e) => void handleCreateLocation(e)}>
        <span className="gw-sub-pill">Cấu hình danh mục (/admin/cau-hinh)</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Thêm Bến xe / Điểm dừng mới (`/api/v1/admin/locations`)
        </h2>
        {msg && <div style={{ padding: 12, background: 'var(--gw-green-light)', borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="vx-field-label">Tên bến xe / trạm dừng</label>
            <input className="vx-input" required value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="VD: Bến xe Trung tâm Nha Trang" />
          </div>
          <div>
            <label className="vx-field-label">Tỉnh / Thành phố</label>
            <input className="vx-input" required value={province} onChange={(e) => setProvince(e.target.value)} placeholder="VD: Khánh Hòa" />
          </div>
          <button type="submit" className="vx-btn-primary">Thêm bến xe vào hệ thống</button>
        </div>
      </form>

      <div className="vx-card">
        <span className="gw-sub-pill">Chính sách hoàn / hủy toàn sàn</span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 20, color: 'var(--gw-dark)' }}>
          Danh sách Policy (`/api/v1/admin/policies`)
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

export function AdminAuditLogsPage() {
  const { data: audits } = useAdminList<Record<string, unknown>>('/admin/audit-logs');
  return (
    <div className="vx-card">
      <span className="gw-sub-pill">Nhật ký Kiểm toán Bảo mật (/admin/nhat-ky)</span>
      <h1 style={{ margin: '6px 0 14px', fontSize: 22, color: 'var(--gw-dark)' }}>
        Audit Logs toàn hệ thống (`/api/v1/admin/audit-logs`)
      </h1>
      {audits.map((a) => (
        <div key={String(a.id)} style={{ padding: '10px 0', borderBottom: '1px solid var(--gw-border)', fontSize: 13.5 }}>
          <strong style={{ color: 'var(--gw-dark)' }}>{String(a.action)}</strong>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
            Tài nguyên: {String(a.resource_type)} ({String(a.resource_id)}) • Thời gian: {String(a.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}
