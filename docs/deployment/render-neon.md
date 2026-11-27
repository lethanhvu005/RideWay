# RideWay: Render + Neon

## Kiến trúc

- Render Docker Web Service phục vụ React/Vite và Django trên cùng domain.
- Neon PostgreSQL lưu dữ liệu. Blueprint không tạo database trên Render.
- `autoDeployTrigger: commit`: tự deploy mỗi commit lên nhánh `main` sau khi Blueprint được liên kết với GitHub.
- Container chờ database sẵn sàng, chạy migrations rồi khởi động Gunicorn.
- `/api/v1/health/ready` kiểm tra kết nối database; `/api/v1/health/live` kiểm tra tiến trình.

## Thiết lập một lần

1. Trong Neon, tạo/chọn project và database dành riêng cho RideWay. Chọn region gần Singapore nếu có.
2. Trong **Connect**, tắt **Connection pooling** để lấy URL trực tiếp, giữ `sslmode=require` và `channel_binding=require` nếu có.
3. Render: **New → Blueprint**, liên kết GitHub và chọn `lethanhvu005/RideWay`, nhánh `main`.
4. Điền URL Neon vào biến bí mật `DATABASE_URL` khi Render yêu cầu. Không commit URL hoặc mật khẩu vào Git.
5. Apply Blueprint. Render tạo secret Django tự động và build Docker. Chỉ công bố URL khi trạng thái deploy là Live và health trả `ready`.

Nếu dùng URL pooled cho runtime, thêm `DATABASE_DIRECT_URL` (URL trực tiếp) vào Render Environment. Migrations dùng URL trực tiếp; Gunicorn vẫn dùng `DATABASE_URL`. Mặc định chỉ cần URL trực tiếp cho ứng dụng nhỏ.

Đây là database mới: migrations chỉ tạo cấu trúc, không đưa tài khoản hoặc dữ liệu demo lên mạng. Tạo tài khoản khách qua giao diện. Không chạy `seed_demo_data` trên database public vì có tài khoản demo cố định. Dùng tài khoản quản trị và dữ liệu nhà xe thật khi cấu hình vận hành.

## Các biến môi trường

| Biến | Cấu hình |
| --- | --- |
| DATABASE_URL | URL Neon; nhập riêng trong Render |
| DATABASE_DIRECT_URL | Tùy chọn: URL trực tiếp khi runtime dùng pooler |
| DJANGO_SECRET_KEY | Render tự sinh |
| DJANGO_DEBUG | False |
| DJANGO_SESSION_SECURE / DJANGO_CSRF_SECURE | True |
| DJANGO_SECURE_SSL_REDIRECT | True |
| DJANGO_ALLOWED_HOSTS | Thêm domain riêng nếu dùng; domain Render tự nhận |
| DJANGO_CSRF_TRUSTED_ORIGINS | Origin HTTPS của domain riêng, phân cách bằng dấu phẩy |

Email và VNPay cần thông tin nhà cung cấp thật trước khi dùng đầy đủ các luồng gửi mail/thanh toán. Đặt `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` và cấu hình callback/IPN theo tài khoản VNPay của dự án. Các giá trị sandbox mặc định không xác nhận giao dịch thật.

Render Free có thể ngủ khi không có truy cập; lần mở đầu có thể chậm. Blueprint không cấp tài nguyên trả phí.

## Kiểm tra

```powershell
.\venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\venv\Scripts\python.exe backend/manage.py check
npm --prefix frontend run build
docker build -t rideway .
```

Không dùng `runserver` để phục vụ production. Docker dùng Gunicorn và WhiteNoise; `/api`, `/static`, `/assets`, `/images` không bị chuyển nhầm sang trang HTML của SPA.

Tài liệu: https://render.com/docs/blueprint-spec và https://neon.com/docs/connect/connection-pooling
