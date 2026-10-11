# Du lịch Đồng Nai

Trang du lịch thành phố Đồng Nai cho hai nhóm người dùng:

- **Người dân, du khách** (không cần đăng nhập, có tiếng Anh): bản đồ điểm đến, trang riêng từng địa điểm có ảnh, lộ trình gợi ý và tự tạo lộ trình, đánh giá theo 4 tiêu chí, gửi phản ánh, resort đạt chuẩn, tin tức – cảnh báo – số điện thoại cần biết, hướng dẫn cho khách nước ngoài, thống kê.
- **Cán bộ** (đăng nhập riêng): quản lý địa điểm và đánh giá, **phụ lục thống kê** theo xã/phường và kỳ báo cáo — nhập tay hoặc nhập Excel, chốt báo cáo, xuất phụ lục đúng mẫu ra Word/Excel, biểu đồ thống kê.

Cùng kiến trúc với Điểm Chạm An Ninh — giao diện React + TypeScript + Vite (Netlify), máy chủ Node.js + Express (Render), cơ sở dữ liệu MySQL 8. Phần đăng nhập cán bộ dùng lại nguyên bản đã kiểm chứng: bcrypt, JWT, đếm sai theo tài khoản, giới hạn 5 lần trong 15 phút; chống người máy bằng Cloudflare Turnstile ở cổng vào (xem mục Chống người máy).

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
node scripts-them-can-bo.js --tat-2fa lan.tt     # cán bộ mất điện thoại
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

