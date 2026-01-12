# VPS trên Render (Github)

Dự án này giúp bạn tạo một môi trường Linux (VPS) chạy trên Render miễn phí, với giao diện dòng lệnh (Terminal) truy cập trực tiếp qua trình duyệt web.

## Cách cài đặt

1. **Fork/Clone Repo này:**
   - Nếu bạn chưa có, hãy Fork repository này về tài khoản GitHub của bạn.

2. **Đăng ký/Đăng nhập Render:**
   - Truy cập [https://render.com](https://render.com) và đăng nhập bằng tài khoản GitHub.

3. **Tạo Web Service mới:**
   - Chọn **New +** -> **Web Service**.
   - Chọn repository này từ danh sách kết nối GitHub.

4. **Cấu hình:**
   - **Name:** Đặt tên tùy ý (ví dụ: `my-vps`).
   - **Region:** Chọn khu vực gần bạn nhất (ví dụ: Singapore).
   - **Runtime:** Chọn **Docker**.
   - **Instance Type:** Chọn **Free**.

5. **Deploy:**
   - Nhấn **Create Web Service**.
   - Render sẽ bắt đầu build Docker image. Quá trình này mất khoảng 2-5 phút.

## Cách sử dụng

Sau khi Deploy thành công, Render sẽ cung cấp một đường dẫn (URL) dạng `https://my-vps.onrender.com`.

- Truy cập đường dẫn đó trên trình duyệt.
- Bạn sẽ thấy một màn hình đen với dòng lệnh Linux (`bash`).
- Bạn có thể gõ lệnh như một VPS bình thường (ví dụ: `htop`, `git clone`, `python3 script.py`).

## Lưu ý quan trọng (Treo 24/7)

Gói **Free** của Render sẽ tự động tắt (spin down) nếu không có truy cập sau 15 phút. Để giữ cho nó chạy 24/7:

1. Dùng một dịch vụ "Uptime Monitor" miễn phí (như UptimeRobot, cron-job.org).
2. Tạo một monitor ping đến URL của bạn (ví dụ: `https://my-vps.onrender.com`) mỗi 5-10 phút.
3. Việc này sẽ giữ cho Web Service luôn ở trạng thái "Active".

⚠️ **Cảnh báo:** Không sử dụng VPS này cho các mục đích đào coin (mining), tấn công DDOS hoặc các hoạt động vi phạm chính sách của Render. Tài khoản của bạn có thể bị khóa.
