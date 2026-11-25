import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch } from '../api/client';

interface Props { onClose: () => void; onSuccess: () => void }

export function AuthDialog({ onClose, onSuccess }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const register = mode === 'register';

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (register && password !== confirmation) {
      setError('Mật khẩu xác nhận chưa khớp. Vui lòng kiểm tra lại.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify({ email: email.trim(), password, ...(register ? { full_name: fullName.trim() } : {}) }),
      });
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.includes('Invalid email') ? 'Email hoặc mật khẩu chưa đúng. Vui lòng thử lại.'
        : message.includes('already registered') ? 'Email này đã được đăng ký. Bạn có thể chuyển sang đăng nhập.'
        : 'Chưa thể kết nối hoặc xử lý yêu cầu. Vui lòng thử lại sau.');
    } finally { setBusy(false); }
  }

  return (
    <dialog ref={dialog} className="account-dialog" aria-labelledby="account-title" onCancel={onClose}>
      <div className="account-layout">
        <aside className="account-scenery">
          <span className="account-brand">Vé<span>XuyênViệt</span></span>
          <div><span className="account-kicker">Mỗi chuyến đi, một câu chuyện</span><h2>Hành trình đẹp<br />bắt đầu từ đây.</h2><p>Khám phá những cung đường mới, lưu giữ những khoảnh khắc đáng nhớ.</p></div>
          <span className="account-caption">Đồng hành cùng bạn trên khắp Việt Nam</span>
        </aside>
        <div className="account-content">
          <button type="button" className="account-close" aria-label="Đóng đăng nhập" onClick={onClose}>✕</button>
          <span className="account-kicker">Chào mừng đến với Vé Xuyên Việt</span>
          <h2 id="account-title">{register ? 'Tạo tài khoản mới' : 'Chào mừng bạn trở lại!'}</h2>
          <p className="account-intro">{register ? 'Một tài khoản cho mọi hành trình của bạn.' : 'Đăng nhập để đặt vé và quản lý chuyến đi thật dễ dàng.'}</p>
          <div className="account-switch" aria-label="Chọn hình thức tài khoản">
            {(['login', 'register'] as const).map(item => <button type="button" key={item} aria-pressed={mode === item} disabled={busy} onClick={() => { setMode(item); setError(''); setPassword(''); setConfirmation(''); }}>{item === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>)}
          </div>
          <form onSubmit={submit} className="account-form" aria-busy={busy}>
            {register && <div><label htmlFor="account-name">Họ và tên</label><input id="account-name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={150} placeholder="Tên của bạn" disabled={busy} /></div>}
            <div><label htmlFor="account-email">Địa chỉ email</label><input id="account-email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ban@example.com" disabled={busy} /></div>
            <div><label htmlFor="account-password">Mật khẩu</label><div className="account-password"><input id="account-password" autoComplete={register ? 'new-password' : 'current-password'} type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={register ? 8 : undefined} placeholder={register ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu của bạn'} disabled={busy} /><button type="button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Ẩn' : 'Hiện'}</button></div></div>
            {register && <div><label htmlFor="account-confirm">Xác nhận mật khẩu</label><input id="account-confirm" autoComplete="new-password" type={visible ? 'text' : 'password'} value={confirmation} onChange={e => setConfirmation(e.target.value)} required placeholder="Nhập lại mật khẩu" disabled={busy} /></div>}
            {error && <p className="account-error" role="alert">{error}</p>}
            <button className="account-submit" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
          </form>
          <p className="account-note">Chọn chuyến phù hợp · Đặt chỗ thuận tiện · Nhận vé điện tử</p>
        </div>
      </div>
    </dialog>
  );
}
