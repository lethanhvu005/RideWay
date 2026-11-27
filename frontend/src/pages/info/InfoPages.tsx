import { useState } from 'react';
import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div>
      <section className="rw-page-banner">
        <div className="vx-container">
          <span className="gw-hero-sub">Về chúng tôi (/gioi-thieu)</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 38px)', margin: '8px 0', color: '#fff' }}>
            Vé Xuyên Việt – RideWay: Nền tảng đặt vé xe đường dài & Du lịch đa dịch vụ
          </h1>
        </div>
      </section>

      <div className="vx-container">
        <div className="gw-split-2">
          <div className="vx-card">
            <h2 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Sứ mệnh & Kiến trúc công nghệ</h2>
            <p style={{ lineHeight: 1.75, color: 'var(--gw-text)' }}>
              <strong>Vé Xuyên Việt – RideWay</strong> được xây dựng nhằm giải quyết bài toán cốt lõi của vận tải hành khách đường dài Bắc – Trung – Nam: cho phép hành khách chọn chính xác vị trí phòng đôi Limousine (2 người lớn + 1 trẻ em) hoặc giường nằm 2 tầng theo từng đoạn chặng <code>[from_sequence, to_sequence)</code> mà không bị bán trùng chỗ.
            </p>
            <ul style={{ lineHeight: 1.9, paddingLeft: 18 }}>
              <li><strong>PostgreSQL ExclusionConstraint:</strong> Đảm bảo tính toàn vẹn tồn kho theo đoạn chặng.</li>
              <li><strong>Giữ chỗ nguyên tử 10 phút:</strong> Khóa đồng thời nhiều phòng cho cả gia đình theo nguyên tắc All-or-Nothing.</li>
              <li><strong>Thanh toán VNPay QR 100%:</strong> Đối chiếu chữ ký HMAC-SHA512 và phát hành vé điện tử QR tức thì.</li>
            </ul>
          </div>

          <div className="vx-card" style={{ background: 'var(--gw-green-light)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Bắt đầu hành trình của bạn</h3>
            <p style={{ color: 'var(--gw-muted)' }}>
              Khám phá các tuyến xe khách, Limousine 2 tầng, điểm đến du lịch và dịch vụ vận tải trên toàn quốc.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/xe-khach/tim-kiem" className="vx-btn-primary" style={{ textDecoration: 'none' }}>
                Tìm chuyến xe ngay ➜
              </Link>
              <Link to="/lien-he" className="vx-btn-outline" style={{ textDecoration: 'none' }}>
                Liên hệ hợp tác
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="vx-container">
      <div className="gw-split-2">
        <div className="vx-card">
          <span className="gw-sub-pill">Hỗ trợ hành khách & Đối tác (/lien-he)</span>
          <h1 style={{ margin: '6px 0 12px', fontSize: 28, color: 'var(--gw-dark)' }}>
            Liên hệ Tổng đài Vé Xuyên Việt – RideWay
          </h1>
          <p style={{ color: 'var(--gw-muted)', lineHeight: 1.7 }}>
            Đội ngũ chăm sóc khách hàng trực 24/7 để hỗ trợ tra cứu mã vé điện tử QR, điều phối đón trả tận nơi và giải đáp chính sách hoàn/hủy vé.
          </p>
          <div style={{ display: 'grid', gap: 12, marginTop: 18, fontSize: 14.5 }}>
            <div className="vx-card" style={{ background: 'var(--gw-green-light)' }}>
              <strong>📞 Hotline 24/7:</strong> 1900 6886
            </div>
            <div className="vx-card" style={{ background: 'var(--gw-green-light)' }}>
              <strong>✉️ Email hỗ trợ:</strong> hotro@vexuyenviet.vn
            </div>
            <div className="vx-card" style={{ background: 'var(--gw-green-light)' }}>
              <strong>📍 Văn phòng điều hành:</strong> 250 Nguyễn Văn Linh, Quận Thanh Khê, TP. Đà Nẵng
            </div>
          </div>
        </div>

        <form
          className="vx-card"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <h2 style={{ marginTop: 0, color: 'var(--gw-dark)' }}>Gửi yêu cầu hỗ trợ trực tuyến</h2>
          {sent ? (
            <div style={{ padding: 16, background: 'var(--gw-green-light)', borderRadius: 10, color: 'var(--gw-green-dark)', fontWeight: 700 }}>
              ✓ Đã ghi nhận yêu cầu hỗ trợ của bạn. Bộ phận CSKH RideWay sẽ phản hồi qua số điện thoại/email trong vòng 15 phút.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="vx-field-label">Họ và tên</label>
                <input className="vx-input" required placeholder="Nhập họ tên của bạn..." />
              </div>
              <div>
                <label className="vx-field-label">Số điện thoại / Email</label>
                <input className="vx-input" required placeholder="0901234567 hoặc email..." />
              </div>
              <div>
                <label className="vx-field-label">Mã đơn đặt vé (Nếu có)</label>
                <input className="vx-input" placeholder="VD: BK-..." />
              </div>
              <div>
                <label className="vx-field-label">Nội dung cần hỗ trợ</label>
                <textarea className="vx-input" rows={4} required placeholder="Nhập nội dung cần tư vấn..." />
              </div>
              <button type="submit" className="vx-btn-primary">
                Gửi yêu cầu hỗ trợ ➜
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="vx-container">
      <div className="vx-card">
        <span className="gw-sub-pill">Quy định sàn giao dịch (/dieu-khoan)</span>
        <h1 style={{ margin: '8px 0 14px', color: 'var(--gw-dark)' }}>
          Điều khoản sử dụng nền tảng Vé Xuyên Việt – RideWay
        </h1>
        <div style={{ lineHeight: 1.8, color: 'var(--gw-text)', fontSize: 14.5 }}>
          <h3>1. Quy định về giữ chỗ 10 phút</h3>
          <p>
            Khi hành khách chọn phòng đôi hoặc giường nằm trên sơ đồ 2 tầng và bấm Giữ chỗ, hệ thống sẽ cấp quyền khóa phân đoạn <code>[from_sequence, to_sequence)</code> trong thời hạn tối đa 10 phút. Nếu quá 10 phút chưa hoàn tất thanh toán, chỗ sẽ tự động được giải phóng cho hành khách khác.
          </p>
          <h3>2. Quy định về số lượng hành khách trong phòng đôi (CABIN)</h3>
          <p>
            Mỗi vị trí phòng đôi hoặc giường đơn có giới hạn số người lớn (<code>max_adults</code>) và trẻ em (<code>max_children</code>) theo cấu hình thực tế của nhà xe. Hành khách cần kê khai đầy đủ họ tên hành khách cho từng vị trí đặt.
          </p>
          <h3>3. Thanh toán và phát hành vé điện tử QR</h3>
          <p>
            Mọi đơn đặt vé trực tuyến đều thanh toán 100% giá trị qua cổng VNPay QR. Vé điện tử chỉ có giá trị lên xe khi ở trạng thái <code>ISSUED</code> và chỉ được quét Check-in một lần duy nhất (<code>USED</code>).
          </p>
        </div>
      </div>
    </div>
  );
}

export function PolicyPage() {
  return (
    <div className="vx-container">
      <div className="vx-card">
        <span className="gw-sub-pill">Chính sách & Bảo mật (/chinh-sach)</span>
        <h1 style={{ margin: '8px 0 14px', color: 'var(--gw-dark)' }}>
          Chính sách bảo mật, Hoàn tiền & Hủy/Đổi vé
        </h1>
        <div style={{ lineHeight: 1.8, color: 'var(--gw-text)', fontSize: 14.5 }}>
          <h3>1. Chính sách hủy vé và hoàn tiền theo phiên bản (PolicyVersion)</h3>
          <p>
            Mỗi yêu cầu hủy vé (<code>POST /api/v1/bookings/:id/cancellation-requests</code>) được đối chiếu minh bạch với <code>PolicyVersion</code> đang áp dụng của hãng xe hoặc sàn theo số giờ còn lại trước giờ khởi hành. Khi yêu cầu hủy được duyệt, hệ thống tự động chuyển phân bổ chỗ sang <code>RELEASED</code> để mở bán lại.
          </p>
          <h3>2. Bảo mật thông tin phiên & Xác thực</h3>
          <p>
            RideWay sử dụng cơ chế xác thực phiên bảo mật (HTTP-only Session Cookie kết hợp CSRF Token), không lưu trữ mật khẩu hay khóa bí mật trong <code>localStorage</code> của trình duyệt.
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="vx-container" style={{ textAlign: 'center', padding: '64px 16px' }}>
      <div className="vx-card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <span className="gw-sub-pill">Lỗi 404 — Không tìm thấy trang</span>
        <h1 style={{ fontSize: 32, margin: '10px 0', color: 'var(--gw-dark)' }}>
          Trang bạn truy cập không tồn tại
        </h1>
        <p style={{ color: 'var(--gw-muted)', marginBottom: 22 }}>
          Đường dẫn URL có thể đã thay đổi hoặc bị nhập sai. Bạn có thể quay về Trang chủ hoặc tìm chuyến xe trực tuyến.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="vx-btn-primary" style={{ textDecoration: 'none' }}>
            🏠 Về Trang chủ (/)
          </Link>
          <Link to="/xe-khach/tim-kiem" className="vx-btn-outline" style={{ textDecoration: 'none' }}>
            🚍 Tìm chuyến xe khách
          </Link>
        </div>
      </div>
    </div>
  );
}
