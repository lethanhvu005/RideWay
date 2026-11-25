import { useState } from 'react';
import { apiFetch } from '../api/client';
import { HoldTimer } from './HoldTimer';

export interface ActiveHoldBooking {
  booking_id: string;
  booking_code: string;
  status: string;
  hold_expires_at: string;
  total_amount: string;
  currency: string;
}

interface BookingDetailItem {
  id: string;
  trip_unit_id: string;
  trip_unit__unit_code: string;
  adult_count: number;
  child_count: number;
  unit_price: string;
}

interface Props {
  hold: ActiveHoldBooking;
  onClose: () => void;
  onSuccessIssued: () => void;
}

export function CheckoutFlowModal({ hold, onClose, onSuccessIssued }: Props) {
  const [step, setStep] = useState<'PASSENGERS' | 'QR_PAYMENT' | 'TICKET_DONE'>('PASSENGERS');
  const [contactPhone, setContactPhone] = useState('0901234567');
  const [pickupMode, setPickupMode] = useState<'NONE' | 'CUSTOM'>('NONE');
  const [customAddress, setCustomAddress] = useState('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [providerRef, setProviderRef] = useState<string>('');
  const [finalTotal, setFinalTotal] = useState<string>(hold.total_amount);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleSavePassengers = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrMsg(null);
    try {
      const detail = await apiFetch<{ items: BookingDetailItem[] }>(`/bookings/${hold.booking_id}`);
      const passengers: Array<{ client_ref: string; full_name: string; kind: string; contact_phone: string }> = [];
      const itemAssignments: Array<{ booking_item_id: string; passenger_refs: string[] }> = [];

      let pCounter = 1;
      for (const item of detail.items) {
        const refs: string[] = [];
        for (let a = 0; a < item.adult_count; a++) {
          const ref = `P${pCounter++}`;
          passengers.push({
            client_ref: ref,
            full_name: `Hành khách ${item.trip_unit__unit_code} - NL${a + 1}`,
            kind: 'ADULT',
            contact_phone: contactPhone,
          });
          refs.push(ref);
        }
        for (let c = 0; c < item.child_count; c++) {
          const ref = `P${pCounter++}`;
          passengers.push({
            client_ref: ref,
            full_name: `Hành khách ${item.trip_unit__unit_code} - TE${c + 1}`,
            kind: 'CHILD',
            contact_phone: contactPhone,
          });
          refs.push(ref);
        }
        itemAssignments.push({ booking_item_id: item.id, passenger_refs: refs });
      }

      const pickupRequests =
        pickupMode === 'CUSTOM' && customAddress.trim()
          ? [{ direction: 'PICKUP', kind: 'CUSTOM', requested_address: customAddress.trim() }]
          : [];

      const updated = await apiFetch<{ total_amount: string }>(
        `/bookings/${hold.booking_id}/passengers`,
        {
          method: 'PUT',
          body: JSON.stringify({
            passengers,
            item_assignments: itemAssignments,
            pickup_requests: pickupRequests,
          }),
        }
      );
      setFinalTotal(updated.total_amount);

      const intent = await apiFetch<{
        qr_payload: string;
        provider_reference: string;
        amount: string;
      }>(`/bookings/${hold.booking_id}/payment-intents`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setQrPayload(intent.qr_payload);
      setProviderRef(intent.provider_reference);
      setFinalTotal(intent.amount);
      setStep('QR_PAYMENT');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Lỗi cập nhật hành khách / tạo mã QR');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    setBusy(true);
    setErrMsg(null);
    try {
      const st = await apiFetch<{ booking_status: string; payment_status: string | null }>(
        `/bookings/${hold.booking_id}/payment-status`
      );
      if (st.booking_status === 'CONFIRMED' && st.payment_status === 'PAID') {
        setStep('TICKET_DONE');
        onSuccessIssued();
      } else {
        setErrMsg(
          `Trạng thái hiện tại từ Backend: Đơn = ${st.booking_status}, Thanh toán = ${st.payment_status ?? 'PENDING'}. (Lưu ý: Giao diện QR không tự xác nhận vé khi chưa có webhook VNPay hợp lệ).`
        );
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Không kiểm tra được trạng thái thanh toán');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vx-modal-backdrop">
      <div className="vx-modal checkout-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="vx-section-kicker">HOÀN TẤT HÀNH TRÌNH CỦA BẠN</div>
            <h2 style={{ margin: '4px 0 0', color: 'var(--vx-primary-darker)' }}>
              Đặt vé {hold.booking_code}
            </h2>
          </div>
          <button type="button" className="vx-btn-outline" onClick={onClose}>
            Đóng ✕
          </button>
        </div>

        <HoldTimer expiresAt={hold.hold_expires_at} />

        {/* Stepper Header */}
        <div className="checkout-steps" style={{ display: 'flex', gap: 8, margin: '16px 0', fontSize: 13, fontWeight: 700, flexWrap: 'wrap' }}>
          <span className="vx-badge vx-badge-green">① Chọn chuyến ✓</span>
          <span className="vx-badge vx-badge-green">② Giữ chỗ 10 phút ✓</span>
          <span className={`vx-badge ${step === 'PASSENGERS' ? 'vx-badge-amber' : 'vx-badge-green'}`}>
            ③ Hành khách & Đón/trả
          </span>
          <span className={`vx-badge ${step === 'QR_PAYMENT' ? 'vx-badge-amber' : step === 'TICKET_DONE' ? 'vx-badge-green' : 'vx-badge-gray'}`}>
            ④ Thanh toán VNPay QR 100%
          </span>
          <span className={`vx-badge ${step === 'TICKET_DONE' ? 'vx-badge-green' : 'vx-badge-gray'}`}>
            ⑤ Vé điện tử
          </span>
        </div>

        {errMsg && (
          <div style={{ padding: 12, background: '#fef2f2', color: 'var(--vx-danger)', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
            {errMsg}
          </div>
        )}

        {step === 'PASSENGERS' && (
          <form onSubmit={handleSavePassengers} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="vx-field-label">Số điện thoại liên hệ nhận vé</label>
              <input
                className="vx-input"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="vx-field-label">Hình thức đón / trả</label>
              <select
                className="vx-select"
                value={pickupMode}
                onChange={(e) => setPickupMode(e.target.value as 'NONE' | 'CUSTOM')}
              >
                <option value="NONE">Đón tại bến / điểm dừng cố định trên tuyến (0 đ)</option>
                <option value="CUSTOM">Đón tại địa chỉ riêng (hãng xe sẽ báo phụ phí)</option>
              </select>
            </div>

            {pickupMode === 'CUSTOM' && (
              <div>
                <label className="vx-field-label">Địa chỉ đón theo yêu cầu</label>
                <input
                  className="vx-input"
                  placeholder="Nhập số nhà, tên đường, quận/huyện..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div>
                Tổng thanh toán:{' '}
                <strong className="vx-price-big">{Number(finalTotal).toLocaleString('vi-VN')} đ</strong>
              </div>
              <button type="submit" className="vx-btn-primary" disabled={busy}>
                {busy ? 'Đang xử lý...' : 'Xác nhận & Tạo mã VNPay QR →'}
              </button>
            </div>
          </form>
        )}

        {step === 'QR_PAYMENT' && (
          <div style={{ textAlign: 'center', padding: 16, background: 'var(--vx-surface)', borderRadius: 14 }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--vx-primary-darker)' }}>
              Quét mã VNPay QR — Thanh toán 100% ({Number(finalTotal).toLocaleString('vi-VN')} đ)
            </h3>
            <p style={{ fontSize: 13, color: 'var(--vx-muted)', margin: '0 0 14px' }}>
              Mã tham chiếu VNPay: <strong>{providerRef}</strong> • Payload: <code>{qrPayload}</code>
            </p>
            <div
              style={{
                width: 180,
                height: 180,
                margin: '0 auto 16px',
                background: '#fff',
                border: '2px solid var(--vx-primary-dark)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: 'var(--vx-primary-dark)',
                padding: 12,
              }}
            >
              [VNPay QR 100%]
              <br />
              {hold.booking_code}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" className="vx-btn-primary" onClick={handleCheckPaymentStatus} disabled={busy}>
                {busy ? 'Đang đối chiếu...' : 'Kiểm tra thanh toán'}
              </button>
            </div>
          </div>
        )}

        {step === 'TICKET_DONE' && (
          <div style={{ padding: 20, background: 'var(--vx-surface)', borderRadius: 14, textAlign: 'center' }}>
            <h3 style={{ color: 'var(--vx-primary-dark)', margin: '0 0 8px' }}>
              ✓ Vé điện tử đã được phát hành!
            </h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              Bạn có thể tra cứu mã vé QR trong mục <strong>Vé của tôi</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
