import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useGetMeQuery } from '../../services/ridewayApi';

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
  requirePartner?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requirePartner }: Props) {
  const location = useLocation();
  const { data: user, isLoading } = useGetMeQuery();

  if (isLoading) {
    return (
      <div className="vx-container">
        <div className="vx-card">Đang kiểm tra phiên đăng nhập và quyền truy cập…</div>
      </div>
    );
  }

  if (!user) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/dang-nhap?redirect=${redirectTarget}`} replace />;
  }

  if (requireAdmin && !user.is_staff && !user.is_superuser) {
    return (
      <div className="vx-container">
        <div className="vx-card" style={{ borderLeft: '4px solid var(--gw-danger)' }}>
          <span className="gw-sub-pill">Phân quyền hệ thống</span>
          <h2 style={{ margin: '8px 0', color: 'var(--gw-dark)' }}>
            Khu vực dành riêng cho Quản trị viên Nền tảng
          </h2>
          <p style={{ color: 'var(--gw-muted)', marginBottom: 16 }}>
            Tài khoản hiện tại (<strong>{user.email}</strong>) là tài khoản hành khách/đối tác, không có quyền truy cập khu vực Quản trị sàn (<code>/admin</code>).
          </p>
          <a href="/tai-khoan" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Quay về Tài khoản của tôi
          </a>
        </div>
      </div>
    );
  }

  if (requirePartner && (!user.memberships || user.memberships.length === 0) && !user.is_staff && !user.is_superuser) {
    // Allow access to Partner layout so they can register a new operator via POST /api/v1/operators/register,
    // or show partner onboarding banner inside Partner pages.
    return <>{children}</>;
  }

  return <>{children}</>;
}
