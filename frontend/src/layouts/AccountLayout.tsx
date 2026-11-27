import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ridewayApi, useGetMeQuery } from '../services/ridewayApi';
import { useAppDispatch } from '../hooks/useAppStore';

export function AccountLayout() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: user } = useGetMeQuery();

  const handleLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    dispatch(ridewayApi.util.invalidateTags(['Me', 'Bookings', 'Tickets']));
    navigate('/');
  };

  return (
    <div className="rw-account-workspace">
      <div className="vx-container">
        <div className="rw-account-grid">
          <aside className="vx-card rw-account-sidebar">
            <div style={{ borderBottom: '1px solid var(--gw-border)', paddingBottom: 14, marginBottom: 14 }}>
              <span className="gw-sub-pill" style={{ marginBottom: 6 }}>Tài khoản hành khách</span>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--gw-dark)' }}>
                {user?.full_name || 'Hành khách RideWay'}
              </h3>
              <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginTop: 2 }}>{user?.email}</div>
            </div>

            <nav className="rw-side-nav" aria-label="Menu tài khoản">
              <NavLink to="/tai-khoan" end className={({ isActive }) => `rw-side-link ${isActive ? 'active' : ''}`}>
                👤 Hồ sơ cá nhân
              </NavLink>
              <NavLink to="/tai-khoan/don-hang" className={({ isActive }) => `rw-side-link ${isActive ? 'active' : ''}`}>
                🎟️ Đơn hàng & Vé điện tử
              </NavLink>
              <Link to="/xe-khach/tim-kiem" className="rw-side-link">
                🚍 Đặt vé chuyến mới
              </Link>
              <Link to="/doi-tac" className="rw-side-link">
                🏢 Kênh Đối tác Hãng xe
              </Link>
              {(user?.is_staff || user?.is_superuser) && (
                <Link to="/admin" className="rw-side-link">
                  ⚙️ Quản trị nền tảng (/admin)
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rw-side-link"
                style={{ color: 'var(--gw-danger)', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', width: '100%' }}
              >
                🚪 Đăng xuất
              </button>
            </nav>
          </aside>

          <section style={{ minWidth: 0 }}>
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
