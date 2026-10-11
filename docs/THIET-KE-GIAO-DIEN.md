# Bản thiết kế giao diện phía người dân — chuyển giao cho frontend coding agent

Phạm vi: trang chủ (6 khối A–F) và hệ thống thiết kế dùng chung cho các trang công khai (`/dia-diem/:id`, `/lo-trinh`, `/lo-trinh/:id`, `/luu-tru`, `/phan-anh`, `/tin-tuc`, `/khach-quoc-te`, `/thong-ke`). Khu quản trị cán bộ **không** đổi giao diện trong đợt này; chỉ dùng chung token màu.

Mã nguồn hiện có: React 18 + TypeScript + Vite + Tailwind 3 + react-query + react-leaflet (nền OpenStreetMap) + lucide-react. Song ngữ qua `useNN()` (`t`, `chon`). Đọc mục [Ràng buộc dữ liệu](#ràng-buộc-dữ-liệu-đọc-trước-khi-dựng) trước khi dựng: trang này là trang của cơ quan nhà nước, **mọi con số, ảnh, đánh giá trên trang phải lần ra được nguồn thật**.

## Cập nhật: bỏ cảnh 3D, dùng ảnh thật

Người dùng thấy cảnh 3D và ảnh địa hình vẽ máy "mờ, nhựa", nên đã gỡ hẳn (bỏ cả gói three.js). Thay bằng:

- **Ảnh mặc định của địa điểm**: ảnh chụp thật, giấy phép tự do (CC0, CC BY, CC BY-SA) trên Wikimedia Commons, tải bằng `scripts/tai-anh-dia-diem.mjs` về `public/anh/dia-diem/`, thông tin tác giả và giấy phép ở `src/du-lieu/anh-dia-diem.json`. Thứ tự ưu tiên: ảnh cán bộ tải lên, rồi ảnh mặc định, rồi khung chờ (nền rừng đêm có đường đồng mức).
- **Hero**: trình chiếu ảnh các điểm nổi bật, mỗi ảnh 7 giây, chuyển mờ dần, ảnh đang chiếu phóng rất chậm (Ken Burns), lớp ảnh trôi chậm hơn trang khi cuộn. Có chấm chọn ảnh và nút tạm dừng (nội dung tự chạy quá 5 giây phải dừng được); bật "giảm chuyển động" thì không tự chạy. Góc dưới ghi "Trong ảnh: tên điểm" và tác giả, giấy phép.
- **Ghi công**: ảnh lớn (hero, trang địa điểm) ghi tác giả, giấy phép ngay trên ảnh; trang `/nguon-anh` liệt kê đủ mọi ảnh mặc định.
- Ảnh lộ trình là ảnh điểm dừng đầu tiên có ảnh. Trang đăng nhập cán bộ đặt trên một ảnh thật.

Các chuyển động không dính tới 3D vẫn giữ: thẻ nghiêng theo chuột, hiện khi cuộn, đường kể chuyện của lộ trình, View Transitions.

## Đã dựng: bản 3D (đã thay, giữ để tham khảo)

Theo yêu cầu "bớt phẳng, bớt nhựa, có chiều sâu 3D", bản dựng đổi mấy chỗ dưới đây. Các mục 1–10 phía sau vẫn đúng, trừ những chỗ ghi ở đây.

| Chỗ | Bản thiết kế | Bản đã dựng | Lý do |
|---|---|---|---|
| Hero | Ảnh chụp toàn khung | **Cảnh 3D (three.js)**: địa hình minh hoạ thành phố lúc rạng sáng, nhìn từ Biên Hoà lên phía bắc. Núi Bà Rá, Chứa Chan, hồ Trị An, Thác Mơ, Suối Lam, sông Đồng Nai, sông Bé đặt theo toạ độ thật (đường sông gần đúng); 15 ghim đúng toạ độ. Cuộn trang thì máy quay bay về phía bắc, rê chuột thì cảnh lệch nhẹ. | Chưa có ảnh thật; cảnh 3D là thứ không "nhựa" mà vẫn trung thực. Có dòng "Địa hình minh hoạ, không theo tỉ lệ". |
| Ảnh thẻ chưa có ảnh thật | Khung chờ có đường đồng mức | **Ảnh nhìn từ trên cao do chính cảnh 3D chụp** tại toạ độ của điểm / theo tuyến của lộ trình (đường san hô bám mặt đất), có nhãn "Địa hình minh hoạ". Vào thẳng trang con thì cảnh 3D dựng ẩn để chụp rồi gỡ (`ChupDiaHinh.tsx`). | Thẻ có hình thật sự khác nhau, có chiều sâu. Ảnh cán bộ tải lên luôn được ưu tiên. |
| Hiện khi cuộn | Trượt lên 24px | Khối **đứng dậy từ mặt phẳng nghiêng** (perspective + rotateX), khung bản đồ nghiêng mạnh hơn rồi phẳng hẳn để thao tác. | Chiều sâu thay cho trượt phẳng. |
| Thẻ | Phóng ảnh khi rê chuột | **Nghiêng theo chuột + vệt sáng chạy theo**, lớp chữ tách khỏi mặt ảnh theo trục Z khi đang nghiêng (đứng yên thì không, tránh chữ nhoè). Một bộ lắng nghe cho cả trang (`utils/hieuUng.ts`). | Vật thể dưới ánh đèn, không phải mảng màu phẳng. |
| Nền | Ivory phẳng | Hạt giấy rất nhẹ + đường đồng mức (sinh bằng `scripts/tao-nen-dong-muc.py`, dùng làm mặt nạ nên đổi màu theo token), trôi chậm hơn nội dung khi cuộn; mảng tối có vùng sáng ấm như nắng sớm. | |
| Đổi bộ lọc / đổi lộ trình | Motion for React | **View Transitions** của trình duyệt (`chuyenCanh`); trình duyệt chưa hỗ trợ thì đổi ngay. Không thêm thư viện chuyển động. | Gói nhẹ hơn. |
| Khu cán bộ | Không đổi | Thang `primary`, `slate` ánh xạ về bảng màu mới; thanh đầu nền rừng đêm; trang đăng nhập đặt trên cảnh 3D chạy chậm. | Hai khu cùng một giọng. |

Hiệu năng cảnh 3D: gói three.js tải sau (~140 kB nén), lưới địa hình dựng ở luồng phụ, khuất màn hình hoặc tab ẩn thì dừng; khi người xem không tương tác thì máy khoẻ vẽ 30 hình/giây, máy yếu dừng hẳn. Máy không có WebGL: nền rạng sáng tĩnh bằng CSS. Bật "giảm chuyển động": vẽ đúng một khung, không bay, không nghiêng.

Mục lục

1. [Art direction](#1-art-direction)
2. [Bảng màu và typography](#2-bảng-màu-và-typography)
3. [Sơ đồ bố cục từng section](#3-sơ-đồ-bố-cục-từng-section)
4. [Component và trạng thái tương tác](#4-component-và-trạng-thái-tương-tác)
5. [Motion spec](#5-motion-spec)
6. [Quy tắc responsive](#6-quy-tắc-responsive)
7. [Design token và quy tắc CSS](#7-design-token-và-quy-tắc-css)
8. [Checklist nghiệm thu bằng ảnh chụp](#8-checklist-nghiệm-thu-bằng-ảnh-chụp)
9. [Ảnh: tài sản cần có và quy tắc chọn](#9-ảnh-tài-sản-cần-có-và-quy-tắc-chọn)
10. [Dữ liệu mẫu: thật và minh họa](#10-dữ-liệu-mẫu-thật-và-minh-họa)

Phụ lục: [Ràng buộc dữ liệu](#ràng-buộc-dữ-liệu-đọc-trước-khi-dựng), [Thứ tự làm việc](#thứ-tự-làm-việc-đề-xuất), [Gỡ bỏ khỏi giao diện cũ](#gỡ-bỏ-khỏi-giao-diện-cũ).

---

## 1. Art direction

**Ý tưởng: "Theo dòng Đồng Nai".** Sông Đồng Nai chảy từ rừng Cát Tiên qua hồ Trị An, xuống Biên Hoà rồi ra biển. Sau sáp nhập, thành phố trải từ cù lao Phố ở phía nam lên tới rừng Bù Gia Mập sát biên giới. Trang web kể chuyện theo đúng trục đó: **một đường kẻ màu san hô** (tuyến đường, dòng sông) là yếu tố nhận diện duy nhất. Nó xuất hiện ở bản đồ (tuyến đang chọn), ở lộ trình gợi ý (đường nối các điểm dừng) và ở khung chọn tuyến. Mọi thứ khác giữ yên, kỷ luật.

Tinh thần: tạp chí du lịch in ấn kết hợp sổ tay kiểm lâm. Ảnh phong cảnh lớn, tiêu đề serif, nhiều khoảng thở. Bản đồ là công cụ thật, không phải hình trang trí.

| Nên | Không nên |
|---|---|
| Deep Forest làm màu chủ đạo của các mảng tối (hero, bản đồ, chân trang) | Nền kem + serif + điểm nhấn đất nung đỏ (kiểu trang do AI dựng sẵn) |
| San hô **chỉ** cho tuyến đường, điểm dừng và một nút "Xem lộ trình" | San hô rải khắp nơi làm màu trang trí |
| Vàng **chỉ** cho sao đánh giá | Gradient chữ, nút có vệt sáng lướt, viền phát sáng, bóng màu |
| Bố cục bất đối xứng, thẻ có kích thước theo thứ bậc nội dung | Lưới thẻ giống hệt nhau, cùng bo góc, cùng bóng |
| Kính mờ chỉ ở ô tìm kiếm và nút điều khiển bản đồ (nằm trên ảnh/bản đồ) | Kính mờ cho thẻ thường, panel thường |
| Nhãn chữ thường, câu ngắn, động từ rõ ("Xem trên bản đồ") | Nhãn VIẾT HOA giãn chữ trên mỗi tiêu đề, chuỗi "A · B · C", nút có "→" |
| Đánh số 1, 2, 3 cho **điểm dừng** của lộ trình (đúng là một trình tự) | Đánh số 01 / 02 / 03 cho các khối không có thứ tự |
| Khi không có dữ liệu: nói thẳng và mời hành động | Số liệu, đánh giá, thời gian di chuyển bịa ra cho đẹp |

**Phân bổ màu trên một màn hình:** khoảng 60% Warm Ivory (mặt đọc), 30% Deep Forest (mảng tối, chữ tiêu đề), dưới 10% Emerald (hành động), dưới 5% San hô, Vàng chỉ trên sao.

---

## 2. Bảng màu và typography

### 2.1 Bảng màu

Giữ đúng 6 màu trong brief. Một số màu **không đủ tương phản** để làm chữ hay đường nét trên nền sáng, nên có thêm biến thể "dùng cho chữ/nét". Tỉ lệ tương phản đo theo WCAG 2.1 (chữ thường ≥ 4.5, chữ lớn ≥ 24px hoặc ≥ 18.66px đậm và thành phần đồ hoạ ≥ 3.0).

| Token | Hex | Vai trò | Tương phản đã đo |
|---|---|---|---|
| `forest` | `#123C35` | Mảng tối, chữ tiêu đề trên nền sáng | trên ivory 11.18 |
| `forest-raised` | `#1C3831` | Mặt nổi trên nền tối (dark mode) | ivory trên nó 11.61 |
| `emerald` | `#1C8C72` | Icon, hình minh hoạ, chữ ≥ 24px | trên ivory 3.82, **không** dùng cho chữ thường |
| `action` | `#157A63` | Link, nền nút chính (chữ trắng/ivory) | trên ivory 4.82, trắng trên nó 5.26 |
| `action-hover` | `#116553` | Hover/active của nút chính | trắng trên nó 6.98 |
| `ivory` | `#F7F5EF` | Nền trang | — |
| `paper` | `#FFFFFF` | Mặt thẻ, panel trên nền ivory | — |
| `sunken` | `#EFEBE1` | Nền lõm (ô thống kê, khung ảnh chờ) | forest trên nó 10.24, muted 4.72 |
| `ink` | `#192522` | Chữ thân bài | trên ivory 14.49 |
| `ink-2` | `#3E4C48` | Placeholder trong ô kính mờ | ≥ 6 trên kính mờ |
| `muted` | `#5B6B66` | Chữ phụ, meta | trên ivory 5.15, trên trắng 5.62 |
| `line` | `#DDD8CC` | Đường kẻ **trang trí** (chia khối) | 1.30 — không dùng làm viền ô nhập |
| `line-strong` | `#7C8A85` | Viền ô nhập, viền chip, sao rỗng trong ô chọn sao | trên ivory 3.30, trên trắng 3.60 |
| `coral` | `#F17C5B` | Nền nút "Xem lộ trình" (**chữ ink**), tuyến trên nền tối | ink trên nó 5.85 (trắng chỉ 2.70); trên forest 4.51 |
| `route` | `#D4552F` | Tuyến đường, số điểm dừng trên nền sáng và trên bản đồ OSM | trên ivory 3.75, trên trắng 4.09, trên nền OSM ~3.56 |
| `gold` | `#EABF67` | Sao trên nền tối | trên forest 7.05 |
| `star` | `#9A6B12` | Sao trên nền sáng | trên ivory 4.29 |
| `muted-on-dark` | `#B9C7C1` | Chữ phụ trên forest | 6.96 trên forest |

Trạng thái hệ thống (lỗi, cảnh báo) không dùng màu thương hiệu:

| Token | Hex | Ghi chú |
|---|---|---|
| `danger` | `#B42318` | Chữ lỗi trên ivory (≥ 5.5) |
| `danger-bg` | `#FDECEA` | Nền hộp lỗi |
| `warning-bg` | `#FCEFC7` | Dải cảnh báo đầu trang (chữ `ink`) |

**Dark mode** (trang hiện có công tắc sáng/tối, giữ lại):

| Token | Hex | Đã đo |
|---|---|---|
| `bg` | `#0E1F1B` | ivory trên nó 15.65 |
| `surface` | `#1C3831` | ivory 11.61 |
| `muted` | `#A9B8B2` | 8.28 trên bg, 6.14 trên surface |
| `action` | `#45B897` | 6.95 trên bg; nút dùng **chữ ink** (6.44) |
| `route` | `#F17C5B` | 6.32 trên bg, 4.69 trên surface |
| `star` | `#EABF67` | 9.87 trên bg |

Lưu ý: nền bản đồ OSM vẫn sáng trong dark mode, nên **tuyến trên bản đồ luôn dùng `#D4552F`**, không đổi theo theme.

### 2.2 Typography

Đã kiểm tra cả hai font có bộ ký tự tiếng Việt trên Google Fonts.

| Vai trò | Font | Lý do |
|---|---|---|
| Tiêu đề lớn (≥ 24px) | **Newsreader** (trục `opsz` 6–72, `wght` 400–600) | Serif biên tập của Production Type, làm cho báo chí; trục cỡ quang học cho nét mảnh đẹp ở cỡ lớn; có bộ tiếng Việt. Tránh Playfair/Fraunces vì quá phổ biến. |
| Giao diện, thân bài, số | **Be Vietnam Pro** (400, 500, 600, 700) | Đang dùng, dấu tiếng Việt hai tầng (Ố, Ộ, Ữ) đầy đủ, rõ ở cỡ nhỏ. |

Nạp trong `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400..600&display=swap" rel="stylesheet" />
```

Dự phòng: `Newsreader, "Noto Serif Display", Georgia, serif` và `"Be Vietnam Pro", system-ui, sans-serif`.

**Thang chữ** (gốc 16px, tỉ lệ khoảng 1.25 cho chữ giao diện, nhảy bậc lớn cho tiêu đề):

| Token | Cỡ | Font | Độ đậm | Line-height | Tracking | Dùng cho |
|---|---|---|---|---|---|---|
| `--fs-hero` | `clamp(2.75rem, 1.5rem + 4.4vw, 5.25rem)` (44→84px) | serif | 500 | 1.12 | -0.02em | Tiêu đề hero |
| `--fs-h2` | `clamp(2rem, 1.45rem + 2vw, 3rem)` (32→48px) | serif | 500 | 1.15 | -0.015em | Tiêu đề section |
| `--fs-h3` | `clamp(1.5rem, 1.3rem + 0.8vw, 1.875rem)` (24→30px) | serif | 500 | 1.2 | -0.01em | Tên điểm ở thẻ lớn, tên lộ trình đang mở |
| `--fs-num` | `clamp(2.5rem, 2rem + 2vw, 3.5rem)` | serif | 500 | 1 | -0.02em | Điểm trung bình (4,6) |
| `--fs-title` | 1.125rem (18px) | sans | 600 | 1.35 | 0 | Tên điểm ở thẻ thường, tiêu đề panel |
| `--fs-lead` | 1.125rem (18px) | sans | 400 | 1.6 | 0 | Câu dẫn hero, mở đầu section |
| `--fs-body` | 1rem (16px) | sans | 400 | 1.6 | 0 | Thân bài |
| `--fs-small` | 0.875rem (14px) | sans | 400/500 | 1.5 | 0 | Meta, chip |
| `--fs-caption` | 0.8125rem (13px) | sans | 500 | 1.45 | 0.01em | Chú thích ảnh, số đếm trong chip |

Quy tắc:

- **Line-height tiêu đề không dưới 1.12.** Tiếng Việt có dấu chồng (Ấ, Ồ, Ặ, Ỗ, Ữ); dưới mức này dấu bị cắt hoặc chạm dòng trên.
- Tiêu đề viết hoa đầu câu, không VIẾT HOA toàn bộ, không tô riêng một từ bằng màu hay nghiêng.
- Chữ serif chỉ từ 24px trở lên. Dưới 24px dùng sans.
- Độ dài dòng thân bài tối đa `68ch`; câu dẫn serif tối đa `60ch`.
- Số liệu (khoảng cách, số đánh giá, điểm) dùng `font-variant-numeric: tabular-nums`.
- Số thập phân theo tiếng Việt: `4,6` (vi) và `4.6` (en). Dùng `Intl.NumberFormat(nn === 'en' ? 'en' : 'vi')`.
- Chữ nhỏ nhất 13px. Không dùng font monospace cho nhãn dữ liệu.

---

## 3. Sơ đồ bố cục từng section

Thứ tự trang chủ:

```
[Dải cảnh báo]   chỉ hiện khi cán bộ đăng tin loại "Cảnh báo" còn hiệu lực
A  Hero
B  Khám phá điểm đến
C  Bản đồ tương tác             (mảng Deep Forest tràn viền)
D  Lộ trình gợi ý
E  Đánh giá của du khách
   Tin mới và sự kiện            (dải gọn, chỉ hiện khi có tin)
F  Chân trang                    (Deep Forest; có số điện thoại khẩn cấp)
```

Các khối trang chủ hiện tại được gộp: "Chủ đề" vào bộ lọc loại hình của B; "Xếp hạng" vào E; số điện thoại cần biết vào F; nút "Xem thống kê" vào menu và chân trang.

Lưới: 12 cột ở desktop, khung nội dung tối đa 1280px, gutter 32px (tablet 24px, mobile 16px).

Con số trong các sơ đồ dưới đây (4,6 sao, 128 đánh giá, 14 km…) chỉ để giữ chỗ khi vẽ bố cục, **không phải dữ liệu**. Giao diện thật lấy số từ API.

### A. Hero

Desktop (≥ 1024px), cao `min(92vh, 860px)`:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Du lịch Đồng Nai      Khám phá  Bản đồ  Lộ trình  Tin tức  Phản ánh  [VI|EN]│ ← nav trong suốt
│                                                                          │
│                    ẢNH TOÀN KHUNG (ảnh đầu của một điểm nổi bật)         │
│                                                                          │
│                                                                          │
│  Đi xa hơn.                                                              │
│  Khám phá theo cách của bạn.                                             │
│                                                       ┌────────────────┐ │
│  15 điểm đến, 3 lộ trình gợi ý từ cù lao Phố          │ Trong ảnh      │ │ ← lớp nổi 1
│  tới rừng Bù Gia Mập.                                 │ Hồ Trị An      │ │   (ivory, bóng sh-3)
│                                                       │ Xã La Ngà      │ │
│  ┌─────────────────────────────────────────┬───────┐  │ Xem điểm này   │ │
│  │ ⌕  Tìm điểm đến, xã, phường             │  Tìm  │  └────────────────┘ │
│  └─────────────────────────────────────────┴───────┘  ┌────────────────┐ │
│  [ Xem bản đồ ]  ( Xem lộ trình )                     │ ★ 4,6  128 đánh│ │ ← lớp nổi 2: chỉ
│   nút chính       nút san hô, chữ ink                 │ giá thật       │ │   hiện khi có đánh giá
│                                                       └────────────────┘ │
│ ───────────────────────────────────────────── Ảnh: Tác giả, CC BY 4.0 ── │ ← chú thích ảnh
└──────────────────────────────────────────────────────────────────────────┘
   cột chữ: cột 1–7          khoảng trống              lớp nổi: cột 9–12
```

- Lớp phủ (scrim) chỉ ở góc dưới trái, sau khối chữ: `linear-gradient(to top right, rgb(18 60 53 / .82) 0%, rgb(18 60 53 / .55) 35%, transparent 65%)`. Đã đo: Ivory đạt 4.5:1 trên ảnh trắng tệ nhất khi độ phủ của forest ≥ 0.72 tại vị trí chữ. Đây là scrim chức năng, không phải gradient trang trí.
- Câu dẫn tự sinh từ dữ liệu thật: `${soDiem} điểm đến, ${soLoTrinh} lộ trình gợi ý…`. Không có dữ liệu thì bỏ câu này, không ghi số cứng.
- Không có ảnh nào được tải lên: hero chuyển sang **nền Deep Forest + hình phong cảnh vẽ nét** (`Canh.tsx` vẽ lại theo bảng màu mới, tĩnh), lớp nổi 1 ẩn.
- Nav: trong suốt, chữ ivory trên ảnh; cuộn quá 64px thì nền ivory, chữ ink, đường kẻ `line` ở đáy.

Tablet (640–1023px): cao 80vh, cột chữ chiếm 10/12, lớp nổi 1 thu thành thanh ngang dưới ô tìm kiếm, lớp nổi 2 ẩn.

Mobile (< 640px):

```
┌─────────────────────────┐
│ Du lịch Đồng Nai   ☰    │
│                         │
│      ẢNH (cao 56vh)     │
│                         │
│ Đi xa hơn.              │
│ Khám phá theo cách      │
│ của bạn.                │
├─────────────────────────┤ ← ô tìm kiếm nằm ĐÈ mép ảnh (nửa trên ảnh, nửa dưới)
│ ⌕ Tìm điểm đến…    Tìm  │
└─────────────────────────┘
  15 điểm đến, 3 lộ trình…
  [ Xem bản đồ           ]   ← nút rộng hết khung
  ( Xem lộ trình         )
  Trong ảnh: Hồ Trị An, xã La Ngà   ← dòng chữ, không phải thẻ nổi
```

### B. Khám phá điểm đến

Desktop:

```
Khám phá điểm đến                                      Đang hiện 6 / 15 điểm
Chọn vùng và loại hình để thu hẹp.

Vùng   (Tất cả 15) (Ven sông Đồng Nai 6) (Hồ, rừng và núi miền đông 4) (Miền đất đỏ phía bắc 5)
Loại   (Thiên nhiên 9) (Di tích 4) (Vui chơi 2)          ← chỉ hiện loại có điểm; chip có số đếm

┌───────────────────────────────┬──────────────┬──────────────┐
│                               │  thẻ 2       │  thẻ 3       │
│  THẺ LỚN (6 cột × 2 hàng)     │  3 × 1       │  3 × 1       │
│  ảnh tràn thẻ, tên serif h3   ├──────────────┼──────────────┤
│  khu vực, sao, mô tả 2 dòng   │  thẻ 4       │  thẻ 5       │
├──────────────┬────────────────┼──────────────┴──────────────┤
│  thẻ 6       │  thẻ 7         │  THẺ NGANG (6 × 1)          │
│  3 × 1       │  3 × 1         │  ảnh trái, chữ phải         │
└──────────────┴────────────────┴─────────────────────────────┘
                     [ Xem tất cả 15 điểm ]
```

- Mẫu bento lặp mỗi 8 thẻ. Thẻ lớn là điểm `noiBat` đầu tiên trong tập đã lọc (không có thì điểm có nhiều đánh giá nhất, rồi theo tên).
- Hiện 8 thẻ đầu, nút "Xem tất cả" mở hết (không phân trang, chỉ 15 điểm).
- Nội dung thẻ: ảnh (hoặc khung "Chưa có ảnh"), tên, khu vực (xã/phường, hoặc vùng nếu chưa gán xã), sao trung bình + số đánh giá (hoặc "Chưa có đánh giá"), loại hình (chữ nhỏ, không phải nhãn viết hoa).
- Bấm thẻ: mở trang `/dia-diem/:id`. Nút phụ trên thẻ lớn "Xem trên bản đồ" cuộn tới C và chọn điểm.
- Lọc không ra điểm nào: khối trống "Chưa có điểm nào thuộc *vùng X* và *loại Y*." + nút "Bỏ lọc loại hình".

Tablet: lưới 6 cột; thẻ lớn 6 × 1 (ngang), còn lại 3 × 1. Mobile: danh sách một cột, thẻ gọn (ảnh trái 112×112, chữ phải); chip lọc cuộn ngang trong một hàng, có mép mờ báo còn nữa.

### C. Bản đồ tương tác

Mảng Deep Forest tràn viền, chữ ivory.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Bản đồ                                                                   │
│ Chọn một điểm, hoặc chọn lộ trình để xem đường đi giữa các điểm.         │
│ ┌───────────────────────────────────────────────┬──────────────────────┐ │
│ │ [Điểm đến | Lộ trình]  ← kính mờ, góc trên trái│ PANEL (paper)        │ │
│ │                                               │                      │ │
│ │        ●          ●                           │ Chưa chọn:           │ │
│ │   ●        ①━━━━━②                            │ "Chọn một điểm trên  │ │
│ │       ●          ┃                            │  bản đồ hoặc một lộ  │ │
│ │                  ③━━━④      ●                 │  trình bên dưới."    │ │
│ │                                               │                      │ │
│ │                          [+] [−] [⤢ Vừa khung]│ Đã chọn điểm / tuyến │ │
│ │ © OpenStreetMap                               │ (xem bên dưới)       │ │
│ └───────────────────────────────────────────────┴──────────────────────┘ │
│   bản đồ: cột 1–8, cao 640px                       panel: cột 9–12       │
└──────────────────────────────────────────────────────────────────────────┘
```

Panel khi **chọn một điểm**: ảnh nhỏ 16:9, tên (`--fs-title`), khu vực, sao, giờ mở cửa và số điện thoại **nếu cán bộ đã nhập**, nút "Xem chi tiết" và "Chỉ đường bằng Google Maps".

Panel khi **chọn một lộ trình**:

```
Một ngày di sản bên sông
1 ngày                        ← lich_trinh.thoi_gian (cán bộ nhập); không có thì bỏ dòng
Ô tô hoặc xe máy              ← lich_trinh.phuong_tien (trường mới); không có thì bỏ dòng
Khoảng 14 km đường chim bay   ← tính bằng haversine, LUÔN ghi "đường chim bay"
4 điểm dừng

Ngày 1
 ① Văn miếu Trấn Biên         Bắt đầu
 │
 ② Khu du lịch Bửu Long       cách điểm trước khoảng 1 km
 │
 ③ Cù lao Phố                 khoảng 5 km
 │
 ④ Đền thờ Nguyễn Hữu Cảnh    Kết thúc

[ Chỉ đường bằng Google Maps ]   [ Xem chi tiết lộ trình ]
```

- **Không** ghi thời gian di chuyển (không có dữ liệu đường bộ), **không** có nút "Định vị tôi" hay "Bắt đầu dẫn đường". Chỉ đường thật giao cho Google Maps qua `duongDanChiDuong()` hiện có.
- Ghim: chấm forest viền ivory, icon loại hình trắng ở giữa (phân biệt loại bằng **hình**, không chỉ bằng màu). Điểm nổi bật to hơn (20px so với 15px). Đang chọn: nền `action`, viền ivory 3px.
- Điểm dừng của tuyến: đĩa `route` có số trắng 1, 2, 3… Điểm đầu có thêm vòng ngoài; điểm cuối là đĩa vuông bo góc 6px. Thứ tự đọc được bằng số, không chỉ bằng màu.
- Tuyến: polyline `route` dày 4px, đầu tròn; các ghim không thuộc tuyến mờ còn 45%.
- Nền bản đồ: lớp `.leaflet-tile-pane { filter: saturate(.7) }` để tuyến san hô nổi lên. Giữ nguyên dòng ghi công OpenStreetMap.

Tablet: bản đồ rộng hết khung (cao 520px), panel nằm dưới. Mobile: bản đồ cao 60vh, panel dưới bản đồ. Trên thiết bị cảm ứng, bản đồ **không bắt cử chỉ kéo một ngón** cho tới khi người dùng chạm "Chạm để dùng bản đồ" (tránh kẹt cuộn trang).

### D. Lộ trình gợi ý

Bố cục "một lớn, hai nhỏ" (không phải ba thẻ bằng nhau):

```
Lộ trình gợi ý
Cán bộ địa phương soạn sẵn. Chọn một lộ trình để xem đường đi.

┌──────────────────────────────────────────────┬──────────────────────────┐
│ ẢNH (ảnh đầu của điểm dừng đầu tiên có ảnh)  │ ┌──────────────────────┐ │
│                                              │ │ ảnh 4:3  Rừng và hồ  │ │
│ Một ngày di sản bên sông      ← serif h3     │ │          cuối tuần   │ │
│ 1 ngày     Ô tô hoặc xe máy                  │ │          2 ngày 1 đêm│ │
│                                              │ │ ●──●──●              │ │
│ ①────────②────────③────────④                 │ └──────────────────────┘ │
│ Văn miếu  Bửu Long  Cù lao   Đền thờ         │ ┌──────────────────────┐ │
│ Trấn Biên           Phố      Nguyễn Hữu Cảnh │ │ ảnh 4:3  Về miền đất │ │
│                                              │ │          đỏ phía bắc │ │
│ Văn miếu, núi đá Bửu Long và cù lao Phố…     │ │          2 ngày      │ │
│                                              │ │ ●──●──●──●           │ │
│ [ Xem trên bản đồ ]  [ Chi tiết lộ trình ]   │ └──────────────────────┘ │
└──────────────────────────────────────────────┴──────────────────────────┘
   lộ trình đang chọn: cột 1–7                     hai lộ trình còn lại: cột 8–12
```

- "Đường kể chuyện" (story line): đường kẻ `route` 2px nối các chấm điểm dừng, nhãn tên dưới chấm. Lộ trình nhiều ngày thì có nhãn "Ngày 2" tại chỗ ngắt và đường kẻ đứt quãng 6px giữa hai ngày.
- Bấm thẻ nhỏ: thẻ đó đổi chỗ thành thẻ lớn (layout animation, xem mục 5).
- "Xem trên bản đồ": cuộn tới C, bật tab Lộ trình, vẽ tuyến.
- Trang `/lo-trinh/:id` dùng bố cục kể chuyện dính (sticky): bản đồ dính bên trái, danh sách điểm dừng cuộn bên phải; điểm đang ở giữa màn hình được làm nổi trên bản đồ. Trang chủ **không** dùng sticky vì chỉ có 3 lộ trình ngắn, sticky chỉ làm trang dài thêm.

Mobile: một cột, thẻ lớn ở trên; hai thẻ nhỏ thành hàng cuộn ngang (scroll-snap, mỗi thẻ rộng 80%). Story line chuyển thành **dọc**.

### E. Đánh giá của du khách

```
Đánh giá của du khách
Chỉ hiện đánh giá thật của du khách. Mỗi máy được đánh giá mỗi điểm một lần.

┌───────────────────────────┬──────────────────────────────────────────────┐
│ 4,6        ← serif --fs-num│ ┌────────────────────┐ ┌────────────────────┐ │
│ ★★★★★  128 đánh giá        │ │ ★★★★☆  Hồ Trị An   │ │ ★★★★★ Thác Đắk Mai │ │
│                            │ │ "Hoàng hôn trên hồ…"│ │ "Đường vào hơi…"   │ │
│ 5 ★ ███████████████  80    │ │ Khách, đi cùng gia │ │ Ẩn danh, 03/2026   │ │
│ 4 ★ ██████           30    │ │ đình, 08/2026      │ │                    │ │
│ 3 ★ ██               10    │ │ Báo vi phạm        │ │ Báo vi phạm        │ │
│ 2 ★ █                 5    │ └────────────────────┘ └────────────────────┘ │
│ 1 ★ █                 3    │ ┌────────────────────┐ ┌────────────────────┐ │
│                            │ │ …                  │ │ …                  │ │
│ Cảnh quan   4,7            │ └────────────────────┘ └────────────────────┘ │
│ Dịch vụ     4,2            │                                              │
│ Vệ sinh     4,0            │        [ Xem đánh giá theo từng điểm ]       │
│ Giá cả      4,1            │                                              │
│                            │                                              │
│ [ Viết đánh giá ]          │                                              │
└───────────────────────────┴──────────────────────────────────────────────┘
   tổng hợp: cột 1–4 (dính khi cuộn ở desktop)   thẻ đánh giá: cột 5–12, 2 cột
```

- Số tổng hợp lấy từ `/api/thong-ke` (`danhGia.so`, `saoTb`, `phanBo`, `tieuChi`). Danh sách thẻ lấy từ endpoint mới `GET /api/danh-gia/moi-nhat` (xem phụ lục).
- "Viết đánh giá": mở hộp thoại, bước 1 chọn điểm đến (ô chọn có tìm kiếm), bước 2 là form đánh giá hiện có trong `ChiTiet.tsx` (sao, 4 tiêu chí, đi cùng ai, tháng đi, nhận xét, tên hiển thị, Turnstile).
- **Trạng thái trống (là trạng thái thật hiện nay, phải thiết kế kỹ):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Chưa có đánh giá nào.                                                    │
│ Bạn đã đến một trong 15 điểm này? Đánh giá của bạn giúp người đi sau     │
│ chọn đúng nơi.                                      [ Viết đánh giá ]    │
└──────────────────────────────────────────────────────────────────────────┘
```

  Không hiện cột phân bố sao rỗng, không hiện "0,0".

Mobile: khối tổng hợp ở trên (không dính), thẻ đánh giá một cột, 3 thẻ đầu + "Xem thêm".

### F. Chân trang

```
┌──────────────────────────────────────────────────────────────────────────┐ Deep Forest
│ Du lịch Đồng Nai                 Khám phá           Số điện thoại cần biết│
│ Trang thông tin du lịch của      Bản đồ             Công an          113  │
│ thành phố Đồng Nai.              Lộ trình gợi ý     Cứu hoả          114  │
│                                  Lưu trú            Cấp cứu          115  │
│                                  Tin tức            Cứu nạn          112  │
│                                  Gửi phản ánh                             │
│                                  Khách quốc tế                            │
│                                  Thống kê                                 │
│ ──────────────────────────────────────────────────────────────────────── │
│ Bản đồ © OpenStreetMap. Ảnh thuộc tác giả ghi ở từng ảnh.    Cán bộ đăng nhập │
└──────────────────────────────────────────────────────────────────────────┘
```

Số điện thoại lấy từ tin loại `lien-he` (cán bộ quản lý), là link `tel:`. Mobile: ba cột thành một cột, số điện thoại lên đầu.

---

## 4. Component và trạng thái tương tác

Quy ước trạng thái chung (mọi component tương tác đều phải có đủ):

| Trạng thái | Cách thể hiện | Ghi chú |
|---|---|---|
| default | — | |
| hover | Đổi nền/màu chữ 180ms; thẻ: ảnh phóng nhẹ | Chỉ khi `(hover: hover)` |
| focus-visible | Vòng 2px `action` (dark: `#45B897`), cách 2px, **luôn hiện**, không bị `overflow:hidden` cắt | Dùng `outline` + `outline-offset`, không dùng box-shadow |
| active (đang nhấn) | `scale(.97)` 100ms | |
| selected / pressed | `aria-pressed="true"` hoặc `aria-current`; nền đặc + icon dấu chọn | Không chỉ phân biệt bằng màu |
| disabled | Độ mờ .45, con trỏ mặc định, vẫn đọc được bằng trình đọc màn hình | Chip có số 0: disabled |
| loading | Skeleton tĩnh màu `sunken` (shimmer chỉ khi cho phép chuyển động) hoặc spinner trong nút + chữ "Đang gửi…" | Nút giữ nguyên độ rộng |
| error | Chữ `danger` + icon, câu nói rõ chuyện gì và cách sửa | Không xin lỗi, không mơ hồ |
| empty | Một câu nói thực trạng + một hành động | |

| Component | Biến thể | Trạng thái riêng | Ghi chú triển khai |
|---|---|---|---|
| `ThanhDieuHuong` (nav) | trên ảnh (trong suốt), đã cuộn (ivory) | mục đang ở (`aria-current="page"`, gạch dưới 2px `action`); menu mobile mở/đóng | Có link "Bỏ qua tới nội dung chính" đầu trang |
| `ONutNgonNgu` | VI/EN | chọn | Giữ cơ chế `useNN()` |
| `OTimKiem` (kính mờ) | hero, gọn (trang khác) | focus; đang gõ có gợi ý (combobox + listbox, phím ↑ ↓ Enter Esc); không có kết quả ("Không thấy điểm nào tên '…'"); | Gợi ý lọc trên dữ liệu đã tải (tên vi/en, xã, địa chỉ). Enter không chọn gợi ý thì cuộn tới B với từ khoá. |
| `Nut` | chính (`action`, chữ trắng), san hô (`coral`, chữ **ink**), viền (trên ảnh: viền ivory), chữ | đủ bộ chung | Cao tối thiểu 44px. Không thêm "→". |
| `ChipLoc` | vùng, loại hình | selected có icon ✓, disabled khi đếm 0 | `role="group"` + `aria-label`; mỗi chip là `button aria-pressed` |
| `TheDiaDiem` | lớn, thường, ngang, gọn (mobile) | hover/focus, skeleton, chưa có ảnh, **đang chọn trên bản đồ** (viền `action` 2px) | Cả thẻ là một link; nút phụ bên trong dùng `stopPropagation` và là phần tử riêng có focus |
| `KhungAnhCho` | — | — | Khi chưa có ảnh: nền `sunken`, hình đường đồng mức vẽ nét `line-strong`, icon loại hình, chữ "Chưa có ảnh". Không dùng ảnh minh hoạ giả. |
| `HienSao` | nhỏ (thẻ), lớn (tổng hợp) | chưa có đánh giá ("Chưa có đánh giá" thay cho 0 sao) | Có `aria-label="4,6 trên 5 sao, 128 đánh giá"` |
| `BanDoTuongTac` | trang chủ, trang chi tiết (thấp) | đang tải ô nền (nền forest + "Đang tải bản đồ"), lỗi tải ô nền ("Không tải được nền bản đồ. Kiểm tra mạng rồi thử lại." + nút), chưa kích hoạt cảm ứng | Bọc ngoài bằng `isolation: isolate` để lớp Leaflet (z-index 400–1000) không đè thanh điều hướng |
| `GhimBanDo` | thường, nổi bật, đang chọn, mờ (không thuộc tuyến), điểm dừng (số), đầu, cuối | hover phóng 1.15 | `L.divIcon` HTML; có `title` để đọc tên |
| `NutDieuKhienBanDo` (kính mờ) | +, −, vừa khung, chuyển tab Điểm đến/Lộ trình | đủ bộ chung | 40×40px trên desktop, 44×44px cảm ứng |
| `PanelBanDo` | trống, điểm, lộ trình | đang tải ảnh | `aria-live="polite"` để báo khi nội dung đổi |
| `TheLoTrinh` | lớn, nhỏ | đang chọn (là thẻ lớn), hover | Thẻ nhỏ là `button aria-pressed` |
| `DuongKeChuyen` (story line) | ngang, dọc | đang vẽ, đã vẽ | SVG; danh sách điểm dừng vẫn là `<ol>` để trình đọc màn hình đọc đúng thứ tự |
| `TongHopDanhGia` | có dữ liệu, trống | — | Thanh phân bố: `role="img"` + `aria-label` "5 sao: 80 đánh giá" |
| `TheDanhGia` | thường, nhận xét dài (cắt 4 dòng + "Xem thêm") | đã báo vi phạm ("Đã báo, cảm ơn bạn" thay cho nút) | Không hiện ảnh đại diện giả |
| `ChonSao` | — | hover xem trước (tô sao tới vị trí trỏ), đã chọn, lỗi "Chọn số sao trước khi gửi" | `radiogroup` 5 `radio`; phím ← → đổi sao; sao rỗng viền `line-strong` |
| `FormDanhGia` | mới, sửa (máy này đã đánh giá điểm đó) | đang gửi, thành công, lỗi mạng, bị giới hạn ("Bạn gửi quá nhanh. Thử lại sau ít phút.") | Giữ logic `ChiTiet.tsx` |
| `DaiCanhBao` | — | đóng tạm (ẩn trong phiên) | `role="alert"`; nền `warning-bg`, chữ ink |
| `ChanTrang` | — | — | |
| `NhanMinhHoa` | badge, banner | — | Chỉ có trong chế độ minh hoạ (mục 10) |

---

## 5. Motion spec

Nguyên tắc:

- Chỉ animate `transform` và `opacity` (ngoại lệ có ghi rõ: `stroke-dashoffset` của SVG, `width` của thanh phân bố sao — thanh nằm trong khung cố định nên không xô bố cục).
- Một khoảnh khắc chính: **cảnh mở đầu hero**. Các chuyển động khác phải nhỏ và trả lời hành động của người dùng.
- `prefers-reduced-motion: reduce`: tắt hết chuyển động trang trí (lớp `fx-*`); chuyển động chức năng còn lại là đổi `opacity` ≤ 150ms hoặc hiện ngay.
- Mobile và máy yếu: tắt parallax, tilt, nổi bồng bềnh.
- Công cụ: **CSS transition** cho tương tác nhỏ; **IntersectionObserver** (hook `useHienDan` hiện có) cho hiện khi cuộn; **Motion for React** (`motion/react`, dùng `LazyMotion` + `domAnimation` để gói nhỏ) chỉ cho cảnh mở đầu hero, sắp xếp lại thẻ khi lọc và đổi chỗ thẻ lộ trình. **Không dùng GSAP**: không có hiệu ứng nào ở đây cần tới nó.

Token thời gian và easing:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--dur-instant` | 100ms | nhấn nút |
| `--dur-fast` | 180ms | đổi màu, hover chip |
| `--dur-base` | 280ms | mở panel, đổi nội dung |
| `--dur-slow` | 600ms | hiện khi cuộn, sắp xếp lại thẻ |
| `--dur-cinema` | 1100ms | ảnh hero |
| `--ease-out` | `cubic-bezier(.22, 1, .36, 1)` | hầu hết chuyển động vào |
| `--ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | vẽ tuyến, di chuyển vị trí |
| `--ease-pop` | `cubic-bezier(.34, 1.56, .64, 1)` | chỉ cho sao được chọn |

| # | Element | Trigger | Trạng thái đầu → cuối | Duration | Easing | Mục đích | Reduced motion / mobile |
|---|---|---|---|---|---|---|---|
| 1a | Ảnh hero `.fx-parallax` | Cuộn từ 0 tới đáy hero | `translateY(0)` → `translateY(80px)`, giữ `scale(1.08)` để không lộ mép | Gắn theo cuộn | linear | Tạo chiều sâu giữa ảnh và chữ | Tắt dưới 1024px và khi giảm chuyển động. Dùng CSS `animation-timeline: scroll()` trong `@supports`; trình duyệt không hỗ trợ thì ảnh đứng yên (không viết JS cuộn). |
| 1b | Khối chữ hero | Cuộn như trên | `opacity 1` → `.85` | Gắn theo cuộn | linear | Chữ lùi dần khi rời hero | Tắt |
| 2a | Ảnh hero | Ảnh tải xong (`onLoad`) | `opacity 0, scale(1.14)` → `opacity 1, scale(1.08)` | 1100ms | `--ease-out` | Mở cảnh như phim | Hiện ngay. Nền forest đứng sẵn nên không chớp trắng. Chờ ảnh tối đa 1.5s rồi bỏ qua hiệu ứng. |
| 2b | Hai dòng tiêu đề hero | Trang tải (không chờ ảnh) | Mỗi dòng trong khung che: `translateY(105%)` → `0` | 700ms, dòng 2 trễ 90ms; bắt đầu ≤ 100ms | `--ease-out` | Nhịp mở đầu | Hiện ngay. Không để tiêu đề ẩn lâu: nó là LCP. |
| 2c | Câu dẫn, ô tìm kiếm, nút | Sau 2b | `opacity 0, translateY(16px)` → `1, 0` | 500ms, trễ 350 / 450 / 520ms | `--ease-out` | Dẫn mắt từ tiêu đề xuống hành động | Hiện ngay. Ô tìm kiếm dùng được ngay cả khi đang chạy hiệu ứng. |
| 2d | Lớp nổi hero | Sau 2c | `opacity 0, translateY(24px)` → `1, 0` | 600ms, trễ 750ms | `--ease-out` | Lớp thông tin đến sau cùng | Hiện ngay |
| 3 | Tiêu đề section + hàng nội dung đầu (`.hien-dan`) | Vào khung nhìn 15%, một lần | `opacity 0, translateY(24px)` → `1, 0`; trong lưới bento trễ dần 60ms/thẻ, tối đa 6 thẻ | 600ms | `--ease-out` | Nhịp đọc khi cuộn | Hiện ngay. Chỉ áp cho **đầu section**, không cho từng đoạn văn. |
| 4a | Ảnh trong `TheDiaDiem` | hover / focus-visible | `scale(1)` → `scale(1.04)` trong khung `overflow:hidden` | 500ms | `--ease-out` | Báo thẻ bấm được | Không phóng; chỉ đổi bóng |
| 4b | Thẻ | hover / focus-visible | bóng `sh-1` → `sh-2`; dòng "Xem chi tiết" `opacity 0, translateY(4px)` → `1, 0` | 280ms | `--ease-out` | Báo thẻ bấm được | Bóng đổi ngay |
| 5 | Thẻ lớn ở B và lớp nổi 1 ở hero `.fx-tilt` | Di chuột trên thẻ | `rotateX/Y(0)` → tối đa `±4deg` theo vị trí con trỏ, `perspective: 1000px`; rời chuột về 0 | theo con trỏ (rAF); về 0 trong 400ms | `--ease-out` | Chiều sâu cho đúng hai phần tử nổi bật | Chỉ khi `(hover: hover) and (pointer: fine)` và ≥ 1024px. Không dùng thư viện. |
| 6a | Tuyến trên bản đồ (`path.tuyen`) | Chọn lộ trình, sau khi `flyToBounds` xong (800ms) | `stroke-dasharray: L; stroke-dashoffset: L` → `0` | 300ms × số chặng, trong khoảng 600–1600ms | `--ease-in-out` | Cho thấy hướng đi và thứ tự | Vẽ ngay. **Xong thì gỡ `stroke-dasharray`**, nếu không phóng/thu bản đồ (Leaflet vẽ lại `d`) sẽ làm hỏng nét. Huỷ nếu chọn tuyến khác giữa chừng. |
| 6b | Ghim điểm dừng | Khi nét vẽ tới chặng tương ứng | `opacity 0, scale(.6)` → `1, scale(1)` | 220ms | `--ease-out` | Điểm dừng hiện đúng lúc đường tới | Hiện ngay |
| 6c | Ghim không thuộc tuyến | Chọn lộ trình | `opacity 1` → `.45` | 280ms | `--ease-out` | Làm nổi tuyến | Đổi ngay |
| 6d | Story line ở D | Thẻ lớn vào khung nhìn, hoặc vừa đổi lộ trình | Như 6a trên SVG ngang/dọc; chấm điểm dừng như 6b | 900ms | `--ease-in-out` | Kể lộ trình như một câu chuyện | Hiện ngay |
| 7 | Lớp nổi 1 ở hero `.fx-float` | Liên tục khi hero trong khung nhìn | `translateY(0)` ↔ `translateY(-6px)` | 6s, luân phiên | `ease-in-out` | Cảm giác lớp thông tin nằm trên ảnh | Tắt dưới 1024px, khi giảm chuyển động, và tạm dừng (`animation-play-state: paused`) khi hero ra khỏi khung nhìn. Chỉ một phần tử trên cả trang. |
| 8a | Nút | `:active` | `scale(1)` → `scale(.97)` | 100ms vào, 180ms ra | `--ease-out` | Phản hồi nhấn | Giữ (rất nhỏ) |
| 8b | Chip lọc | Chọn / bỏ chọn | nền và chữ đổi màu; icon ✓ `scale(0)` → `scale(1)` | 180ms | `--ease-out` | Xác nhận đã chọn | Đổi ngay |
| 8c | Thẻ trong B | Đổi bộ lọc | Thẻ ở lại trượt tới vị trí mới (Motion `layout`); thẻ ra `opacity → 0` 150ms; thẻ vào `opacity 0, scale(.96)` → `1, 1` | 600ms | `--ease-out` | Thấy cái gì bị lọc đi | Đổi ngay, không layout animation |
| 8d | Sao trong `ChonSao` | hover / chọn | hover: tô màu tới sao đang trỏ (100ms). Chọn: sao vừa bấm `scale(1)` → `1.25` → `1` | 220ms | `--ease-pop` | Niềm vui nhỏ khi chấm điểm | Chỉ đổi màu |
| 8e | Thanh phân bố sao | Vào khung nhìn | `width: 0` → `n%` (trong rãnh cố định), trễ 60ms/thanh | 700ms | `--ease-out` | Đọc phân bố như một biểu đồ | Hiện ngay |
| 8f | Nút gửi đánh giá / phản ánh | Gửi thành công | spinner → dấu ✓ vẽ nét (`stroke-dashoffset`) | 300ms | `--ease-out` | Xác nhận đã gửi | Hiện ✓ ngay |
| 8g | Nav | Cuộn qua 64px | nền trong suốt → ivory; chữ ivory → ink | 280ms | `--ease-out` | Giữ chữ nav đọc được khi rời ảnh | Đổi ngay |
| 8h | `PanelBanDo` | Đổi điểm / tuyến | nội dung cũ `opacity → 0` 120ms, nội dung mới `opacity 0, translateY(8px)` → `1, 0` | 280ms | `--ease-out` | Cho biết panel vừa đổi | Đổi ngay |
| 9 | Chuyển giữa các section | — | **Không animate.** Chuyển từ nền ivory sang forest ở C là một cạnh thẳng, không có sóng hay đường cong trang trí | — | — | Mảng màu tự tạo nhịp | — |
| 9b | Trang `/lo-trinh/:id` | Cuộn danh sách điểm dừng | Bản đồ dính bên trái; điểm dừng nằm giữa khung nhìn được đánh dấu, bản đồ `panTo` điểm đó | `panTo` 500ms | `--ease-in-out` | Kể chuyện theo lộ trình | `panTo` không animate |
| 10 | Tải trang | — | **Không có màn hình chờ toàn trang** (dữ liệu nhỏ, màn chờ chỉ làm chậm LCP). Thẻ dùng skeleton đúng kích thước thật. Đổi trang: `opacity 0 → 1` 150ms. | 150ms | `--ease-out` | Không có lý do dùng loader | Đổi ngay |

---

## 6. Quy tắc responsive

| Mốc | Khoảng | Gutter | Section padding (trên/dưới) | Lưới |
|---|---|---|---|---|
| Mobile | < 640px | 16px | 48px | 4 cột |
| Tablet | 640–1023px | 24px | 64px | 6 cột |
| Desktop | 1024–1439px | 32px | 96px | 12 cột, khung 1280px |
| Rộng | ≥ 1440px | 32px | 128px | 12 cột, khung 1280px; hero và mảng C vẫn tràn viền |

Theo từng section:

| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| Nav | Ngang đủ mục | Ngang, bớt "Phản ánh" vào menu "Thêm" | Logo + nút menu; menu toàn màn hình, focus bị giữ trong menu, Esc để đóng |
| A Hero | `min(92vh, 860px)`, chữ cột 1–7, 2 lớp nổi | 80vh, chữ 10/12 cột, lớp nổi 1 thành thanh, lớp nổi 2 ẩn | Ảnh 56vh, ô tìm kiếm đè mép ảnh, nút rộng hết khung, lớp nổi thành một dòng chữ |
| B Khám phá | Bento 12 cột | Bento 6 cột | Danh sách thẻ gọn một cột; chip cuộn ngang |
| C Bản đồ | Bản đồ 8 cột cao 640px + panel 4 cột | Bản đồ cao 520px, panel bên dưới | Bản đồ 60vh, panel bên dưới, cần chạm để kích hoạt kéo |
| D Lộ trình | 1 lớn (7 cột) + 2 nhỏ xếp dọc (5 cột) | 1 lớn trên, 2 nhỏ hai cột dưới | 1 lớn trên, 2 nhỏ cuộn ngang; story line dọc |
| E Đánh giá | Tổng hợp 4 cột (dính) + thẻ 8 cột (2 cột thẻ) | Tổng hợp trên, thẻ 2 cột | Tổng hợp trên, thẻ 1 cột, 3 thẻ đầu |
| F Chân trang | 3 cột | 2 cột (số điện thoại xuống dưới) | 1 cột, số điện thoại lên đầu |

Quy tắc chung:

- Không có thanh cuộn ngang ở 320px. Ô cuộn ngang (chip, lộ trình nhỏ) nằm gọn trong khung và có mép mờ báo còn nội dung.
- Vùng chạm tối thiểu 44 × 44px trên thiết bị cảm ứng.
- Ảnh có `width`/`height` hoặc `aspect-ratio` cố định để không xô bố cục.
- Hiệu ứng phụ thuộc chuột (hover, tilt) chỉ bật trong `@media (hover: hover) and (pointer: fine)`.
- Thử ở chế độ phóng chữ 200%: không chữ nào bị cắt, nút không vỡ dòng xấu.
- `100vh` trên mobile dùng `100svh` để thanh địa chỉ không che nội dung.

---

## 7. Design token và quy tắc CSS

### 7.1 Token (tệp mới `src/styles/tokens.css`, nạp đầu `globals.css`)

```css
:root {
  /* màu — giá trị RGB rời để Tailwind ghép độ mờ: rgb(var(--c-forest) / <alpha-value>) */
  --c-forest: 18 60 53;          /* #123C35 */
  --c-forest-raised: 28 56 49;   /* #1C3831 */
  --c-emerald: 28 140 114;       /* #1C8C72 */
  --c-action: 21 122 99;         /* #157A63 */
  --c-action-hover: 17 101 83;   /* #116553 */
  --c-on-action: 255 255 255;
  --c-bg: 247 245 239;           /* #F7F5EF ivory */
  --c-surface: 255 255 255;      /* paper */
  --c-sunken: 239 235 225;       /* #EFEBE1 */
  --c-ink: 25 37 34;             /* #192522 */
  --c-ink-2: 62 76 72;           /* #3E4C48 */
  --c-muted: 91 107 102;         /* #5B6B66 */
  --c-line: 221 216 204;         /* #DDD8CC trang trí */
  --c-line-strong: 124 138 133;  /* #7C8A85 viền ô nhập */
  --c-coral: 241 124 91;         /* #F17C5B */
  --c-route: 212 85 47;          /* #D4552F */
  --c-star: 154 107 18;          /* #9A6B12 */
  --c-gold: 234 191 103;         /* #EABF67 */
  --c-danger: 180 35 24;
  --c-danger-bg: 253 236 234;
  --c-warning-bg: 252 239 199;

  /* chữ */
  --font-serif: "Newsreader", "Noto Serif Display", Georgia, serif;
  --font-sans: "Be Vietnam Pro", system-ui, -apple-system, sans-serif;
  --fs-hero: clamp(2.75rem, 1.5rem + 4.4vw, 5.25rem);
  --fs-h2: clamp(2rem, 1.45rem + 2vw, 3rem);
  --fs-h3: clamp(1.5rem, 1.3rem + 0.8vw, 1.875rem);
  --fs-num: clamp(2.5rem, 2rem + 2vw, 3.5rem);
  --fs-title: 1.125rem;
  --fs-lead: 1.125rem;
  --fs-body: 1rem;
  --fs-small: 0.875rem;
  --fs-caption: 0.8125rem;

  /* khoảng cách, bội số 4px */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px; --sp-5: 24px;
  --sp-6: 32px; --sp-7: 48px; --sp-8: 64px; --sp-9: 96px; --sp-10: 128px;

  /* bo góc theo thứ bậc: phần tử càng lớn bo càng nhiều; góc trong = góc ngoài − padding */
  --r-xs: 6px;    /* badge, điểm cuối tuyến */
  --r-sm: 10px;   /* nút, ô nhập */
  --r-md: 16px;   /* thẻ thường, panel */
  --r-lg: 24px;   /* thẻ lớn, khung bản đồ, ô tìm kiếm hero */
  --r-pill: 999px;/* chip */

  /* bóng nhuộm forest, không dùng xám thuần và không phát sáng */
  --sh-1: 0 1px 2px rgb(18 60 53 / .08), 0 1px 1px rgb(18 60 53 / .04);
  --sh-2: 0 10px 30px -12px rgb(18 60 53 / .25);
  --sh-3: 0 24px 60px -20px rgb(18 60 53 / .35);

  /* kính mờ: CHỈ cho ô tìm kiếm hero và nút điều khiển bản đồ */
  --glass-bg: rgb(247 245 239 / .86);   /* ≥ .86 để chữ phụ vẫn đạt tương phản trên ảnh tối */
  --glass-blur: 16px;
  --glass-border: rgb(255 255 255 / .4);

  /* chuyển động */
  --dur-instant: 100ms; --dur-fast: 180ms; --dur-base: 280ms; --dur-slow: 600ms; --dur-cinema: 1100ms;
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
  --ease-pop: cubic-bezier(.34, 1.56, .64, 1);

  /* lớp chồng */
  --z-raised: 10; --z-map-ui: 1000; --z-nav: 1100; --z-dialog: 1200; --z-toast: 1300;
}

.dark {
  --c-bg: 14 31 27;              /* #0E1F1B */
  --c-surface: 28 56 49;         /* #1C3831 */
  --c-sunken: 22 44 39;
  --c-ink: 247 245 239;
  --c-ink-2: 214 222 218;
  --c-muted: 169 184 178;        /* #A9B8B2 */
  --c-line: 44 74 66;
  --c-line-strong: 120 140 133;
  --c-action: 69 184 151;        /* #45B897 */
  --c-action-hover: 98 201 171;
  --c-on-action: 25 37 34;       /* chữ ink trên nút sáng */
  --c-star: 234 191 103;
  /* --c-route giữ nguyên: nền bản đồ OSM vẫn sáng */
}
```

Nối vào `tailwind.config.js`: `colors.forest = 'rgb(var(--c-forest) / <alpha-value>)'`… cho từng token; `fontFamily.serif/sans`; `borderRadius`, `boxShadow`, `transitionTimingFunction`, `transitionDuration` trỏ tới biến tương ứng. Bỏ các thang `primary/secondary/accent` cũ ở phía người dân; khu quản trị đang dùng `primary-*` thì giữ tạm, đổi dần sau.

### 7.2 Quy tắc CSS

1. **Tailwind cho bố cục và khoảng cách.** Lớp component trong `@layer components` chỉ cho mẫu lặp nhiều thuộc tính: `.glass`, `.chip`, `.the`, `.nut`, `.focus-ring`.
2. **Một lớp một selector.** Không ghép kiểu `section .cta` hay `.card.featured h3`. Độ đặc hiệu tối đa: một lớp + một thuộc tính trạng thái.
3. **Trạng thái bằng thuộc tính, không bằng lớp phụ:** `[aria-pressed="true"]`, `[aria-current="page"]`, `[data-state="selected|loading|error"]`, `:disabled`, `:focus-visible`. Tailwind: `aria-pressed:bg-action`, `data-[state=selected]:ring-2`.
4. **Tách trang trí và chức năng.** Mọi chuyển động trang trí mang tiền tố `fx-` (`fx-parallax`, `fx-float`, `fx-tilt`, `fx-reveal`), tắt tập trung ở một chỗ:

   ```css
   @media (prefers-reduced-motion: reduce) {
     .fx-parallax, .fx-float, .fx-tilt { animation: none; transform: none; }
     .fx-reveal { opacity: 1; transform: none; transition: none; }
   }
   ```

   Trạng thái chức năng (đang chọn, focus, lỗi) **không bao giờ** phụ thuộc vào chuyển động: tắt hết animation vẫn thấy rõ.
5. **Không dùng `!important`.** Ngoại lệ duy nhất là khối giảm chuyển động toàn cục trong `@layer base` (đã có ở `globals.css`).
6. **Không trùng selector.** Một component định nghĩa ở một nơi. Trước khi thêm lớp mới, tìm lớp cũ.
7. **Khoảng cách giữa section** chỉ đặt bằng `padding-block` của chính section (`py-[var(--sp-9)]`), không đặt `margin-top` ở phần tử con đầu tiên, để tránh cộng dồn.
8. **Focus:** `outline: 2px solid rgb(var(--c-action)); outline-offset: 2px;`. Không `outline: none` khi chưa có thay thế.
9. **Kính mờ có dự phòng:** `@supports not (backdrop-filter: blur(1px)) { .glass { background: rgb(var(--c-bg)); } }`.
10. **Màu luôn qua token**, không viết hex trong component (trừ tệp token và `BanDo.tsx` khi truyền màu cho Leaflet, lấy bằng `getComputedStyle`).
11. Đặt tên theo cách đang dùng trong dự án: component và biến tiếng Việt không dấu (`TheDiaDiem`, `PanelBanDo`).

---

## 8. Checklist nghiệm thu bằng ảnh chụp

Chụp bằng Playwright (Chromium có sẵn ở `/opt/pw-browsers`), đặt tên `chup/<khung>-<theme>-<ngon-ngu>-<trang-thai>.png`.

Khung chụp: **1440×900**, **1024×768**, **768×1024**, **390×844**, **320×640** (chỉ để kiểm tra tràn).

Bộ ảnh bắt buộc (light, vi; trừ khi ghi khác):

| # | Ảnh | Khung |
|---|---|---|
| 1 | Hero đã tải xong, có ảnh thật | cả 4 |
| 2 | Hero khi **không có ảnh** (nền forest + hình vẽ nét) | 1440, 390 |
| 3 | Ô tìm kiếm đang gõ, có gợi ý; và không có kết quả | 1440, 390 |
| 4 | B với "Tất cả"; với một vùng + một loại đang chọn; lọc ra rỗng | 1440, 768, 390 |
| 5 | Thẻ đang hover và đang focus bằng bàn phím | 1440 |
| 6 | C chưa chọn gì; chọn một điểm; chọn một lộ trình (tuyến đã vẽ xong) | 1440, 768, 390 |
| 7 | C trên mobile trước và sau khi chạm kích hoạt | 390 |
| 8 | D mặc định; sau khi chọn lộ trình thứ hai | 1440, 390 |
| 9 | E **trạng thái trống thật** | 1440, 390 |
| 10 | E với dữ liệu minh hoạ (thấy rõ nhãn "Dữ liệu minh hoạ") | 1440, 390 |
| 11 | Form đánh giá: lỗi chưa chọn sao; đang gửi; gửi xong | 390 |
| 12 | F chân trang | 1440, 390 |
| 13 | Toàn trang dark mode | 1440, 390 |
| 14 | Toàn trang tiếng Anh | 1440, 390 |
| 15 | Toàn trang với `reducedMotion: 'reduce'` ngay sau khi tải (mọi thứ phải hiện đủ) | 1440 |

Điều kiện đạt:

**Dữ liệu trung thực**
- [ ] Mọi con số trên trang khớp với API (đối chiếu bằng `curl`). Không có số viết cứng.
- [ ] Không có đánh giá, ảnh, thời gian di chuyển hay phương tiện nào không có trong cơ sở dữ liệu, trừ khi đang ở chế độ minh hoạ và có nhãn.
- [ ] Khoảng cách luôn kèm chữ "đường chim bay". Không có chữ "định vị", "dẫn đường", "GPS".
- [ ] Ảnh nào cũng có chú thích tác giả/nguồn.

**Thị giác**
- [ ] Không có gradient trang trí, chữ gradient, viền phát sáng, bóng màu. (Scrim hero là ngoại lệ chức năng.)
- [ ] Kính mờ chỉ xuất hiện ở ô tìm kiếm hero và nút điều khiển bản đồ.
- [ ] San hô chỉ ở tuyến, điểm dừng, nút "Xem lộ trình". Vàng chỉ ở sao.
- [ ] Không có nhãn VIẾT HOA toàn bộ, chuỗi "A · B · C", nút có "→".
- [ ] Bo góc đúng thứ bậc (chip tròn, nút 10px, thẻ 16px, khung lớn 24px).
- [ ] Dấu tiếng Việt ở tiêu đề serif không bị cắt (kiểm bằng chuỗi: "Ặ Ỗ Ữ Ế Ậ — Đắk Mai, Bửu Long, Chứa Chan" ở `--fs-hero`).
- [ ] Hai thẻ cạnh nhau trong bento không cùng kích thước ở hàng đầu.

**Tiếp cận**
- [ ] Chữ thường ≥ 4.5:1, chữ lớn và đường nét ≥ 3:1 (đo bằng axe hoặc Lighthouse), kể cả chữ trên ảnh hero.
- [ ] Tab qua toàn trang: thấy vòng focus ở mọi phần tử, thứ tự hợp lý, menu mobile giữ focus.
- [ ] Chọn sao bằng bàn phím được.
- [ ] Lighthouse Accessibility ≥ 95.

**Bố cục**
- [ ] Không cuộn ngang ở 320px và 390px.
- [ ] Vùng chạm ≥ 44px trên mobile.
- [ ] Lớp Leaflet không đè thanh điều hướng khi cuộn.
- [ ] Bản đồ không giữ cuộn trang trên mobile trước khi kích hoạt.

**Chuyển động và hiệu năng**
- [ ] Giảm chuyển động: không có gì chạy, không có gì bị ẩn.
- [ ] Tuyến vẽ xong rồi phóng to/thu nhỏ bản đồ: nét vẫn liền.
- [ ] Lighthouse mobile (4G giả lập): LCP < 2.5s, CLS < 0.1, TBT < 200ms.
- [ ] Bản build production không chứa dữ liệu minh hoạ (`grep -r "MINH_HOA_SENTINEL" dist/` trả rỗng).

**Kiểm thử hiện có**
- [ ] `npm run build` (có `tsc`) qua, `cd server && npm test` qua (54 bài).

---

## 9. Ảnh: tài sản cần có và quy tắc chọn

### 9.1 Danh sách

| Tài sản | Số lượng | Tỉ lệ / kích thước | Lấy từ đâu trong hệ thống |
|---|---|---|---|
| Ảnh hero | dùng ảnh có sẵn | 16:9 hoặc rộng hơn, cạnh dài ≥ 1600px (giới hạn hiện tại khi tải lên) | Ảnh **đầu tiên** của một điểm `noiBat` có ảnh, chọn ngẫu nhiên mỗi lần tải. Cán bộ điều khiển bằng cờ "nổi bật" và thứ tự ảnh hiện có. |
| Ảnh điểm đến | 1–8 ảnh mỗi điểm, 15 điểm | ngang 3:2, ≥ 1600px | Cán bộ tải lên ở Quản trị → Địa điểm → Sửa (đã có) |
| Ảnh bìa lộ trình | 3 | 4:3 | Tự lấy: ảnh đầu của điểm dừng đầu tiên có ảnh |
| Ảnh chia sẻ (Open Graph) | 1 | 1200×630 | Tệp tĩnh `public/og.jpg` (chọn từ ảnh thật đạt tiêu chí dưới đây) |
| Hình vẽ nét dự phòng | 1 bộ | SVG | `Canh.tsx`, `Tranh.tsx` vẽ lại theo bảng màu mới, tĩnh |
| Icon | — | — | lucide-react (đang dùng), nét 1.75px |

### 9.2 Quy tắc chọn ảnh

Được dùng:
- Ảnh **đúng địa điểm ở Đồng Nai** mà nó gắn vào.
- Ảnh do cơ quan, cán bộ chụp; ảnh của Sở Văn hoá – Thể thao và Du lịch hoặc ban quản lý khu du lịch khi được phép; ảnh Wikimedia Commons giấy phép CC0, CC BY, CC BY-SA.
- Ghi vào ô **Chú thích** khi tải lên: `Mô tả ngắn. Ảnh: Tác giả, Giấy phép`. Giao diện hiện chú thích này dưới ảnh hero và ảnh chi tiết.

Không được dùng:
- Ảnh nơi khác gán cho Đồng Nai (ví dụ rừng thông Đà Lạt cho "rừng Cát Tiên").
- Ảnh do AI tạo ra mô tả một địa điểm có thật.
- Ảnh có watermark, logo thương mại, chữ đè.
- Ảnh có người nhận ra được mặt mà chưa có sự đồng ý.
- Ảnh HDR quá tay, màu teal-cam, lọc màu nặng.

Tiêu chí thẩm mỹ (để ảnh nhìn như cùng một tạp chí):
- Ánh sáng sáng sớm hoặc chiều muộn; màu tự nhiên; đường chân trời thẳng.
- Chủ thể nhận ra được ngay (thác, hồ, mái văn miếu), không phải cảnh chung chung.
- **Ảnh hero:** phần dưới bên trái tương đối tối hoặc đồng màu (nơi đặt chữ), không có mảng trời trắng cháy ở đó; chủ thể nằm ở một phần ba bên phải.
- Đa dạng: nước, rừng, di tích, đời sống; tránh ba ảnh hồ liền nhau trong bento.

Kỹ thuật:
- Ảnh tải lên đã được thu nhỏ còn cạnh dài 1600px JPEG trên trình duyệt (đã có). Hero hiển thị ảnh 1600px với `object-fit: cover`, `fetchpriority="high"`, **không** `loading="lazy"`; các ảnh khác `loading="lazy"` và `decoding="async"`.
- Luôn có `width`, `height` (lấy từ cột `rong`, `cao`) để tránh xô bố cục.
- `alt` tả nội dung ảnh ("Thác Đắk Mai đổ xuống giữa rừng"), không phải "ảnh 1". Ảnh nền trang trí thì `alt=""`.

---

## 10. Dữ liệu mẫu: thật và minh họa

### 10.1 Dữ liệu thật đang có (dùng được ngay, hiện trên bản production)

| Dữ liệu | Nguồn | Hiện trạng |
|---|---|---|
| 15 điểm đến: tên vi/en, loại, mô tả vi/en, toạ độ, địa chỉ, cờ nổi bật | `dia_diem` (seed) | Toạ độ từ OpenStreetMap; mô tả đang chờ cán bộ xác nhận (`da_kiem_tra = 0`); **chưa có** giờ mở cửa, số điện thoại |
| 9 xã, phường; gán điểm vào xã | `xa_phuong`, `dia_diem.xa_phuong_id` | 12/15 điểm đã gán; núi Bà Rá, núi Chứa Chan, cù lao Phố chờ cán bộ chọn |
| 3 lộ trình với điểm dừng, ngày, thời lượng chữ | `lich_trinh`, `lich_trinh_diem` | "1 ngày", "2 ngày 1 đêm", "2 ngày" |
| Khoảng cách giữa các điểm dừng | Tính từ toạ độ (haversine, `khoangCachKm`) | Là số **dẫn xuất từ dữ liệu thật**, phải ghi "đường chim bay" |
| Số điện thoại khẩn cấp 113, 114, 115, 112 | `tin_tuc` loại `lien-he` | Có |
| Đánh giá | `danh_gia` | **0** trên bản cài mới. Hiện đúng 0: trạng thái trống |
| Ảnh | `anh_dia_diem` | **0** trên bản cài mới. Hiện hình vẽ nét dự phòng |
| Lượt khách theo xã | Bảng 1 phụ lục, chỉ xã đã chốt | Tuỳ cán bộ nhập |

### 10.2 Thay đổi dữ liệu cần làm trước (backend, nhỏ)

| # | Thay đổi | Lý do | Giá trị ban đầu |
|---|---|---|---|
| 1 | `dia_diem.vung` ENUM(`ven-song`, `mien-dong`, `phia-bac`) NULL; thêm ô chọn ở Quản trị → Địa điểm; trả `vung` ở `/api/dia-diem` | Bộ lọc "vùng" ở B. Không suy ra từ toạ độ phía giao diện (dễ sai, không sửa được) | Seed theo toạ độ thật: **Ven sông Đồng Nai** (6): Văn miếu Trấn Biên, Đền thờ Nguyễn Hữu Cảnh, KDL Bửu Long, Cù lao Phố, KDL Bò Cạp Vàng, Thác Giang Điền. **Hồ, rừng và núi miền đông** (4): Hồ Trị An, VQG Cát Tiên, KDL Suối Mơ, Núi Chứa Chan. **Miền đất đỏ phía bắc** (5): Núi Bà Rá, Sóc Bom Bo, Thác Đắk Mai, VQG Bù Gia Mập, Hồ Suối Lam. Tên vùng là đề xuất; cán bộ có thể đổi nhãn. |
| 2 | `lich_trinh.phuong_tien` VARCHAR(60) NULL (+ `phuong_tien_en`); ô nhập ở Quản trị → Lộ trình | Brief yêu cầu hiện phương tiện | **NULL** cho cả 3 lộ trình. Cán bộ điền; trống thì giao diện ẩn dòng này |
| 3 | `GET /api/danh-gia/moi-nhat?gioiHan=6`: đánh giá mới nhất, chưa bị ẩn, kèm `diaDiemId`, tên điểm vi/en | Khối E cần danh sách đánh giá trên toàn bộ các điểm | — |

Câu SQL phải theo đúng kiểu tệp `database/du_lich_dong_nai.sql`: chạy lại nhiều lần không lỗi (kiểm cột qua `information_schema` trước khi `ALTER`). Thêm bảng/cột mới vào danh sách kiểm tra lúc khởi động trong `server/src/index.js`. Viết kiểm thử cho endpoint mới.

### 10.3 Dữ liệu minh hoạ (chỉ để trình diễn và chụp nghiệm thu)

**Quy tắc cứng:**

1. Dữ liệu minh hoạ **không bao giờ** ghi vào cơ sở dữ liệu, kể cả cơ sở dữ liệu thử. Không có tệp SQL minh hoạ.
2. Nằm trong `src/minh-hoa/duLieuMinhHoa.ts`, chỉ nạp khi `import.meta.env.DEV` **và** URL có `?minh-hoa=1`. Nạp bằng `import()` động bên trong nhánh `if (import.meta.env.DEV)` để Vite loại hẳn khỏi bản build production. Tệp chứa hằng `MINH_HOA_SENTINEL` để kiểm tra (mục 8).
3. Mỗi bản ghi có `minhHoa: true`. Component gặp cờ này thì hiện `NhanMinhHoa` ("Minh hoạ") trên chính bản ghi đó.
4. Khi chế độ minh hoạ bật: dải cố định đầu trang "Đang xem dữ liệu minh hoạ. Đánh giá, ảnh và phương tiện dưới đây không có thật." Dải này không tắt được.
5. Không dùng họ tên người thật hay họ tên đầy đủ trông như thật. Tên hiển thị dạng "Khách minh hoạ 1".
6. Không trộn: một khối hoặc dùng toàn dữ liệu thật, hoặc toàn dữ liệu minh hoạ. Khối tổng hợp đánh giá ở chế độ minh hoạ tính từ chính dữ liệu minh hoạ.

**Nội dung cần có:**

| Bộ | Nội dung | Mục đích kiểm tra |
|---|---|---|
| Đánh giá | 24 đánh giá trên 6 điểm (Hồ Trị An 7, VQG Cát Tiên 5, Văn miếu Trấn Biên 4, Thác Đắk Mai 4, KDL Bửu Long 3, Cù lao Phố 1). Phân bố 5★: 10, 4★: 8, 3★: 4, 2★: 1, 1★: 1. Có đủ 4 tiêu chí ở 18 bài, thiếu tiêu chí ở 6 bài. `diCung` đủ 4 giá trị và có bài để trống. `thoiDiem` rải từ 2025-11 đến 2026-09. | Phân bố lệch thật, thanh dài ngắn khác nhau; điểm có 1 đánh giá |
| Độ dài nhận xét | 4 bài không có nhận xét; 10 bài 1–2 câu; 7 bài 3–4 câu; 3 bài dài đúng 500 ký tự (giới hạn) | Cắt 4 dòng + "Xem thêm" |
| Tên hiển thị | 15 bài "Khách minh hoạ N"; 6 bài để trống (hiện "Ẩn danh"); 3 bài tên dài 40 ký tự: "Khách minh hoạ có tên hiển thị rất dài 40" | Tràn chữ trên thẻ hẹp |
| Chữ khó | Ít nhất 3 bài có dấu chồng và chữ hoa đầu câu: "Ở đây…", "Ước gì…", "Đường vào thác Đắk Mai…" | Dấu tiếng Việt không bị cắt |
| Tiếng Anh | 4 bài viết bằng tiếng Anh | Giao diện song ngữ không vỡ |
| Báo vi phạm | 1 bài ở trạng thái "đã báo" | Trạng thái nút |
| Lộ trình | Giữ nguyên 3 lộ trình thật; chỉ thêm `phuongTien` minh hoạ ("Ô tô hoặc xe máy", "Xe máy", "Ô tô") có nhãn. Thêm 1 lộ trình minh hoạ "Lộ trình minh hoạ 3 ngày" gồm 7 điểm dừng thật nối từ cù lao Phố lên Bù Gia Mập | Story line dài, nhiều ngày, panel bản đồ cuộn được |
| Ảnh | **Không** dùng ảnh không rõ nguồn. Hoặc khung "Ảnh minh hoạ" màu `sunken` đúng tỉ lệ, hoặc ảnh Wikimedia Commons có giấy phép tự do kèm tác giả, ghi nguồn từng ảnh trong `docs/nguon-anh.md` | Bố cục có ảnh, kiểm tra scrim và tương phản hero |

**Không cần minh hoạ** (dùng dữ liệu thật): 15 điểm đến, toạ độ, tuyến, khoảng cách, số điện thoại khẩn cấp, xã/phường.

---

## Ràng buộc dữ liệu (đọc trước khi dựng)

- **Không lộ dữ liệu nội bộ.** Các endpoint công khai chỉ là những gì `server/src/routes/cong-khai.js` đang trả. Không gọi `/api/quan-tri/*` từ trang công khai. Không hiện: số liên hệ người gửi phản ánh, tên chủ cơ sở lưu trú, các bảng phụ lục nhạy cảm (4, 7, 7a, 8, 9, 10).
- **Phản ánh:** người dân chỉ gửi, **không có tra cứu kết quả** và không hiện mã tra cứu. Không thiết kế ô "Tra cứu phản ánh".
- **Không vị trí người dùng:** không xin quyền định vị, không chấm "Bạn ở đây".
- Mọi chữ hiển thị đi qua `t()` của `useNN()`; thêm khoá mới vào `src/i18n/NgonNgu.tsx` cho cả vi và en.

## Thứ tự làm việc đề xuất

1. Backend nhỏ ở mục 10.2 + kiểm thử.
2. `tokens.css`, nối vào Tailwind, nạp font, gỡ hiệu ứng cũ (danh sách dưới).
3. Component nền: `Nut`, `ChipLoc`, `TheDiaDiem`, `KhungAnhCho`, `HienSao`, `ChonSao`, `NhanMinhHoa`.
4. Tách `HomePage.tsx` thành `src/components/trang-chu/{Hero,KhamPha,BanDoTuongTac,LoTrinhNoiBat,DanhGia}.tsx`.
5. Bản đồ: ghim mới, vẽ tuyến (6a–6c), chạm để kích hoạt trên mobile.
6. Chuyển động theo mục 5, cuối cùng mới thêm Motion for React.
7. Chế độ minh hoạ, rồi chụp nghiệm thu theo mục 8.
8. Áp token và component cho các trang công khai còn lại.

## Gỡ bỏ khỏi giao diện cũ

Ở `src/styles/globals.css` và `tailwind.config.js`, phía người dân không dùng nữa: `.text-gradient`, `.animate-gradient`, `.btn-shine`, `.animate-glow`, `.border-glow`, `shadow-glow`, `.animate-ripple`, `.icon-pop`, `.tilt-3d` (thay bằng `.fx-tilt` có giới hạn), `.animate-float` (thay bằng `.fx-float`, một phần tử), mây và chim bay trong hero (`.may`, `.may2`, `.chim`, `.chim2`), gradient nền hero, màu marker theo loại hình (thay bằng icon). Giữ: `.hien-dan` (đổi tên thành `.fx-reveal`), `.skeleton`, `.container-page`, `.tuyen`, `.so-chang` (vẽ lại), khối giảm chuyển động. Kiểm tra khu quản trị trước khi xoá lớp nào nó còn dùng.
