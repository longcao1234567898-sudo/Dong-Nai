# Du lịch Đồng Nai

Trang du lịch thành phố Đồng Nai cho hai nhóm người dùng:

- **Người dân, du khách** (không cần đăng nhập): bản đồ điểm đến, lịch trình gợi ý, đánh giá theo 4 tiêu chí, thống kê lượt khách.
- **Cán bộ** (đăng nhập riêng): quản lý địa điểm và đánh giá, **phụ lục thống kê** theo xã/phường và kỳ báo cáo — nhập tay hoặc nhập Excel, chốt báo cáo, xuất phụ lục đúng mẫu ra Word/Excel, biểu đồ thống kê.

Cùng kiến trúc với Điểm Chạm An Ninh — giao diện React + TypeScript + Vite (Netlify), máy chủ Node.js + Express (Render), cơ sở dữ liệu MySQL 8. Phần đăng nhập cán bộ dùng lại nguyên bản đã kiểm chứng: bcrypt, JWT, đếm sai theo tài khoản, sai 3 lần bật Cloudflare Turnstile, giới hạn 5 lần trong 15 phút.

> Tên gọi đúng là **thành phố Đồng Nai**: theo Nghị quyết 30/2026/QH16, từ 30/4/2026 Đồng Nai là thành phố trực thuộc Trung ương.

## Cài đặt lần đầu

**1. Cơ sở dữ liệu.** Mở HeidiSQL, dán toàn bộ `database/du_lich_dong_nai.sql`, nhấn F9. Tệp tạo các bảng, nạp sẵn 15 điểm đến, 9 xã/phường có điểm du lịch và 2 kỳ báo cáo mẫu.

**Nâng cấp khi kho mã có phiên bản mới:** dán lại toàn bộ tệp đó rồi F9 là xong. Mọi lệnh đều "nếu chưa có thì tạo", chạy lại không mất số liệu. Máy chủ khi khởi động sẽ cảnh báo nếu cơ sở dữ liệu còn thiếu bảng.

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
node scripts-them-can-bo.js lan.tt Suoi-Mo#2026-Ta "Trần Thị Lan"
node scripts-them-can-bo.js --danh-sach
```

**Một quyền duy nhất:** mọi tài khoản cán bộ làm được tất cả — không phân quản trị viên, chỉ huy, cán bộ; không giới hạn theo xã. Bù lại, mọi thao tác đều ghi nhật ký (ai, lúc nào, từ IP nào) và mọi thay đổi số liệu phụ lục đều lưu lịch sử giá trị cũ → mới.

Mật khẩu ít nhất 12 ký tự, đủ chữ thường, chữ HOA, chữ số và ký tự đặc biệt. Tạo tài khoản chỉ làm được bằng lệnh trên máy chủ, không làm được trên web: kẻ gian chiếm được một phiên đăng nhập cũng không tự tạo được tài khoản cửa sau. Khoá, mở khoá, gỡ tạm khoá thì làm ngay trên web.

**4. Giao diện.**

```
npm install
cp .env.example .env            # để trống VITE_API_URL khi chạy trên máy
npm run dev                     # /api tự chuyển sang máy chủ cổng 4000
```

## Triển khai

**Render (máy chủ):** tạo Web Service từ kho GitHub, Render đọc sẵn `render.yaml`. Khai các biến trong mục Environment theo `server/.env.example`.

**Netlify (giao diện):** nối kho GitHub, Netlify đọc sẵn `netlify.toml`. Khai `VITE_API_URL` là địa chỉ Render, rồi *Clear cache and deploy site*.

Sau khi có địa chỉ Netlify, quay lại Render khai `CORS_ORIGIN` bằng địa chỉ đó.

**Lưu ý về cookie đăng nhập:** giao diện và máy chủ nên dùng chung một tên miền gốc (ví dụ `dulichdongnai.vn` và `api.dulichdongnai.vn`). Để giao diện ở `netlify.app` và máy chủ ở `onrender.com` thì phiên đăng nhập không tự gia hạn được khi tải lại trang.

## Phụ lục thống kê (khu cán bộ)

Báo cáo theo **xã/phường** và theo **kỳ** (cả năm, 6 tháng…), đúng cấu trúc bản phụ lục thống kê.

| Mục | Dùng để |
|---|---|
| Báo cáo kỳ | Xem xã/phường nào đã nhập đủ, **chốt** báo cáo, **mở lại** (phải ghi lý do), **khoá kỳ**, tạo kỳ mới, đặt hạn nộp, **xuất phụ lục ra Word/Excel** |
| Thống kê | Biểu đồ khách theo xã, so sánh hai kỳ, dự án theo tình trạng và quốc gia, resort theo hạng sao, cảnh báo số liệu bất thường |
| Bảng 1, 2, 3… | Nhập, sửa, xoá (khôi phục được), xem lịch sử từng dòng, tải tệp mẫu Excel, nhập từ Excel |
| Xã/phường | Thêm nhiều xã/phường một lần (dán danh sách), đổi tên, ẩn |

Các bảng hiện có: 1. Hiện trạng khách du lịch · 2. Dự án đầu tư du lịch · 3. Resort, khu nghỉ dưỡng.

**Máy kiểm tra thay người.** Tổng số khách luôn do máy cộng (bản giấy từng cộng sai). Ô số đọc được mọi kiểu ghi: `250.000`, `1.854,4 tỷ đồng`, `0,513 tỉ`, `9450 lượt`, `16.305,40m2` (tự đổi ra ha); còn chữ giải thích như `Tổng mức đầu tư 49 tỷ đồng.` thì báo lỗi và chỉ sang cột ghi chú. STT do máy đánh khi xuất nên không bao giờ trùng. Xã không có dòng nào ghi rõ "Không phát sinh" (đã xác nhận) hay "Chưa có số liệu" — không còn lẫn "0", "Không", ô trống.

**Nhập Excel hai bước.** Chọn tệp → máy kiểm tra từng dòng, báo lỗi đúng số dòng trong Excel, chưa lưu gì → hết lỗi mới bấm Lưu. Còn một dòng lỗi là không lưu dòng nào. Cột được khớp theo tên nên thêm cột STT hay đảo cột vẫn đọc được. Nhập lại tệp đã sửa thì **cập nhật** dòng cũ (cùng xã, cùng tên), không thêm trùng.

**Chốt chặn.** Kỳ đã khoá: không ai sửa được số liệu kỳ đó. Xã đã chốt: muốn sửa phải "mở lại" kèm lý do. Danh mục dự án, resort thì sửa lúc nào cũng được — mọi thay đổi vẫn lưu lịch sử.

**Thêm cột hay thêm bảng:** khai trong `server/src/lib/phu-luc.js` (một chỗ duy nhất — biểu mẫu, kiểm tra, tệp mẫu, tệp xuất tự theo) và thêm cột/bảng tương ứng trong `database/du_lich_dong_nai.sql`.

## Bảo vệ đánh giá khỏi phá hoại

Mỗi thiết bị chỉ một đánh giá cho mỗi điểm — gửi lại là sửa bài cũ. Mỗi địa chỉ IP gửi tối đa 10 lần mỗi giờ. Khi khai khoá Turnstile thì mọi lần gửi phải qua ô xác minh. Mã thiết bị và IP chỉ lưu dạng băm có `HASH_PEPPER`. Cán bộ ẩn được đánh giá vi phạm — ẩn chứ không xoá, để còn đối chiếu khi có khiếu nại.

## Kiểm thử

```
cd server && npm test     # 35 bài, không cần MySQL
npx tsc --noEmit          # ở thư mục gốc
```
