# Du lịch Đồng Nai

Trang quảng bá du lịch thành phố Đồng Nai: bản đồ điểm đến, đánh giá của du khách theo 4 tiêu chí, thống kê lượt khách, và khu quản trị cho cán bộ.

Cùng kiến trúc với Điểm Chạm An Ninh — giao diện React + TypeScript + Vite (Netlify), máy chủ Node.js + Express (Render), cơ sở dữ liệu MySQL 8. Phần đăng nhập cán bộ dùng lại nguyên bản đã kiểm chứng: bcrypt, JWT, đếm sai theo tài khoản, sai 3 lần bật Cloudflare Turnstile, giới hạn 5 lần trong 15 phút.

> Tên gọi đúng là **thành phố Đồng Nai**: theo Nghị quyết 30/2026/QH16, từ 30/4/2026 Đồng Nai là thành phố trực thuộc Trung ương.

## Cài đặt lần đầu

**1. Cơ sở dữ liệu.** Mở HeidiSQL, dán toàn bộ `database/du_lich_dong_nai.sql`, nhấn F9. Tệp tạo 6 bảng và nạp sẵn 15 điểm đến.

**2. Máy chủ.**

```
cd server
npm install
cp .env.example .env
node scripts-tao-khoa.js        # chép hai khoá in ra vào .env
node scripts-kiem-ket-noi.js    # phải thấy NỐI THÀNH CÔNG
npm run dev
```

**3. Tạo tài khoản cán bộ.** Không có tài khoản mặc định. Tạo bằng lệnh trên máy chủ:

```
node scripts-them-can-bo.js quantri Tri-An#2026-Ho "Nguyễn Văn Quản" admin
node scripts-them-can-bo.js lan.tt Suoi-Mo#2026-Ta "Trần Thị Lan" handler
```

Vai trò: `admin` (quản trị viên), `manager` (chỉ huy), `handler` (cán bộ nhập liệu). Mật khẩu ít nhất 12 ký tự, đủ chữ thường, chữ HOA, chữ số và ký tự đặc biệt.

Tạo tài khoản chỉ làm được trên máy chủ, không làm được trên web: kẻ gian chiếm được một phiên đăng nhập cũng không tự tạo được tài khoản cửa sau. Khoá, mở khoá, gỡ tạm khoá thì quản trị viên làm ngay trên web.

**4. Giao diện.**

```
npm install
cp .env.example .env            # để trống VITE_API_URL khi chạy trên máy
npm run dev
```

## Triển khai

**Render (máy chủ):** tạo Web Service từ kho GitHub, Render đọc sẵn `render.yaml`. Khai các biến trong mục Environment theo `server/.env.example`.

**Netlify (giao diện):** nối kho GitHub, Netlify đọc sẵn `netlify.toml`. Khai `VITE_API_URL` là địa chỉ Render, rồi *Clear cache and deploy site*.

Sau khi có địa chỉ Netlify, quay lại Render khai `CORS_ORIGIN` bằng địa chỉ đó.

**Lưu ý về cookie đăng nhập:** giao diện và máy chủ nên dùng chung một tên miền gốc (ví dụ `dulichdongnai.vn` và `api.dulichdongnai.vn`). Để giao diện ở `netlify.app` và máy chủ ở `onrender.com` thì phiên đăng nhập không tự gia hạn được khi tải lại trang.

## Bảo vệ đánh giá khỏi phá hoại

M��i thiết bị chỉ một đánh giá cho mỗi điểm — gửi lại là sửa bài cũ. Mỗi địa chỉ IP gửi tối đa 10 lần mỗi giờ. Khi khai khoá Turnstile thì mọi lần gửi phải qua ô xác minh. Mã thiết bị và IP chỉ lưu dạng băm có `HASH_PEPPER`. Chỉ huy ẩn được đánh giá vi phạm — ẩn chứ không xoá, để còn đối chiếu khi có khiếu nại.

## Kiểm thử

```
cd server && npm test     # 15 bài, không cần MySQL
npx tsc --noEmit          # ở thư mục gốc
```
"# Dong-Nai" 
