import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useGetMyTicketsQuery } from '../../services/ridewayApi';

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';

  const [statusData, setStatusData] = useState<{
    booking_id: string;
    booking_status: string;
    payment_status: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [error, setError] = useState<string | null>(null);

  const { data: tickets = [] } = useGetMyTicketsQuery();

  const checkStatus = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        booking_id: string;
        booking_status: string;
        payment_status: string | null;
      }>(`/bookings/${bookingId}/payment-status`);
      setStatusData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kiểm tra trạng thái thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      void checkStatus();
    }
  }, [bookingId]);

  const isPaid =
    statusData?.booking_status === 'CONFIRMED' && statusData?.payment_status === 'PAID';

  return (
    <div className="vx-container">
      <div className="vx-card" style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', padding: 32 }}>
        <span className="gw-sub-pill">KẾT QUẢ ĐỐI CHIẾU THANH TOÁN (/thanh-toan/ket-qua)</span>
        <h1 style={{ margin: '10px 0', fontSize: 26, color: 'var(--gw-dark)' }}>
          {isPaid ? '✓ Thanh toán thành công & Đã xuất vé điện tử' : 'Trạng thái giao dịch thanh toán'}
        </h1>

        {loading && <p>Đang kiểm tra trạng thái đơn từ Backend…</p>}
        {error && <p style={{ color: 'var(--gw-danger)', fontWeight: 700 }}>{error}</p>}

        {statusData && (
          <div
            style={{
              padding: 18,
              borderRadius: 12,
              background: isPaid ? 'var(--gw-green-light)' : '#fef3c7',
              margin: '16px 0',
              textAlign: 'left',
            }}
          >
            <div>Mã định danh đơn: <code>{statusData.booking_id}</code></div>
            <div style={{ marginTop: 6 }}>
              Trạng thái đơn hàng (Backend): <strong>{statusData.booking_status}</strong>
            </div>
            <div style={{ marginTop: 6 }}>
              Trạng thái thanh toán (VNPay IPN): <strong>{statusData.payment_status ?? 'PENDING'}</strong>
            </div>
          </div>
        )}

        {tickets.length > 0 && (
          <div style={{ textAlign: 'left', marginTop: 20 }}>
            <h3 style={{ fontSize: 17, color: 'var(--gw-dark)' }}>Vé điện tử đã phát hành của bạn:</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {tickets.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid var(--gw-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>Mã vé: {t.code}</strong> • Vị trí: <strong>{t.unit_code}</strong>
                    <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Đơn: {t.booking_code}</div>
                  </div>
                  <Link to={`/ve/${t.id}`} className="vx-btn-outline" style={{ textDecoration: 'none' }}>
                    Xem vé QR ➜
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
          {bookingId && (
            <button type="button" className="vx-btn-primary" onClick={() => void checkStatus()}>
              🔄 Kiểm tra lại trạng thái
            </button>
          )}
          <Link to="/tai-khoan/don-hang" className="vx-btn-outline" style={{ textDecoration: 'none' }}>
            Quản lý Đơn hàng của tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
