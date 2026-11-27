import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useAppDispatch } from '../../hooks/useAppStore';
import {
  ridewayApi,
  useGetBookingDetailQuery,
  useGetMeQuery,
  useGetMyBookingsQuery,
  useGetMyTicketsQuery,
} from '../../services/ridewayApi';

export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/tai-khoan';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      dispatch(ridewayApi.util.invalidateTags(['Me', 'Bookings', 'Tickets']));
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('Invalid')
          ? 'Email hoặc mật khẩu chưa chính xác.'
          : 'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vx-container" style={{ maxWidth: 960 }}>
      <div className="account-layout vx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <aside className="account-scenery" style={{ minHeight: 480 }}>
          <span className="account-brand">
            Vé<span>XuyênViệt</span> – RideWay
          </span>
          <div>
            <span className="account-kicker">Mỗi chuyến đi, một câu chuyện</span>
            <h2>
              Hành trình đẹp
              <br />
              bắt đầu từ đây.
            </h2>
            <p>
              Đăng nhập để giữ chỗ phòng đôi 10 phút, thanh toán VNPay QR 100% và quản lý vé điện tử của bạn.
            </p>
          </div>
          <div style={{ fontSize: 12, color: '#dbeafe' }}>
            Tài khoản Demo nhanh (Mật khẩu <code>Pass1234!</code>):
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {[
                { label: 'Khách hàng', mail: 'khach1@vexuyenviet.vn' },
                { label: 'Hãng xe', mail: 'owner.phuongtrang@vexuyenviet.vn' },
                { label: 'Admin', mail: 'admin@vexuyenviet.vn' },
              ].map((d) => (
                <button
                  key={d.mail}
                  type="button"
                  onClick={() => {
                    setEmail(d.mail);
                    setPassword('Pass1234!');
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  Điền {d.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="account-content">
          <span className="account-kicker">Xác thực tài khoản (/dang-nhap)</span>
          <h2>Chào mừng bạn trở lại!</h2>
          <p className="account-intro">
            Chưa có tài khoản?{' '}
            <Link to="/dang-ky" style={{ color: 'var(--gw-green)', fontWeight: 700 }}>
              Đăng ký tài khoản mới
            </Link>
          </p>

          <form onSubmit={(e) => void handleLogin(e)} className="account-form">
            <div>
              <label htmlFor="login-email">Địa chỉ Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@example.com"
              />
            </div>

            <div>
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="account-password">
                <input
                  id="login-password"
                  type={visible ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                />
                <button type="button" onClick={() => setVisible((v) => !v)}>
                  {visible ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Link to="/quen-mat-khau" style={{ color: 'var(--gw-green)', fontWeight: 600 }}>
                Quên mật khẩu?
              </Link>
            </div>

            {error && <p className="account-error">{error}</p>}

            <button type="submit" className="account-submit" disabled={busy}>
              {busy ? 'Đang đăng nhập…' : 'Đăng nhập vào RideWay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });
      dispatch(ridewayApi.util.invalidateTags(['Me']));
      navigate('/tai-khoan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo tài khoản.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vx-container" style={{ maxWidth: 620 }}>
      <div className="vx-card">
        <span className="gw-sub-pill">Tạo tài khoản mới (/dang-ky)</span>
        <h1 style={{ margin: '8px 0', fontSize: 26, color: 'var(--gw-dark)' }}>
          Đăng ký tài khoản hành khách Vé Xuyên Việt
        </h1>
        <p style={{ color: 'var(--gw-muted)', fontSize: 14 }}>
          Đã có tài khoản?{' '}
          <Link to="/dang-nhap" style={{ color: 'var(--gw-green)', fontWeight: 700 }}>
            Đăng nhập ngay
          </Link>
        </p>

        {error && <p className="account-error" style={{ marginBottom: 14 }}>{error}</p>}

        <form onSubmit={(e) => void handleRegister(e)} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="vx-field-label">Họ và tên</label>
            <input
              className="vx-input"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label className="vx-field-label">Địa chỉ Email</label>
            <input
              type="email"
              className="vx-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="khachhang@vexuyenviet.vn"
            />
          </div>
          <div>
            <label className="vx-field-label">Mật khẩu (tối thiểu 8 ký tự)</label>
            <input
              type="password"
              className="vx-input"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="vx-field-label">Xác nhận mật khẩu</label>
            <input
              type="password"
              className="vx-input"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button type="submit" className="vx-btn-primary" disabled={busy}>
            {busy ? 'Đang đăng ký…' : 'Hoàn tất đăng ký tài khoản ➜'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch<{ detail?: string }>('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setNotice(
        res.detail ||
          'Nếu địa chỉ email tồn tại trên hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.'
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không thể gửi yêu cầu khôi phục mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vx-container" style={{ maxWidth: 560 }}>
      <div className="vx-card">
        <span className="gw-sub-pill">Khôi phục mật khẩu (/quen-mat-khau)</span>
        <h1 style={{ margin: '8px 0 12px', fontSize: 24, color: 'var(--gw-dark)' }}>
          Quên mật khẩu tài khoản
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gw-muted)' }}>
          Nhập địa chỉ email đăng ký tài khoản của bạn để nhận hướng dẫn đặt lại mật khẩu an toàn từ hệ thống.
        </p>

        {notice && (
          <div style={{ padding: 14, background: 'var(--gw-green-light)', color: 'var(--gw-green-dark)', borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>
            {notice}
          </div>
        )}

        <form onSubmit={(e) => void handleRequestReset(e)} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="vx-field-label">Email tài khoản</label>
            <input
              type="email"
              className="vx-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
            />
          </div>
          <button type="submit" className="vx-btn-primary" disabled={busy}>
            {busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt lại mật khẩu'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13.5 }}>
          <Link to="/dang-nhap" style={{ color: 'var(--gw-green)', fontWeight: 700 }}>
            ⬅ Quay lại trang Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AccountProfilePage() {
  const { data: user, refetch } = useGetMeQuery();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      await refetch();
      setMsg('Đã cập nhật thông tin hồ sơ thành công.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ.');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="vx-card">
        <span className="gw-sub-pill">Hồ sơ cá nhân (/tai-khoan)</span>
        <h1 style={{ margin: '6px 0 12px', fontSize: 24, color: 'var(--gw-dark)' }}>
          Thông tin tài khoản của tôi
        </h1>

        {msg && (
          <div style={{ padding: 12, background: 'var(--gw-green-light)', color: 'var(--gw-green-dark)', borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>
            {msg}
          </div>
        )}

        <form onSubmit={(e) => void handleSave(e)} style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
          <div>
            <label className="vx-field-label">Địa chỉ Email đăng nhập</label>
            <input className="vx-input" value={user?.email || ''} disabled />
          </div>
          <div>
            <label className="vx-field-label">Họ và tên</label>
            <input
              className="vx-input"
              value={fullName || user?.full_name || ''}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="vx-field-label">Số điện thoại liên hệ</label>
            <input
              className="vx-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
            />
          </div>
          <button type="submit" className="vx-btn-primary" style={{ justifySelf: 'start' }}>
            Lưu thay đổi hồ sơ
          </button>
        </form>
      </div>

      {user?.memberships && user.memberships.length > 0 && (
        <div className="vx-card">
          <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Vai trò Đối tác Hãng xe của bạn</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {user.memberships.map((m) => (
              <div key={m.operator_id} className="gw-card-row" style={{ padding: 10, background: 'var(--gw-green-light)', borderRadius: 10 }}>
                <div>
                  <strong>{m.operator__name}</strong> • Vai trò: <span className="vx-badge vx-badge-green">{m.role}</span>
                </div>
                <Link to="/doi-tac" className="vx-btn-primary" style={{ textDecoration: 'none' }}>
                  Mở Dashboard Hãng xe ➜
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountOrdersPage() {
  const { data: bookings = [], isLoading: loadingBookings, refetch } = useGetMyBookingsQuery();
  const { data: tickets = [], isLoading: loadingTickets } = useGetMyTicketsQuery();
  const [msg, setMsg] = useState<string | null>(null);

  const requestCancel = async (bookingId: string) => {
    try {
      const res = await apiFetch<{ id: string; status: string }>(
        `/bookings/${bookingId}/cancellation-requests`,
        {
          method: 'POST',
          body: JSON.stringify({
            kind: 'CANCEL',
            reason: 'Khách gửi yêu cầu hủy từ trang Đơn hàng của tôi (/tai-khoan/don-hang)',
          }),
        }
      );
      setMsg(`Đã gửi yêu cầu hủy vé (${res.status}) — hệ thống đang đối chiếu chính sách hoàn tiền.`);
      void refetch();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Không thể gửi yêu cầu hủy');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div className="vx-card">
        <span className="gw-sub-pill">Quản lý hành trình (/tai-khoan/don-hang)</span>
        <h1 style={{ margin: '6px 0 4px', fontSize: 24, color: 'var(--gw-dark)' }}>
          Đơn đặt vé & Vé điện tử của tôi
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-muted)' }}>
          Tra cứu mã vé điện tử QR đã phát hành, tiếp tục thanh toán đơn đang giữ chỗ hoặc gửi yêu cầu hủy/đổi vé.
        </p>
      </div>

      {msg && (
        <div className="vx-card" style={{ background: 'var(--gw-green-light)', color: 'var(--gw-green-dark)', fontWeight: 700 }}>
          {msg}
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 19, color: 'var(--gw-dark)', marginBottom: 12 }}>
          🎟️ Vé điện tử QR đã phát hành ({tickets.length})
        </h2>
        {loadingTickets ? (
          <div className="vx-card">Đang tải danh sách vé điện tử…</div>
        ) : tickets.length === 0 ? (
          <div className="vx-card">Chưa có vé điện tử nào được phát hành.</div>
        ) : (
          <div className="vx-grid-3">
            {tickets.map((t) => (
              <div key={t.id} className="vx-card" style={{ borderLeft: '5px solid var(--gw-green)' }}>
                <div className="gw-card-row">
                  <span className="vx-badge vx-badge-green">{t.status}</span>
                  <strong>{t.code}</strong>
                </div>
                <div style={{ marginTop: 10, fontSize: 13.5 }}>
                  <div>Đơn: <strong>{t.booking_code}</strong></div>
                  <div>Vị trí: <strong>{t.unit_code}</strong></div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Link to={`/ve/${t.id}`} className="vx-btn-outline" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                    Xem chi tiết vé & Mã QR ➜
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: 19, color: 'var(--gw-dark)', marginBottom: 12 }}>
          📦 Lịch sử đơn đặt vé ({bookings.length})
        </h2>
        {loadingBookings ? (
          <div className="vx-card">Đang tải lịch sử đơn hàng…</div>
        ) : bookings.length === 0 ? (
          <div className="vx-card">
            Bạn chưa có đơn đặt vé nào.{' '}
            <Link to="/xe-khach/tim-kiem" style={{ color: 'var(--gw-green)', fontWeight: 700 }}>
              Tìm chuyến xe ngay ➜
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {bookings.map((b) => {
              const id = String(b.id);
              const status = String(b.status);
              return (
                <div key={id} className="vx-card gw-card-row">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gw-dark)' }}>
                      Mã đơn: {String(b.booking_code)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginTop: 3 }}>
                      Trạng thái: <span className="vx-badge vx-badge-green">{status}</span> • Thời hạn giữ chỗ:{' '}
                      {String(b.hold_expires_at || '—')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong className="vx-price-big">
                      {Number(b.total_amount || 0).toLocaleString('vi-VN')} ₫
                    </strong>
                    <Link to={`/tai-khoan/don-hang/${id}`} className="vx-btn-outline" style={{ textDecoration: 'none' }}>
                      Chi tiết đơn
                    </Link>
                    {status === 'HELD' && (
                      <Link to={`/dat-ve/${id}`} className="vx-btn-primary" style={{ textDecoration: 'none' }}>
                        Tiếp tục thanh toán ➜
                      </Link>
                    )}
                    {status === 'CONFIRMED' && (
                      <button type="button" className="vx-btn-outline" onClick={() => void requestCancel(id)}>
                        Yêu cầu Hủy vé
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountOrderDetailPage() {
  const { id = '' } = useParams();
  const { data: booking, isLoading, error, refetch } = useGetBookingDetailQuery(id, { skip: !id });
  const [msg, setMsg] = useState<string | null>(null);

  const handleAcceptQuote = async () => {
    try {
      await apiFetch(`/bookings/${id}/accept-quote`, { method: 'POST', body: JSON.stringify({}) });
      setMsg('Đã chấp nhận báo giá phụ phí đón trả tận nơi.');
      void refetch();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Không thể chấp nhận báo giá');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)' }}>
        <Link to="/tai-khoan/don-hang" style={{ color: 'var(--gw-green)' }}>
          ⬅ Quay lại danh sách Đơn hàng của tôi
        </Link>
      </div>

      {isLoading && <div className="vx-card">Đang tải chi tiết đơn hàng…</div>}
      {error && (
        <div className="vx-card" style={{ color: 'var(--gw-danger)', fontWeight: 700 }}>
          Không tìm thấy đơn đặt vé ({id}).
        </div>
      )}

      {msg && (
        <div className="vx-card" style={{ background: 'var(--gw-green-light)', color: 'var(--gw-green-dark)', fontWeight: 700 }}>
          {msg}
        </div>
      )}

      {booking && (
        <div className="vx-card">
          <div className="gw-card-row" style={{ borderBottom: '1px solid var(--gw-border)', paddingBottom: 14, marginBottom: 14 }}>
            <div>
              <span className="gw-sub-pill">Chi tiết đơn đặt vé (/tai-khoan/don-hang/{booking.id})</span>
              <h1 style={{ margin: '6px 0 0', fontSize: 24, color: 'var(--gw-dark)' }}>
                Đơn #{booking.booking_code}
              </h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="vx-badge vx-badge-green">{booking.status}</span>
              <div className="vx-price-big" style={{ marginTop: 4 }}>
                {Number(booking.total_amount).toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </div>

          <h3 style={{ color: 'var(--gw-dark)' }}>Danh sách phòng / giường trong đơn</h3>
          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            {booking.items.map((it) => (
              <div
                key={it.id}
                className="gw-card-row"
                style={{ padding: 12, background: 'var(--gw-bg-soft)', borderRadius: 10, border: '1px solid var(--gw-border)' }}
              >
                <div>
                  <strong>Vị trí {it.trip_unit__unit_code}</strong> • {it.adult_count} NL + {it.child_count} TE
                </div>
                <strong style={{ color: 'var(--gw-green-dark)' }}>
                  {Number(it.unit_price).toLocaleString('vi-VN')} ₫
                </strong>
              </div>
            ))}
          </div>

          {booking.pickup_requests && booking.pickup_requests.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ color: 'var(--gw-dark)' }}>Yêu cầu đón / trả riêng</h3>
              {booking.pickup_requests.map((pr) => (
                <div key={pr.id} className="gw-card-row" style={{ padding: 12, background: 'var(--gw-green-light)', borderRadius: 10 }}>
                  <div>
                    <strong>{pr.direction} ({pr.kind}):</strong> {pr.requested_address} • Phụ phí:{' '}
                    <strong>{Number(pr.quoted_fee || 0).toLocaleString('vi-VN')} ₫</strong> ({pr.status})
                  </div>
                  {pr.status === 'QUOTED' && (
                    <button type="button" className="vx-btn-primary" onClick={() => void handleAcceptQuote()}>
                      Đồng ý phụ phí
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {booking.status === 'HELD' && (
              <>
                <Link to={`/dat-ve/${booking.id}`} className="vx-btn-outline" style={{ textDecoration: 'none' }}>
                  Cập nhật hành khách
                </Link>
                <Link to={`/dat-ve/${booking.id}/thanh-toan`} className="vx-btn-primary" style={{ textDecoration: 'none' }}>
                  Thanh toán VNPay QR ngay ➜
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