**Netlify (giao diện):** nối kho GitHub, Netlify đọc sẵn `netlify.toml` — trong đó đã khai sẵn `VITE_API_URL` (https://dong-nai.onrender.com) và `VITE_TURNSTILE_SITE_KEY`, không phải khai trên Netlify. Đổi địa chỉ máy chủ hay khoá thì sửa `netlify.toml` rồi đẩy lên.

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

Các bảng hiện có:

| Bảng | Nội dung | Loại |
|---|---|---|
| 1 | Hiện trạng khách du lịch (quốc tế, nội địa; tổng máy tự cộng) | theo kỳ |
| 2 | Dự án đầu tư du lịch (vốn tỷ đồng, diện tích, tình trạng) | danh mục |
| 3 | Resort, khu nghỉ dưỡng (hạng sao) | danh mục |
| 4 | Vụ việc phức tạp về an ninh, trật tự 🔒 | danh mục |
| 5 | Văn bản phối hợp lực lượng | danh mục |
| 6 | Vận động quần chúng, mô hình phong trào toàn dân | theo kỳ |
| 7 / 7a | Đội ngũ cán bộ công an xã (theo tổ; máy kiểm chức vụ, trình độ, chuyên môn, độ tuổi cộng lại đúng số lượng) / Tổng quân số 🔒 | theo kỳ |
| 8 | Dân cư, dân tộc, tôn giáo 🔒 | theo kỳ |
| 9 | Vi phạm pháp luật của khách nước ngoài (mỗi vụ một dòng, có quốc tịch) 🔒 | danh mục có ngày |
| 10 | Vi phạm xuất nhập cảnh theo quốc tịch — **máy tự tổng hợp từ bảng 9**, không nhập lại 🔒 | tự tính |

🔒 = thông tin nhạy cảm: không đường dẫn công khai nào đọc tới; mỗi lần cán bộ xem hay xuất đều ghi nhật ký; tệp xuất ghi "có thông tin nhạy cảm, không phát tán". Dòng chữ này chỉ là lời nhắc — đóng dấu mật theo quy định là việc của cơ quan, hệ thống không tự phân loại bí mật nhà nước. **Trước khi nhập số liệu thật của các bảng 🔒 lên máy chủ thuê ngoài (Render, Aiven…), xin ý kiến bộ phận phụ trách bảo mật của đơn vị.**

**Máy kiểm tra thay người.** Tổng số khách luôn do máy cộng (bản giấy từng cộng sai). Ô số đọc được mọi kiểu ghi: `250.000`, `1.854,4 tỷ đồng`, `0,513 tỉ`, `9450 lượt`, `16.305,40m2` (tự đổi ra ha); còn chữ giải thích như `Tổng mức đầu tư 49 tỷ đồng.` thì báo lỗi và chỉ sang cột ghi chú. STT do máy đánh khi xuất nên không bao giờ trùng. Xã không có dòng nào ghi rõ "Không phát sinh" (đã xác nhận) hay "Chưa có số liệu" — không còn lẫn "0", "Không", ô trống.

**Nhập Excel hai bước.** Chọn tệp → máy kiểm tra từng dòng, báo lỗi đúng số dòng trong Excel, chưa lưu gì → hết lỗi mới bấm Lưu. Còn một dòng lỗi là không lưu dòng nào. Cột được khớp theo tên nên thêm cột STT hay đảo cột vẫn đọc được. Nhập lại tệp đã sửa thì **cập nhật** dòng cũ (cùng xã, cùng tên), không thêm trùng.

**Chốt chặn.** Kỳ đã khoá: không ai sửa được số liệu kỳ đó. Xã đã chốt: muốn sửa phải "mở lại" kèm lý do. Danh mục dự án, resort thì sửa lúc nào cũng được — mọi thay đổi vẫn lưu lịch sử.

**Thêm cột hay thêm bảng:** khai trong `server/src/lib/phu-luc.js` (một chỗ duy nhất — biểu mẫu, kiểm tra, tệp mẫu, tệp xuất tự theo) và thêm cột/bảng tương ứng trong `database/du_lich_dong_nai.sql`.

## Phía người dân

| Trang | Nội dung |
|---|---|
| `/` Khám phá | Bản đồ, điểm nổi bật (có ảnh), chủ đề, lộ trình gợi ý, xếp hạng; dải **cảnh báo** màu vàng khi cán bộ đăng; sự kiện; **số điện thoại cần biết** |
| `/dia-diem/:id` | Trang riêng một địa điểm (chia sẻ được): ảnh lớn, bản đồ, chỉ đường, đánh giá, nút phản ánh |
| `/lo-trinh`, `/lo-trinh/:id` | Lộ trình cán bộ soạn: bản đồ tuyến, chia theo ngày, quãng đường ước tính, **mở chỉ đường cả tuyến trên Google Maps** |
| `/tu-tao-lo-trinh` | Người dân tự chọn điểm, sắp thứ tự, gửi đường dẫn cho bạn đồng hành (thứ tự nằm ngay trong đường dẫn, không cần tài khoản) |
| `/phan-anh` | Gửi phản ánh (chặt chém, mất an ninh, mất vệ sinh, nguy hiểm…). **Không có tra cứu kết quả**: người gửi nhận lời cảm ơn; ai để lại số liên hệ thì cán bộ gọi lại khi cần. Số liên hệ chỉ cán bộ thấy |
| `/luu-tru` | Resort, khu nghỉ dưỡng cán bộ cho hiện (bảng 3): tên, địa chỉ, hạng sao — **không bao giờ hiện tên chủ cơ sở** |
| `/tin-tuc` | Cảnh báo, sự kiện, thông báo, số điện thoại; hết ngày kết thúc thì tự ẩn |
| `/khach-quoc-te` | Hướng dẫn khai báo tạm trú, thời hạn lưu trú, khu vực biên giới, giấy tờ, tránh bị nâng giá |
| `/thong-ke` | Lượt khách, đánh giá; thêm biểu đồ khách theo xã/phường — **chỉ số liệu các xã đã chốt báo cáo** |

**Tiếng Anh:** nút EN/VI ở đầu trang. Tên, giới thiệu địa điểm, lộ trình, tin tức có ô tiếng Anh riêng trong khu cán bộ; ô trống thì hiện tiếng Việt. Đã nạp sẵn tên và giới thiệu tiếng Anh cho 15 điểm đến.

**Cán bộ quản lý** ở nhóm *Người dân* trong khu quản trị: Phản ánh (xử lý, giao về xã, ghi kết quả xử lý nội bộ — bắt buộc khi đóng phản ánh; số hiệu 8 ký tự để cán bộ đối chiếu), Lộ trình, Tin tức – cảnh báo. Ảnh địa điểm thêm ở mục Địa điểm → Sửa: tối đa 8 ảnh mỗi điểm, ảnh tự thu nhỏ trên trình duyệt (cạnh dài 1600px) trước khi tải lên, chỉnh được ngay tại chỗ (xoay, điểm lấy nét, thay ảnh, đặt ảnh đại diện), lưu trong cơ sở dữ liệu (Render không có ổ đĩa lưu tệp lâu dài). Đánh giá bị du khách bấm *Báo vi phạm* nổi lên đầu mục Đánh giá.

**Giao diện:** trang chủ mở bằng trình chiếu ảnh thật các điểm nổi bật (có nút tạm dừng); thẻ, trang địa điểm, lộ trình dùng ảnh thật. Thiết kế và các quyết định: [`docs/THIET-KE-GIAO-DIEN.md`](docs/THIET-KE-GIAO-DIEN.md). Xem thử bố cục khi có đánh giá: chạy `npm run dev` rồi mở `/?minh-hoa=1` (dữ liệu minh hoạ chỉ có ở máy phát triển, không vào bản build).

**Ảnh địa điểm:** ảnh cán bộ tải lên (Quản trị → Địa điểm → Sửa) luôn hiện trước. Ở đó có nút **Tìm ảnh trên Wikimedia**: gõ tên điểm, xem ảnh (chỉ hiện ảnh CC0 hoặc phạm vi công cộng, dùng tự do không phải ghi tác giả), bấm *Dùng ảnh này* là ảnh được thu nhỏ và lưu như ảnh tự tải lên. Mỗi ảnh có nút **Chỉnh**: xoay trái/phải, bấm vào phần quan trọng nhất của ảnh để đặt *điểm lấy nét* (ảnh bị cắt vừa thẻ, ảnh đầu trang hay màn điện thoại vẫn giữ phần đó, có khung xem trước từng kiểu cắt), hoặc thay bằng ảnh khác mà vẫn giữ chú thích và thứ tự. Nút ngôi sao đặt ảnh làm ảnh đại diện. Điểm đang dùng ảnh mặc định thì bấm *Đưa vào danh sách* để chép ảnh mặc định sang và chỉnh như ảnh tự tải. Chưa có thì dùng ảnh mặc định trong `public/anh/dia-diem/`, lấy từ Wikimedia Commons bằng `node scripts/tai-anh-dia-diem.mjs goi-y` (xem ứng viên, chép tên tệp vào `scripts/anh-dia-diem.json`) rồi `node scripts/tai-anh-dia-diem.mjs tai`. Script chỉ nhận ảnh CC0 hoặc phạm vi công cộng, vì trang người dân không hiện tác giả; nguồn từng ảnh xem ở Quản trị → Nguồn ảnh.

**Cập nhật mã lên bản mới thì dán lại toàn bộ `database/du_lich_dong_nai.sql`** (chạy lại không mất số liệu): bản này thêm cột vùng du lịch cho địa điểm, cột phương tiện cho lộ trình và cột điểm lấy nét cho ảnh. Thiếu cột thì máy chủ báo ngay lúc khởi động.

## Bảo mật tài khoản

- **Xác thực hai lớp (tự nguyện):** mỗi cán bộ tự bật ở mục *Tài khoản của tôi* — quét mã QR bằng Google Authenticator hoặc Microsoft Authenticator. Từ đó đăng nhập cần cả mật khẩu và mã 6 số; mã đã dùng không dùng lại được. Mất điện thoại: đồng nghiệp bấm *Tắt hai lớp* ở mục Tài khoản cán bộ (ghi nhật ký), hoặc chạy `node scripts-them-can-bo.js --tat-2fa <tên>`.
- **Tự đổi mật khẩu** ở *Tài khoản của tôi*; đổi xong mọi phiên ở máy khác bị đăng xuất.
- **Chống dò mật khẩu:** tối đa 5 lần đăng nhập **sai** mỗi 15 phút mỗi địa chỉ IP (lần đúng không bị đếm, nên nhiều cán bộ dùng chung mạng trụ sở không bị chặn nhau). Tài khoản bị gõ sai từ 3 lần thì phải qua lại cổng kiểm tra chống người máy (vé phải mới trong 10 phút) — không khoá tài khoản, để kẻ xấu không cố ý gõ sai mà khoá được cán bộ thật.
- **Sao lưu mã hoá:** khai `KHOA_SAO_LUU` trong `server/.env` thì `node scripts-sao-luu.js` ra tệp `.sql.mahoa` (AES-256-GCM). Mở lại: `node scripts-giai-ma-sao-luu.js sao-luu/<tệp>.sql.mahoa`. Ghi khoá ra giấy cất riêng — mất khoá là không mở được.

## Bảo vệ đánh giá khỏi phá hoại

Mỗi thiết bị chỉ một đánh giá cho mỗi điểm — gửi lại là sửa bài cũ. Mỗi địa chỉ IP gửi tối đa 10 lần mỗi giờ. Khi khai khoá Turnstile thì mọi lần gửi phải có vé xác minh lấy ở cổng vào. Mã thiết bị và IP chỉ lưu dạng băm có `HASH_PEPPER`. Cán bộ ẩn được đánh giá vi phạm — ẩn chứ không xoá, để còn đối chiếu khi có khiếu nại.

## Chống người máy (Cloudflare Turnstile)

Ô kiểm tra "không phải người máy" chỉ có **một chỗ: cổng vào**, hiện ngay khi mở trang (cả trang du khách lẫn trang đăng nhập cán bộ). Thường tự xong sau vài giây, không phải bấm gì. Qua cổng thì máy chủ cấp **vé 12 giờ** có chữ ký, gắn với địa chỉ IP (IPv6 tính theo dải /64). Đánh giá, phản ánh, báo vi phạm và đăng nhập không còn ô tích riêng: máy chủ chỉ kiểm vé. Vé hết hạn hoặc người dùng đổi mạng thì cổng hiện lại đè lên trang, nội dung đã gõ vẫn giữ, xong bấm gửi lại.

Cần khai **cặp khoá cùng một tài khoản Cloudflare**: `TURNSTILE_SECRET_KEY` trên Render và `VITE_TURNSTILE_SITE_KEY` trên Netlify (khai xong phải dựng lại Netlify). Để trống cả hai thì tắt hẳn cổng. Chỉ khai khoá bí mật mà thiếu site key thì không ai gửi hay đăng nhập được — trang báo rõ lỗi cấu hình này. Trong Cloudflare nhớ khai đúng tên miền Netlify của trang.

Trang xem (địa điểm, lộ trình, tin tức) vẫn mở cho mọi người, chỉ các thao tác gửi mới cần vé. Lưu ý: cổng vào che nội dung với máy tìm kiếm (Google) khi chúng mở trang, nên trang có thể khó lên kết quả tìm kiếm hơn.

## Kiểm thử

```
cd server && npm test     # 63 bài, không cần MySQL
npx tsc --noEmit          # ở thư mục gốc
```
