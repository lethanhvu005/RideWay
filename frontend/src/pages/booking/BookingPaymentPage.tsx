import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { HoldTimer } from '../../components/HoldTimer';
import { useGetBookingDetailQuery } from '../../services/ridewayApi';

interface PaymentIntentResponse {
  payment_intent_id: string;
  provider: string;
  amount: string;
  currency: string;
  qr_payload: string;
  payment_url?: string;
  provider_reference: string;
}

export function BookingPaymentPage() {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useGetBookingDetailQuery(bookingId, { skip: !bookingId });

  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const createOrLoadIntent = async () => {
    if (!bookingId) return;
    setBusy(true);
    setErrMsg(null);
    try {
      const res = await apiFetch<PaymentIntentResponse>(`/bookings/${bookingId}/payment-intents`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setIntent(res);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Không thể khởi tạo giao dịch thanh toán VNPay QR');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      void createOrLoadIntent();
    }
  }, [bookingId]);

  const handleVerifyPayment = async () => {
    navigate(`/thanh-toan/ket-qua?bookingId=${bookingId}`);
  };

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to={`/dat-ve/${bookingId}`} style={{ color: 'var(--gw-green)' }}>Thông tin đặt vé</Link> /{' '}
        <span>Thanh toán VNPay QR 100%</span>
      </div>

      {isLoading && <div className="vx-card">Đang tải thông tin thanh toán…</div>}

      {booking && (
        <div className="gw-split-2">
          <div className="vx-card">
            <span className="gw-sub-pill">BƯỚC 3 / 3 • THANH TOÁN VNPAY QR 100%</span>
            <h1 style={{ margin: '6px 0 12px', fontSize: 24, color: 'var(--gw-dark)' }}>
              Thanh toán đơn #{booking.booking_code}
            </h1>

            {booking.hold_expires_at && <HoldTimer expiresAt={booking.hold_expires_at} />}

            {errMsg && (
              <div style={{ marginTop: 14, padding: 12, background: '#fef2f2', color: 'var(--gw-danger)', borderRadius: 10, fontWeight: 700 }}>
                ⚠️ {errMsg}
              </div>
            )}

            {intent && (
              <div
                style={{
                  marginTop: 18,
                  padding: 24,
                  background: 'var(--gw-green-light)',
                  borderRadius: 14,
                  border: '1px solid var(--gw-border)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gw-dark)', marginBottom: 6 }}>
                  Quét mã VNPay QR — {Number(intent.amount).toLocaleString('vi-VN')} ₫
                </div>
                <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 14 }}>
                  Mã tham chiếu: <strong>{intent.provider_reference}</strong>
                </div>

                <div
                  style={{
                    width: 200,
                    height: 200,
                    margin: '0 auto 14px',
                    background: '#fff',
                    border: '2px solid var(--gw-green)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 14,
                    fontWeight: 800,
                    color: 'var(--gw-dark)',
                  }}
                >
                  <span style={{ fontSize: 32, marginBottom: 6 }}>📲</span>
                  <span>VNPAY QR 100%</span>
                  <small style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 4 }}>
                    {booking.booking_code}
                  </small>
                </div>

                <div style={{ fontSize: 12, color: 'var(--gw-muted)', wordBreak: 'break-all', marginBottom: 16 }}>
                  Payload: <code>{intent.qr_payload}</code>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="vx-btn-primary"
                    disabled={busy}
                    onClick={() => void handleVerifyPayment()}
                  >
                    Đối chiếu trạng thái thanh toán ➜
                  </button>
                  <button
                    type="button"
                    className="vx-btn-outline"
                    disabled={busy}
                    onClick={() => void createOrLoadIntent()}
                  >
                    Làm mới mã QR
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="vx-card" style={{ alignSelf: 'start' }}>
            <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Quy tắc xác thực thanh toán</h3>
            <p style={{ fontSize: 13.5, color: 'var(--gw-muted)', lineHeight: 1.65 }}>
              Theo kiến trúc bảo mật của RideWay, giao diện React <strong>không tự ý đánh dấu đã thanh toán</strong>. Vé điện tử chỉ được phát hành sau khi Backend nhận và xác thực chữ ký <code>HMAC-SHA512</code> từ cổng VNPay trên đúng số tiền <code>{Number(booking.total_amount).toLocaleString('vi-VN')} ₫</code>.
            </p>
            <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 12, marginTop: 12 }}>
              <Link to={`/tai-khoan/don-hang/${booking.id}`} className="vx-btn-outline" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Xem chi tiết đơn trong Tài khoản
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
