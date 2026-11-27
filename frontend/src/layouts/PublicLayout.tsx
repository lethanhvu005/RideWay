import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ridewayApi, useGetMeQuery } from '../services/ridewayApi';
import { useAppDispatch } from '../hooks/useAppStore';

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: currentUser } = useGetMeQuery();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    setExploreOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    dispatch(ridewayApi.util.invalidateTags(['Me', 'Bookings', 'Tickets']));
    navigate('/');
  };

  const isExploreActive =
    location.pathname.startsWith('/diem-den') ||
    location.pathname.startsWith('/hang-xe') ||
    location.pathname.startsWith('/gioi-thieu') ||
    location.pathname.startsWith('/lien-he');

  return (
    <div className="rw-public-shell">
      {/* 1. TOPBAR */}
      <div className="gw-topbar">
        <div className="gw-topbar-inner">
          <div className="gw-topbar-left">
            <span>
              <i>🛡️</i> Cam kết hoàn 150% nếu nhà xe không giữ chỗ
            </span>
            <span>
              <i>📞</i> Hotline 24/7: <strong>1900 6886</strong>
            </span>
            <span>
              <i>✉️</i> hotro@vexuyenviet.vn
            </span>
          </div>

          <div className="gw-topbar-right">
            <Link to="/xe-khach/tim-kiem" className="gw-book-now-top">
              ĐẶT VÉ NGAY
            </Link>
            <NavLink
              to="/tai-khoan/don-hang"
              className={({ isActive }) => `gw-portal-pill ${isActive ? 'active' : ''}`}
            >
              Đơn hàng của tôi
            </NavLink>
            <NavLink
              to="/doi-tac"
              className={({ isActive }) => `gw-portal-pill ${isActive ? 'active' : ''}`}
            >
              Dashboard Hãng xe
            </NavLink>
            {(currentUser?.is_staff || currentUser?.is_superuser) && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `gw-portal-pill ${isActive ? 'active' : ''}`}
              >
                Dashboard Admin
              </NavLink>
            )}
          </div>
        </div>
      </div>

      {/* 2. MULTI-PAGE STICKY HEADER (React Router NavLink) */}
      <header className="gw-header">
        <div className="gw-header-inner">
          <Link to="/" className="gw-logo" aria-label="Vé Xuyên Việt – RideWay Trang chủ">
            <div className="gw-logo-mark">🚍</div>
            <div className="gw-logo-text">
              Vé<span>XuyênViệt</span>
              <small style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--gw-muted)', letterSpacing: '0.06em' }}>
                RIDEWAY MARKETPLACE
              </small>
            </div>
          </Link>

          <nav className="gw-nav" aria-label="Điều hướng chính">
            <NavLink to="/" end className={({ isActive }) => `gw-nav-item ${isActive ? 'active' : ''}`}>
              Trang chủ
            </NavLink>
            <NavLink to="/xe-khach" className={({ isActive }) => `gw-nav-item ${isActive ? 'active' : ''}`}>
              Xe khách
            </NavLink>
            <NavLink to="/may-bay" className={({ isActive }) => `gw-nav-item ${isActive ? 'active' : ''}`}>
              Máy bay
            </NavLink>
            <NavLink to="/tau-hoa" className={({ isActive }) => `gw-nav-item ${isActive ? 'active' : ''}`}>
              Tàu hỏa
            </NavLink>
            <NavLink to="/thue-xe" className={({ isActive }) => `gw-nav-item ${isActive ? 'active' : ''}`}>
              Thuê xe
            </NavLink>

            <div
              className="rw-nav-dropdown"
              onMouseEnter={() => setExploreOpen(true)}
              onMouseLeave={() => setExploreOpen(false)}
            >
              <button
                type="button"
                className={`gw-nav-item ${isExploreActive ? 'active' : ''}`}
                aria-expanded={exploreOpen}
                onClick={() => setExploreOpen((v) => !v)}
              >
                <span>Khám phá</span>
                <span style={{ fontSize: 11 }}>▾</span>
              </button>
              {exploreOpen && (
                <div className="rw-dropdown-menu" role="menu">
                  <NavLink to="/diem-den" className="rw-dropdown-link">
                    📍 Điểm đến du lịch
                  </NavLink>
                  <NavLink to="/hang-xe" className="rw-dropdown-link">
                    🏢 Hãng xe tiêu biểu
                  </NavLink>
                  <NavLink to="/gioi-thieu" className="rw-dropdown-link">
                    🌿 Giới thiệu RideWay
                  </NavLink>
                  <NavLink to="/lien-he" className="rw-dropdown-link">
                    📞 Liên hệ & Hỗ trợ
                  </NavLink>
                </div>
              )}
            </div>

            <NavLink to="/tin-tuc" className={({ isActive }) => `gw-nav-item ${isActive ? 'active' : ''}`}>
              Tin tức
            </NavLink>
          </nav>

          <div className="gw-header-actions">
            {currentUser ? (
              <>
                <Link
                  to="/tai-khoan"
                  className="gw-user-pill"
                  style={{ textDecoration: 'none' }}
                  title={currentUser.full_name || currentUser.email}
                >
                  👤 {currentUser.full_name || currentUser.email}
                </Link>
                <button type="button" className="gw-logout-btn" onClick={() => void handleLogout()}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link
                  to="/dang-nhap"
                  className="vx-btn-primary"
                  style={{ padding: '8px 14px', fontSize: 13, minHeight: 38, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  👤 Đăng nhập
                </Link>
                <Link
                  to="/dang-ky"
                  className="vx-btn-outline"
                  style={{ padding: '8px 13px', fontSize: 13, minHeight: 38, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Đăng ký
                </Link>
              </div>
            )}

            <button
              type="button"
              className="gw-hamburger-btn"
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        <div id="mobile-navigation" className={`gw-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <NavLink to="/" end>🏠 Trang chủ</NavLink>
          <NavLink to="/xe-khach">🚍 Vé xe khách & Limousine 2 tầng</NavLink>
          <NavLink to="/xe-khach/tim-kiem">🔍 Tìm chuyến xe trực tuyến</NavLink>
          <NavLink to="/may-bay">✈️ Vé máy bay</NavLink>
          <NavLink to="/tau-hoa">🚆 Vé tàu hỏa</NavLink>
          <NavLink to="/thue-xe">🚐 Thuê xe du lịch</NavLink>
          <NavLink to="/hang-xe">🏢 Hãng xe đối tác</NavLink>
          <NavLink to="/diem-den">📍 Điểm đến nổi bật</NavLink>
          <NavLink to="/tin-tuc">📰 Tin tức & Cẩm nang</NavLink>
          <NavLink to="/gioi-thieu">🌿 Giới thiệu RideWay</NavLink>
          <NavLink to="/lien-he">📞 Liên hệ hỗ trợ</NavLink>
          <NavLink to="/tai-khoan/don-hang">🎟️ Đơn hàng của tôi</NavLink>
          <NavLink to="/tai-khoan">👤 Hồ sơ tài khoản</NavLink>
          <NavLink to="/doi-tac">🏢 Dashboard Hãng xe (/doi-tac)</NavLink>
          <NavLink to="/admin">⚙️ Dashboard Admin (/admin)</NavLink>
          {!currentUser ? (
            <NavLink to="/dang-nhap" style={{ background: 'var(--gw-green)', color: '#fff' }}>
              🔐 Đăng nhập / Đăng ký tài khoản
            </NavLink>
          ) : (
            <button
              type="button"
              className="gw-mobile-nav-btn"
              style={{ background: '#fee2e2', color: '#b91c1c' }}
              onClick={() => void handleLogout()}
            >
              <span>🚪 Đăng xuất ({currentUser.full_name || currentUser.email})</span>
              <span>✕</span>
            </button>
          )}
        </div>
      </header>

      {/* 3. ROUTE CONTENT */}
      <main style={{ minHeight: 'calc(100vh - 340px)' }}>
        <Outlet />
      </main>

      {/* 4. FOOTER */}
      <footer className="vx-footer">
        <div className="vx-footer-inner">
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', marginBottom: 10 }}>
              🚍 Vé<span style={{ color: 'var(--gw-orange)' }}>XuyênViệt</span> – RideWay
            </div>
            <p style={{ fontSize: 13.5, color: '#c5dcf8', margin: '0 0 14px', lineHeight: 1.65 }}>
              Nền tảng đặt vé xe khách & Limousine 2 tầng đa hãng kết hợp hệ sinh thái du lịch xuyên Việt: chọn chính xác vị trí phòng đôi/giường theo chặng, giữ chỗ nguyên tử 10 phút và thanh toán VNPay QR 100%.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
              <Link to="/gioi-thieu" style={{ color: '#fff', textDecoration: 'underline' }}>Giới thiệu</Link>
              <Link to="/dieu-khoan" style={{ color: '#fff', textDecoration: 'underline' }}>Điều khoản</Link>
              <Link to="/chinh-sach" style={{ color: '#fff', textDecoration: 'underline' }}>Chính sách bảo mật</Link>
              <Link to="/lien-he" style={{ color: '#fff', textDecoration: 'underline' }}>Liên hệ</Link>
            </div>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Dịch vụ & Đặt vé</strong>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13.5, lineHeight: 2.15, margin: '8px 0 0' }}>
              <li><Link to="/xe-khach" style={{ color: '#c5dcf8', textDecoration: 'none' }}>🚍 Vé xe khách & Limousine 2 tầng</Link></li>
              <li><Link to="/xe-khach/tim-kiem" style={{ color: '#c5dcf8', textDecoration: 'none' }}>🔍 Tìm kiếm & Chọn phòng 2 tầng</Link></li>
              <li><Link to="/may-bay" style={{ color: '#c5dcf8', textDecoration: 'none' }}>✈️ Vé máy bay nội địa & quốc tế</Link></li>
              <li><Link to="/tau-hoa" style={{ color: '#c5dcf8', textDecoration: 'none' }}>🚆 Vé tàu hỏa Thống Nhất Bắc – Nam</Link></li>
              <li><Link to="/thue-xe" style={{ color: '#c5dcf8', textDecoration: 'none' }}>🚐 Thuê xe hợp đồng & Limousine</Link></li>
            </ul>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Khám phá & Tài khoản</strong>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13.5, lineHeight: 2.15, margin: '8px 0 0' }}>
              <li><Link to="/hang-xe" style={{ color: '#c5dcf8', textDecoration: 'none' }}>🏢 Danh sách Hãng xe đối tác</Link></li>
              <li><Link to="/diem-den" style={{ color: '#c5dcf8', textDecoration: 'none' }}>📍 Điểm đến & Bến xe toàn quốc</Link></li>
              <li><Link to="/tin-tuc" style={{ color: '#c5dcf8', textDecoration: 'none' }}>📰 Tin tức & Cẩm nang di chuyển</Link></li>
              <li><Link to="/tai-khoan/don-hang" style={{ color: '#c5dcf8', textDecoration: 'none' }}>🎟️ Tra cứu Đơn hàng & Vé điện tử</Link></li>
              <li><Link to="/doi-tac" style={{ color: '#c5dcf8', textDecoration: 'none' }}>🤝 Mở bán vé trên RideWay (/doi-tac)</Link></li>
            </ul>
          </div>

          <div>
            <strong style={{ color: '#fff', fontSize: 16 }}>Tổng đài & Tài khoản Demo</strong>
            <div style={{ fontSize: 13.5, lineHeight: 1.9, marginTop: 8, color: '#c5dcf8' }}>
              <div>📞 Hotline 24/7: <strong style={{ color: '#fff' }}>1900 6886</strong></div>
              <div>✉️ Email: <strong style={{ color: '#fff' }}>hotro@vexuyenviet.vn</strong></div>
              <div>📍 Trụ sở: 250 Nguyễn Văn Linh, TP. Đà Nẵng</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gw-orange)' }}>
                Tài khoản thử nghiệm (Mật khẩu <code>Pass1234!</code>):<br />
                <code>khach1@vexuyenviet.vn</code> | <code>owner.phuongtrang@vexuyenviet.vn</code> | <code>admin@vexuyenviet.vn</code>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
