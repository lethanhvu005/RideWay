# 09 — HƯỚNG DẪN TRIỂN KHAI FRONTEND TRÊN VERCEL (VERCEL DEPLOYMENT)

**Dự án:** RideWay – Vé Xuyên Việt  
**Thư mục gốc Frontend:** `frontend/`

---

## 1. Cấu hình SPA Fallback / Rewrite (`frontend/vercel.json`)

Để đảm bảo người dùng có thể truy cập trực tiếp (Deep Link) hoặc nhấn `F5` tại bất kỳ route nào như `/xe-khach`, `/xe-khach/tim-kiem`, `/tin-tuc/:slug`, `/tai-khoan/don-hang`, `/doi-tac`, `/admin` mà không gặp lỗi `404 Not Found`, file `frontend/vercel.json` đã được thiết lập như sau:

```json
{
  "rewrites": [
    {
      "source": "/((?!api/|assets/|images/|favicon\\.ico|robots\\.txt).*)",
      "destination": "/index.html"
    }
  ]
}
```

- Các đường dẫn tài nguyên tĩnh (`/assets/*`, `/images/*`, `/favicon.ico`) và đường dẫn API (`/api/*`) được giữ nguyên, không bị rewrite nhầm sang `index.html`.

---

## 2. Biến Môi trường (Environment Variables) trên Vercel

Trong `frontend/src/api/client.ts`, hằng số `API_BASE` được cấu hình linh hoạt:

```ts
const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE = rawBase ? rawBase.replace(/\/+$/, '') : '/api/v1';
```

- **Khi chạy Local Development (`npm run dev`) hoặc Single-Container Docker (Django phục vụ SPA):** Không cần đặt `VITE_API_BASE_URL`, hệ thống tự động gọi `/api/v1` trên cùng origin (hoặc qua Vite proxy tới `http://127.0.0.1:8000`).
- **Khi triển khai Frontend trên Vercel tách riêng với Django Backend:**
  - Đặt biến môi trường trên Vercel Dashboard:
    - `VITE_API_BASE_URL = https://<ten-mien-backend-cua-ban>/api/v1`
  - Trên Django Backend (`settings.py`), cấu hình:
    - `DJANGO_ALLOWED_HOSTS` bao gồm domain Backend.
    - `CSRF_TRUSTED_ORIGINS` bao gồm `https://<project>.vercel.app`.
    - `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True` trên môi trường HTTPS.
