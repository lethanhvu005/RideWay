import { useEffect, useState } from 'react';

interface Props {
  expiresAt: string;
  onExpired?: () => void;
}

export function HoldTimer({ expiresAt, onExpired }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0 && onExpired) {
        onExpired();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpired]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div
      role="status"
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: secondsLeft === 0 ? '#fee2e2' : 'var(--vx-surface)',
        color: secondsLeft === 0 ? 'var(--vx-danger)' : 'var(--vx-primary-dark)',
        fontWeight: 600,
      }}
    >
      {secondsLeft === 0 ? 'Đã hết thời gian giữ chỗ 10 phút' : `Thời gian giữ chỗ còn lại: ${mins}:${secs}`}
    </div>
  );
}
