import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ridewayApi, useGetMeQuery } from '../services/ridewayApi';
import { useAppDispatch } from '../hooks/useAppStore';

const ADMIN_NAV = [
  { to: '/admin', label: '📈 Tổng quan toàn sàn', end: true },
  { to: '/admin/hang-xe', label: '🏢 Quản lý hãng xe' },
  { to: '/admin/nguoi-dung', label: '👥 Quản lý người dùng' },
  { to: '/admin/chuyen-xe', label: '🚍 Giám sát chuyến xe' },
  { to: '/admin/don-dat-ve', label: '🎟️ Quản lý đơn & Hủy vé' },
  { to: '/admin/thanh-toan', label: '💳 Giao dịch & Hoàn tiền' },
  { to: '/admin/tai-chinh', label: '🏦 Đối soát & Hoa hồng' },
  { to: '/admin/noi-dung', label: '📰 Điểm đến & Bài viết' },
  { to: '/admin/cau-hinh', label: '⚙️ Cấu hình Bến & Loại xe' },
  { to: '/admin/nhat-ky', label: '🛡️ Nhật ký kiểm toán' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: user } = useGetMeQuery();

  const handleLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    dispatch(ridewayApi.util.invalidateTags(['Me', 'Admin']));
    navigate('/dang-nhap');
  };

  return (
    <div className="rw-dashboard-shell">
      <aside className="rw-dashboard-sidebar rw-admin-sidebar">
        <div className="rw-dashboard-brand">
          <Link to="/admin" style={{ textDecoration: 'none', color: '#fff' }}>
            <div style={{ fontSize: 19, fontWeight: 900 }}>
              🛡️ RideWay <span style={{ color: 'var(--gw-orange)' }}>Admin</span>
            </div>
            <div style={{ fontSize: 12, color: '#c5dcf8', marginTop: 4 }}>
              Quản trị Sàn Vé Xuyên Việt
            </div>
          </Link>
        </div>

        <nav className="rw-dashboard-nav" aria-label="Điều hướng Quản trị sàn">
          {ADMIN_NAV.map((item) => (
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
          <Link to="/doi-tac" className="rw-dash-link" style={{ fontSize: 13 }}>
            🏢 Chuyển sang Kênh Đối tác
          </Link>
          <Link to="/" className="rw-dash-link" style={{ fontSize: 13 }}>
            ⬅ Về trang công khai (/)
          </Link>
        </div>
      </aside>

      <div className="rw-dashboard-main">
        <header className="rw-dashboard-topbar">
          <div>
            <span className="vx-badge vx-badge-amber">QUẢN TRỊ VIÊN NỀN TẢNG (/admin)</span>
            <strong style={{ marginLeft: 10, color: 'var(--gw-dark)' }}>
              Trung tâm điều hành & Đối soát RideWay
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-muted)' }}>
              🛡️ {user?.full_name || user?.email}
            </span>
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
