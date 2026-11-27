import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ridewayApi, useGetMeQuery } from '../services/ridewayApi';
import { useAppDispatch } from '../hooks/useAppStore';

const PARTNER_NAV = [
  { to: '/doi-tac', label: '📊 Tổng quan hãng xe', end: true },
  { to: '/doi-tac/xe-va-so-do', label: '🚌 Xe & Sơ đồ chỗ 2 tầng' },
  { to: '/doi-tac/tuyen-duong', label: '🗺️ Tuyến đường & Trạm dừng' },
  { to: '/doi-tac/chuyen-xe', label: '🕒 Lịch chạy Chuyến xe' },
  { to: '/doi-tac/gia-ve', label: '🏷️ Giá vé theo đoạn chặng' },
  { to: '/doi-tac/hanh-khach', label: '🧾 Hành khách & Check-in QR' },
  { to: '/doi-tac/don-dat-ve', label: '📦 Đơn đặt vé & Đón/trả' },
  { to: '/doi-tac/nhan-vien', label: '👥 Nhân sự hãng xe' },
  { to: '/doi-tac/bao-cao', label: '💰 Đối soát & Chính sách' },
];

export function PartnerLayout() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: user } = useGetMeQuery();

  const handleLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    dispatch(ridewayApi.util.invalidateTags(['Me', 'Partner']));
    navigate('/dang-nhap');
  };

  const activeOperatorName =
    user?.memberships?.[0]?.operator__name || 'Đối tác Nhà xe RideWay';

  return (
    <div className="rw-dashboard-shell">
      <aside className="rw-dashboard-sidebar">
        <div className="rw-dashboard-brand">
          <Link to="/doi-tac" style={{ textDecoration: 'none', color: '#fff' }}>
            <div style={{ fontSize: 19, fontWeight: 900 }}>
              🚍 RideWay <span style={{ color: 'var(--gw-orange)' }}>Partner</span>
            </div>
            <div style={{ fontSize: 12, color: '#c5dcf8', marginTop: 4 }}>
              {activeOperatorName}
            </div>
          </Link>
        </div>

        <nav className="rw-dashboard-nav" aria-label="Điều hướng Dashboard Hãng xe">
          {PARTNER_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `rw-dash-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="rw-dashboard-footer">
          <Link to="/" className="rw-dash-link" style={{ fontSize: 13 }}>
            ⬅ Về trang khách hàng (/)
          </Link>
        </div>
      </aside>

      <div className="rw-dashboard-main">
        <header className="rw-dashboard-topbar">
          <div>
            <span className="vx-badge vx-badge-green">KÊNH ĐỐI TÁC VẬN TẢI (/doi-tac)</span>
            <strong style={{ marginLeft: 10, color: 'var(--gw-dark)' }}>{activeOperatorName}</strong>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-muted)' }}>
              👤 {user?.full_name || user?.email}
            </span>
            <Link to="/tai-khoan" className="vx-btn-outline" style={{ padding: '6px 12px', minHeight: 34, fontSize: 12.5, textDecoration: 'none' }}>
              Hồ sơ
            </Link>
            <button type="button" className="gw-logout-btn" onClick={() => void handleLogout()}>
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="rw-dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
