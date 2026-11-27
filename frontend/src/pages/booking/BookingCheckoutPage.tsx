import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { HoldTimer } from '../../components/HoldTimer';
import { useGetBookingDetailQuery } from '../../services/ridewayApi';

interface PassengerDraft {
  client_ref: string;
  booking_item_id: string;
  unit_code: string;
  kind: 'ADULT' | 'CHILD';
  full_name: string;
  contact_phone: string;
}

export function BookingCheckoutPage() {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading, error, refetch } = useGetBookingDetailQuery(bookingId, {
    skip: !bookingId,
  });

  const [contactPhone, setContactPhone] = useState('0901234567');
  const [pickupMode, setPickupMode] = useState<'NONE' | 'CUSTOM'>('NONE');
  const [customAddress, setCustomAddress] = useState('');
  const [passengerDrafts, setPassengerDrafts] = useState<PassengerDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!booking?.items) return;
    const drafts: PassengerDraft[] = [];
    let counter = 1;
    for (const item of booking.items) {
      for (let a = 0; a < item.adult_count; a++) {
        drafts.push({
          client_ref: `P${counter++}`,
          booking_item_id: item.id,
          unit_code: item.trip_unit__unit_code,
          kind: 'ADULT',
          full_name: `Hành khách ${item.trip_unit__unit_code} - Người lớn ${a + 1}`,
          contact_phone: '0901234567',
        });
      }
      for (let c = 0; c < item.child_count; c++) {
        drafts.push({
          client_ref: `P${counter++}`,
          booking_item_id: item.id,
          unit_code: item.trip_unit__unit_code,
          kind: 'CHILD',
          full_name: `Hành khách ${item.trip_unit__unit_code} - Trẻ em ${c + 1}`,
          contact_phone: '0901234567',
        });
      }
    }
    setPassengerDrafts(drafts);
  }, [booking]);

  const handleSubmitPassengers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setBusy(true);
    setErrMsg(null);
    try {
      const passengers = passengerDrafts.map((p) => ({
        client_ref: p.client_ref,
        full_name: p.full_name.trim(),
        kind: p.kind,
        contact_phone: p.contact_phone.trim() || contactPhone.trim(),
      }));

      const itemAssignments = booking.items.map((item) => ({
        booking_item_id: item.id,
        passenger_refs: passengerDrafts
          .filter((d) => d.booking_item_id === item.id)
          .map((d) => d.client_ref),
      }));

      const pickupRequests =
        pickupMode === 'CUSTOM' && customAddress.trim()
          ? [{ direction: 'PICKUP', kind: 'CUSTOM', requested_address: customAddress.trim() }]
          : [];

      await apiFetch(`/bookings/${booking.id}/passengers`, {
        method: 'PUT',
        body: JSON.stringify({
          passengers,
          item_assignments: itemAssignments,
          pickup_requests: pickupRequests,
        }),
      });

      await refetch();
      navigate(`/dat-ve/${booking.id}/thanh-toan`);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Không thể lưu thông tin hành khách');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vx-container">
      <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'var(--gw-green)' }}>Trang chủ</Link> /{' '}
        <Link to="/xe-khach/tim-kiem" style={{ color: 'var(--gw-green)' }}>Tìm chuyến xe</Link> /{' '}
        <span>Nhập thông tin đặt vé</span>
      </div>

      {isLoading && <div className="vx-card">Đang tải thông tin đơn giữ chỗ từ Backend…</div>}
      {error && (
        <div className="vx-card" style={{ color: 'var(--gw-danger)', fontWeight: 700 }}>
          Không tìm thấy đơn đặt vé hoặc bạn không có quyền truy cập đơn này.
        </div>
      )}

      {booking && (
        <div className="gw-split-2">
          <form className="vx-card" onSubmit={(e) => void handleSubmitPassengers(e)}>
            <span className="gw-sub-pill">BƯỚC 2 / 3 • THÔNG TIN HÀNH KHÁCH & ĐÓN TRẢ</span>
            <h1 style={{ margin: '6px 0 12px', fontSize: 24, color: 'var(--gw-dark)' }}>
              Đơn đặt vé #{booking.booking_code}
            </h1>

            {booking.hold_expires_at && <HoldTimer expiresAt={booking.hold_expires_at} />}

            {errMsg && (
              <div style={{ marginTop: 14, padding: 12, background: '#fef2f2', color: 'var(--gw-danger)', borderRadius: 10, fontWeight: 700 }}>
                ⚠️ {errMsg}
              </div>
            )}

            <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
              <div>
                <label className="vx-field-label">Số điện thoại chính nhận vé điện tử QR</label>
                <input
                  className="vx-input"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="vx-field-label">Danh sách hành khách theo từng phòng / giường</label>
                <div style={{ display: 'grid', gap: 10 }}>
                  {passengerDrafts.map((draft, index) => (
                    <div
                      key={draft.client_ref}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid var(--gw-border)',
                        background: 'var(--gw-bg-soft)',
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--gw-green-dark)', marginBottom: 6 }}>
                        Vị trí {draft.unit_code} • {draft.kind === 'ADULT' ? 'Người lớn' : 'Trẻ em'} ({draft.client_ref})
                      </div>
                      <input
                        className="vx-input"
                        required
                        value={draft.full_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPassengerDrafts((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, full_name: val } : item))
                          );
                        }}
                        placeholder="Nhập họ và tên hành khách..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="vx-field-label">Hình thức đón / trả</label>
                <select
                  className="vx-select"
                  value={pickupMode}
                  onChange={(e) => setPickupMode(e.target.value as 'NONE' | 'CUSTOM')}
                >
                  <option value="NONE">Đón tại bến / trạm dừng cố định trên tuyến (0 ₫)</option>
                  <option value="CUSTOM">Yêu cầu đón tận nơi tại địa chỉ riêng (Hãng xe báo giá phụ phí)</option>
                </select>
              </div>

              {pickupMode === 'CUSTOM' && (
                <div>
                  <label className="vx-field-label">Địa chỉ yêu cầu đón tận nơi</label>
                  <input
                    className="vx-input"
                    required
                    placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                  />
                </div>
              )}

              <button type="submit" className="vx-btn-primary" disabled={busy} style={{ marginTop: 6 }}>
                {busy ? 'Đang lưu thông tin hành khách...' : 'Xác nhận hành khách & Tiếp tục Thanh toán ➜'}
              </button>
            </div>
          </form>

          <aside className="vx-card" style={{ alignSelf: 'start' }}>
            <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Tóm tắt đơn giữ chỗ</h3>
            <div style={{ fontSize: 13.5, color: 'var(--gw-muted)', marginBottom: 12 }}>
              Mã đơn: <strong>{booking.booking_code}</strong> • Trạng thái: <span className="vx-badge vx-badge-green">{booking.status}</span>
            </div>

            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              {booking.items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--gw-green-light)',
                    border: '1px solid var(--gw-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>Phòng / Giường {it.trip_unit__unit_code}</strong>
                    <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
                      {it.adult_count} người lớn + {it.child_count} trẻ em
                    </div>
                  </div>
                  <strong style={{ color: 'var(--gw-green-dark)' }}>
                    {Number(it.unit_price).toLocaleString('vi-VN')} ₫
                  </strong>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Tổng tiền xác nhận từ Backend:</span>
              <span className="vx-price-big">{Number(booking.total_amount).toLocaleString('vi-VN')} ₫</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
