import { Link, useParams } from 'react-router-dom';
import { useGetMyTicketsQuery } from '../../services/ridewayApi';

export function TicketDetailPage() {
  const { ticketId = '' } = useParams();
  const { data: tickets = [], isLoading } = useGetMyTicketsQuery();

  const ticket = tickets.find((t) => String(t.id) === ticketId || String(t.code) === ticketId);

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/tai-khoan/don-hang" style={{ color: 'var(--gw-green)' }}>Đơn hàng & Vé của tôi</Link> /{' '}
        <span>Chi tiết vé điện tử</span>
      </div>

      {isLoading && <div className="vx-card">Đang tải thông tin vé điện tử…</div>}

      {!isLoading && !ticket && (
        <div className="vx-card">
          <h2 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Không tìm thấy vé điện tử ({ticketId})</h2>
          <p style={{ color: 'var(--gw-muted)' }}>
            Vé điện tử này không tồn tại hoặc không thuộc tài khoản đang đăng nhập.
          </p>
          <Link to="/tai-khoan/don-hang" className="vx-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Về danh sách vé của tôi
          </Link>
        </div>
      )}

      {ticket && (
        <div className="vx-card" style={{ maxWidth: 640, margin: '0 auto', borderTop: '5px solid var(--gw-green)' }}>
          <div className="gw-card-row">
            <span className="vx-badge vx-badge-green">VÉ ĐIỆN TỬ CHÍNH THỨC • {ticket.status}</span>
            <strong style={{ fontSize: 18, color: 'var(--gw-dark)' }}>{ticket.code}</strong>
          </div>

          <div
            style={{
              margin: '20px 0',
              padding: 20,
              borderRadius: 12,
              background: 'var(--gw-green-light)',
              border: '1px dashed var(--gw-green)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 38, marginBottom: 6 }}>🎟️</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gw-dark)' }}>
              Vị trí phòng / giường: {ticket.unit_code}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginTop: 4 }}>
              Mã đơn đặt chỗ: <strong>{ticket.booking_code}</strong>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: '#fff',
                borderRadius: 8,
                fontSize: 12,
                wordBreak: 'break-all',
              }}
            >
              Chữ ký Token QR (HMAC):<br />
              <code>{ticket.qr_token || ticket.code}</code>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center' }}>
            Xuất trình mã token QR này cho nhân viên nhà xe khi lên xe để thực hiện Check-in một lần duy nhất (<code>ISSUED → USED</code>).
          </p>
        </div>
      )}
    </div>
  );
}
