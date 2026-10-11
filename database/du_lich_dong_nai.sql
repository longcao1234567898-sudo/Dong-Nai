-- ============================================================================
-- DU LỊCH ĐỒNG NAI — TOÀN BỘ CƠ SỞ DỮ LIỆU
-- ============================================================================
--
-- Tên gọi đúng là THÀNH PHỐ ĐỒNG NAI: theo Nghị quyết 30/2026/QH16, từ
-- 30/4/2026 Đồng Nai là thành phố trực thuộc Trung ương (sau khi hợp nhất với
-- Bình Phước năm 2025).
--
-- Ba bảng staff, refresh_tokens, staff_activity_logs giữ ĐÚNG cấu trúc của
-- Điểm Chạm An Ninh, để dùng lại nguyên phần đăng nhập cán bộ đã kiểm chứng
-- (bcrypt, JWT, đếm sai, khoá tạm, xác minh Turnstile).
--
-- CHẠY: HeidiSQL -> dán toàn bộ -> F9. Tạo tài khoản cán bộ bằng lệnh
--       node scripts-them-can-bo.js (xem README), KHÔNG có tài khoản mặc định.
--
-- CHẠY LẠI ĐƯỢC NHIỀU LẦN: mọi lệnh đều "nếu chưa có thì tạo", nên khi kho mã
-- có phiên bản mới, cứ dán lại toàn bộ tệp này rồi F9 là cơ sở dữ liệu được
-- nâng cấp tại chỗ — KHÔNG mất số liệu đã nhập.
-- ============================================================================

/* Khai bộ mã ngay đầu tệp: HeidiSQL tự dùng utf8mb4, nhưng nạp bằng công cụ
   dòng lệnh (mysql < tệp.sql) thì mặc định latin1 -> chữ tiếng Việt vỡ thành
   "thÃ¡ng" ngay trong cơ sở dữ liệu. */
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS du_lich_dong_nai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE du_lich_dong_nai;

-- ---------------------------------------------------------------- CÁN BỘ
CREATE TABLE IF NOT EXISTS staff (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  full_name       VARCHAR(100) NOT NULL,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  email           VARCHAR(100),
  phone           VARCHAR(20),
  role            ENUM('admin','manager','handler') NOT NULL DEFAULT 'handler'
                  COMMENT 'admin: quản trị · manager: chỉ huy · handler: cán bộ nhập liệu',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts INT NOT NULL DEFAULT 0 COMMENT 'Số lần nhập sai liên tiếp — từ 3 bắt xác minh',
  locked_until    DATETIME NULL       COMMENT 'Tạm khoá do nhập sai nhiều lần',
  last_login      DATETIME NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  staff_id    INT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 của refresh token, không lưu token thô',
  revoked     BOOLEAN DEFAULT FALSE,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- staff_id cho phép rỗng (khác bản gốc) để ghi được cả lần đăng nhập sai,
-- khi chưa biết là cán bộ nào.
CREATE TABLE IF NOT EXISTS staff_activity_logs (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  staff_id    INT NULL,
  action      VARCHAR(64) NOT NULL,
  target_type VARCHAR(50),
  target_id   VARCHAR(80),
  details     JSON,
  ip_address  VARCHAR(45),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- ĐỊA ĐIỂM
CREATE TABLE IF NOT EXISTS dia_diem (
  id           VARCHAR(80) PRIMARY KEY COMMENT 'Mã không dấu, ví dụ van-mieu-tran-bien',
  ten          VARCHAR(120) NOT NULL,
  loai         ENUM('thien-nhien','di-tich','vui-choi','luu-tru','am-thuc','dac-san') NOT NULL DEFAULT 'thien-nhien',
  mo_ta        TEXT,
  dia_chi      VARCHAR(200),
  lat          DECIMAL(10,7) NOT NULL,
  lng          DECIMAL(10,7) NOT NULL,
  sdt          VARCHAR(20),
  web          VARCHAR(200),
  gio_mo       VARCHAR(80),
  noi_bat      BOOLEAN NOT NULL DEFAULT FALSE,
  hien         BOOLEAN NOT NULL DEFAULT TRUE  COMMENT 'Ẩn thay vì xoá, để còn tra lại',
  da_kiem_tra  BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Cán bộ đã đối chiếu nguồn chính thức',
  nguon        VARCHAR(200),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hien (hien, loai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- LƯỢT KHÁCH
CREATE TABLE IF NOT EXISTS luot_khach (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  dia_diem_id  VARCHAR(80) NOT NULL,
  thang        CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  noi_dia      INT UNSIGNED NOT NULL DEFAULT 0,
  quoc_te      INT UNSIGNED NOT NULL DEFAULT 0,
  nguoi_nhap   INT NULL,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_diem_thang (dia_diem_id, thang) COMMENT 'Nhập lại cùng tháng thì ghi đè',
  FOREIGN KEY (dia_diem_id) REFERENCES dia_diem(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_nhap) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- ĐÁNH GIÁ
-- Mỗi thiết bị một đánh giá cho mỗi địa điểm (gửi lại thì sửa đánh giá cũ).
-- Không lưu mã thiết bị và địa chỉ IP thô — chỉ lưu bản băm có HASH_PEPPER.
CREATE TABLE IF NOT EXISTS danh_gia (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  dia_diem_id   VARCHAR(80) NOT NULL,
  ma_thiet_bi   CHAR(64) NOT NULL,
  ip_bam        CHAR(64),
  sao           TINYINT UNSIGNED NOT NULL,
  canh_quan     TINYINT UNSIGNED NULL,
  dich_vu       TINYINT UNSIGNED NULL,
  ve_sinh       TINYINT UNSIGNED NULL,
  gia_ca        TINYINT UNSIGNED NULL,
  di_cung       ENUM('gia-dinh','ban-be','cap-doi','mot-minh') NULL,
  thoi_diem     CHAR(7) NULL COMMENT 'Tháng đi, YYYY-MM',
  nhan_xet      VARCHAR(500),
  ten_hien_thi  VARCHAR(40),
  bi_an         BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Cán bộ ẩn đánh giá vi phạm',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_thiet_bi (dia_diem_id, ma_thiet_bi),
  FOREIGN KEY (dia_diem_id) REFERENCES dia_diem(id) ON DELETE CASCADE,
  CHECK (sao BETWEEN 1 AND 5),
  INDEX idx_hien (dia_diem_id, bi_an)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 15 ĐIỂM ĐẾN
-- Toạ độ từ OpenStreetMap; mô tả tổng hợp, đang ở trạng thái chờ cán bộ
-- kiểm tra. KHÔNG có số điện thoại, giờ mở cửa: cán bộ bổ sung từ nguồn
-- chính thức thay vì để thông tin đoán mò.
INSERT IGNORE INTO dia_diem (id, ten, loai, mo_ta, dia_chi, lat, lng, noi_bat, hien, da_kiem_tra, nguon) VALUES
  ('van-mieu-tran-bien', 'Văn miếu Trấn Biên', 'di-tich', 'Văn miếu đầu tiên ở vùng đất phương Nam, dựng năm 1715 để tôn vinh học vấn và những người có công với văn hoá. Công trình hiện nay được phục dựng trên nền cũ, thường tổ chức các hoạt động khuyến học.', 'Phường Trấn Biên, Thành phố Đồng Nai', 10.96451, 106.80159, 1, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('den-tho-nguyen-huu-canh', 'Đền thờ Nguyễn Hữu Cảnh', 'di-tich', 'Nơi thờ Lễ Thành hầu Nguyễn Hữu Cảnh, người có công lập nền hành chính vùng Đồng Nai – Gia Định cuối thế kỷ XVII. Đền nằm bên dòng sông Đồng Nai, gần cù lao Phố.', 'Phường Trấn Biên, Thành phố Đồng Nai', 10.93104, 106.82572, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('khu-du-lich-buu-long', 'Khu du lịch Bửu Long', 'vui-choi', 'Quần thể núi đá, hồ nước và chùa chiền ngay trong đô thị, thường được ví là "Hạ Long thu nhỏ". Có hồ Long Ẩn, chùa Bửu Phong trên núi và nhiều khu vui chơi.', 'Phường Trấn Biên, Thành phố Đồng Nai', 10.96298, 106.79369, 1, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('thac-giang-dien', 'Thác Giang Điền', 'thien-nhien', 'Quần thể thác nước nhiều tầng giữa rừng, là khu du lịch sinh thái quen thuộc cho dã ngoại cuối tuần và cắm trại.', 'Xã An Viễn, Thành phố Đồng Nai', 10.91417, 106.99365, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('khu-du-lich-suoi-mo', 'Khu du lịch Suối Mơ', 'thien-nhien', 'Khu du lịch sinh thái với suối và thác nước giữa rừng, phù hợp tắm suối và dã ngoại cùng gia đình.', 'Phường Tân Phú, Thành phố Đồng Nai', 11.22906, 107.44323, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('khu-du-lich-bo-cap-vang', 'Khu du lịch Bò Cạp Vàng', 'vui-choi', 'Khu du lịch sinh thái ven sông với vườn cây, ao hồ và trò chơi dân gian; từng được bình chọn vào nhóm mười điểm du lịch sinh thái được yêu thích năm 2024.', 'Xã Đại Phước, Thành phố Đồng Nai', 10.65952, 106.85652, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('ho-tri-an', 'Hồ Trị An', 'thien-nhien', 'Hồ thuỷ điện rộng lớn với nhiều đảo nhỏ, nổi tiếng với cảnh hoàng hôn và khu đảo Ó – Đồng Trường; phù hợp đi thuyền, cắm trại.', 'Xã La Ngà, Thành phố Đồng Nai', 11.18006, 107.15273, 1, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('vuon-quoc-gia-cat-tien', 'Vườn quốc gia Cát Tiên', 'thien-nhien', 'Rừng nhiệt đới đất thấp với hệ động thực vật phong phú, thuộc khu dự trữ sinh quyển thế giới. Phù hợp đi bộ xuyên rừng, xem chim và đạp xe.', 'Xã Đak Lua, Thành phố Đồng Nai', 11.45473, 107.31978, 1, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('thac-dak-mai', 'Thác Đắk Mai', 'thien-nhien', 'Thác nước trong Vườn quốc gia Bù Gia Mập, được vinh danh trong nhóm bảy điểm du lịch sinh thái có cảnh đẹp ấn tượng năm 2023.', 'Xã Bù Gia Mập, Thành phố Đồng Nai', 12.06235, 107.18418, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('vuon-quoc-gia-bu-gia-map', 'Vườn quốc gia Bù Gia Mập', 'thien-nhien', 'Khu rừng rộng lớn ở vùng biên giới phía bắc thành phố, còn nhiều rừng nguyên sinh và động vật hoang dã.', 'Xã Bù Gia Mập, Thành phố Đồng Nai', 12.18403, 107.15877, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('nui-ba-ra', 'Núi Bà Rá', 'thien-nhien', 'Ngọn núi biểu tượng của vùng Phước Long, gắn với di tích nhà tù Bà Rá. Từ trên cao ngắm được toàn cảnh vùng đồi xung quanh.', 'Thành phố Đồng Nai', 11.81753, 106.99988, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('nui-chua-chan', 'Núi Chứa Chan', 'thien-nhien', 'Ngọn núi cao ở vùng Xuân Lộc, có chùa Gia Lào trên sườn núi; là điểm leo núi và hành hương quen thuộc.', 'Thành phố Đồng Nai', 10.94111, 107.37937, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('cu-lao-pho', 'Cù lao Phố', 'di-tich', 'Cù lao trên sông Đồng Nai, từng là thương cảng sầm uất bậc nhất phương Nam thế kỷ XVII – XVIII; còn nhiều đình, chùa, miếu cổ.', 'Thành phố Đồng Nai', 10.93163, 106.83511, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('soc-bom-bo', 'Sóc Bom Bo', 'di-tich', 'Sóc của đồng bào S\'tiêng, gắn với câu chuyện giã gạo nuôi quân thời kháng chiến được kể trong bài hát "Tiếng chày trên sóc Bom Bo". Có khu bảo tồn văn hoá S\'tiêng.', 'Xã Bom Bo, Thành phố Đồng Nai', 11.83879, 107.19418, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.'),
  ('ho-suoi-lam', 'Hồ Suối Lam', 'thien-nhien', 'Hồ nước giữa đồi rừng, điểm dã ngoại và thư giãn cuối tuần của người dân địa phương.', 'Xã Thuận Lợi, Thành phố Đồng Nai', 11.60501, 106.88466, 0, 1, 0, 'Toạ độ: OpenStreetMap. Mô tả: tổng hợp, chờ cán bộ xác nhận.');


-- ============================================================================
-- GIAI ĐOẠN 1 — PHỤ LỤC THỐNG KÊ: XÃ/PHƯỜNG, KỲ BÁO CÁO, NỘP VÀ DUYỆT
-- ============================================================================
-- Phụ lục thống kê báo cáo theo XÃ/PHƯỜNG và theo KỲ (cả năm, 6 tháng...),
-- không theo từng địa điểm. MỘT QUYỀN DUY NHẤT: cán bộ nào có tài khoản cũng
-- nhập, sửa, chốt được số liệu của mọi xã/phường — mọi thao tác đều ghi nhật
-- ký và lịch sử sửa nên vẫn truy được ai làm gì.
--
-- Thêm cột vào bảng đã có bằng "câu lệnh chuẩn bị sẵn" có kiểm tra trước:
-- MySQL 8 không có ADD COLUMN IF NOT EXISTS, làm thế này thì chạy lại tệp bao
-- nhiêu lần cũng không báo lỗi trùng cột.

CREATE TABLE IF NOT EXISTS xa_phuong (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  ten         VARCHAR(80) NOT NULL COMMENT 'Tên không kèm chữ Xã/Phường, ví dụ: Trấn Biên',
  loai        ENUM('xa','phuong','dac-khu') NOT NULL DEFAULT 'xa',
  hien        BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Thôi theo dõi thì ẩn chứ không xoá — số liệu cũ vẫn còn',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ten (loai, ten)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dia_diem' AND COLUMN_NAME = 'xa_phuong_id');
SET @lenh := IF(@co = 0, 'ALTER TABLE dia_diem ADD COLUMN xa_phuong_id INT NULL AFTER dia_chi, ADD CONSTRAINT fk_dia_diem_xa FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE SET NULL', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

/* routes/auth.js ghi tên đăng nhập đã thử vào cột này mỗi lần đăng nhập sai,
   nhưng bảng chưa từng có cột -> lệnh ghi lỗi và bị bỏ qua, nhật ký mất hết
   dấu vết dò mật khẩu. Thêm cột để ghi được. */
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_activity_logs' AND COLUMN_NAME = 'attempted_username');
SET @lenh := IF(@co = 0, 'ALTER TABLE staff_activity_logs ADD COLUMN attempted_username VARCHAR(50) NULL AFTER details', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

/* Chỉ nạp những xã/phường đã có địa điểm du lịch. Danh sách đầy đủ các đơn vị
   hành chính của thành phố, cán bộ tự thêm trên web (mục Xã/phường) theo văn
   bản sắp xếp đơn vị hành chính chính thức — không đoán ở đây. */
INSERT IGNORE INTO xa_phuong (ten, loai) VALUES
  ('Trấn Biên', 'phuong'), ('Tân Phú', 'phuong'), ('An Viễn', 'xa'), ('Đại Phước', 'xa'), ('La Ngà', 'xa'),
  ('Đak Lua', 'xa'), ('Bù Gia Mập', 'xa'), ('Bom Bo', 'xa'), ('Thuận Lợi', 'xa');

/* Gắn địa điểm đã có với xã/phường theo địa chỉ. Núi Bà Rá, núi Chứa Chan, cù
   lao Phố chưa ghi rõ xã/phường nên để trống chờ cán bộ chọn. */
UPDATE dia_diem d JOIN xa_phuong x ON
     (x.loai = 'phuong' AND x.ten = 'Trấn Biên' AND d.id IN ('van-mieu-tran-bien', 'den-tho-nguyen-huu-canh', 'khu-du-lich-buu-long'))
  OR (x.loai = 'phuong' AND x.ten = 'Tân Phú' AND d.id = 'khu-du-lich-suoi-mo')
  OR (x.loai = 'xa' AND x.ten = 'An Viễn' AND d.id = 'thac-giang-dien')
  OR (x.loai = 'xa' AND x.ten = 'Đại Phước' AND d.id = 'khu-du-lich-bo-cap-vang')
  OR (x.loai = 'xa' AND x.ten = 'La Ngà' AND d.id = 'ho-tri-an')
  OR (x.loai = 'xa' AND x.ten = 'Đak Lua' AND d.id = 'vuon-quoc-gia-cat-tien')
  OR (x.loai = 'xa' AND x.ten = 'Bù Gia Mập' AND d.id IN ('thac-dak-mai', 'vuon-quoc-gia-bu-gia-map'))
  OR (x.loai = 'xa' AND x.ten = 'Bom Bo' AND d.id = 'soc-bom-bo')
  OR (x.loai = 'xa' AND x.ten = 'Thuận Lợi' AND d.id = 'ho-suoi-lam')
SET d.xa_phuong_id = x.id WHERE d.xa_phuong_id IS NULL;

CREATE TABLE IF NOT EXISTS ky_bao_cao (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  ten         VARCHAR(80) NOT NULL COMMENT 'Ví dụ: 6 tháng đầu năm 2026',
  tu_ngay     DATE NOT NULL,
  den_ngay    DATE NOT NULL,
  han_nop     DATE NULL,
  khoa        BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Đã khoá thì không ai sửa được số liệu của kỳ',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_khoang (tu_ngay, den_ngay),
  CHECK (den_ngay >= tu_ngay)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ky_bao_cao (ten, tu_ngay, den_ngay) VALUES
  ('Năm 2025', '2025-01-01', '2025-12-31'),
  ('6 tháng đầu năm 2026', '2026-01-01', '2026-06-30');

/* Mỗi xã/phường có MỘT báo cáo cho mỗi kỳ: dang-nhap -> da-chot.
   Đã chốt thì không ai sửa được số liệu kỳ đó của xã, muốn sửa phải "mở lại"
   và ghi lý do — để bảng theo dõi biết chắc xã nào đã xong. */
CREATE TABLE IF NOT EXISTS nop_bao_cao (
  ky_id          INT NOT NULL,
  xa_phuong_id   INT NOT NULL,
  trang_thai     ENUM('dang-nhap','da-chot') NOT NULL DEFAULT 'dang-nhap',
  nguoi_chot     INT NULL,
  chot_luc       DATETIME NULL,
  ly_do_mo_lai   VARCHAR(500) NULL COMMENT 'Lý do lần mở lại gần nhất',
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ky_id, xa_phuong_id),
  FOREIGN KEY (ky_id) REFERENCES ky_bao_cao(id) ON DELETE CASCADE,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_chot) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* "Kỳ này không phát sinh" — phân biệt rõ với "chưa nhập". Bản phụ lục giấy
   dùng lẫn "0", "Không" và ô trống cho cùng một ý, đọc không biết xã nào đã
   báo cáo, xã nào bỏ sót. */
CREATE TABLE IF NOT EXISTS khong_phat_sinh (
  ky_id           INT NOT NULL,
  xa_phuong_id    INT NOT NULL,
  bang            VARCHAR(40) NOT NULL,
  nguoi_danh_dau  INT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ky_id, xa_phuong_id, bang),
  FOREIGN KEY (ky_id) REFERENCES ky_bao_cao(id) ON DELETE CASCADE,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_danh_dau) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Lịch sử sửa của mọi bảng phụ lục: ai, lúc nào, giá trị cũ, giá trị mới.
   Xoá cũng chỉ đánh dấu (cột xoa_luc ở từng bảng), khôi phục được. */
CREATE TABLE IF NOT EXISTS lich_su_sua (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  bang          VARCHAR(40) NOT NULL,
  ban_ghi_id    INT NOT NULL,
  xa_phuong_id  INT NULL,
  ky_id         INT NULL,
  staff_id      INT NULL,
  hanh_dong     ENUM('them','sua','xoa','khoi-phuc','nhap-excel') NOT NULL,
  cu            JSON NULL,
  moi           JSON NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ban_ghi (bang, ban_ghi_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 1: HIỆN TRẠNG KHÁCH DU LỊCH
-- Tổng số khách KHÔNG lưu: luôn tính bằng quốc tế + nội địa, nên không bao
-- giờ lệch (bản phụ lục giấy đã có dòng cộng sai).
CREATE TABLE IF NOT EXISTS bc_khach (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ky_id         INT NOT NULL,
  xa_phuong_id  INT NOT NULL,
  quoc_te       INT UNSIGNED NOT NULL DEFAULT 0,
  noi_dia       INT UNSIGNED NOT NULL DEFAULT 0,
  nguoi_sua     INT NULL,
  xoa_luc       DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ky_xa (ky_id, xa_phuong_id),
  FOREIGN KEY (ky_id) REFERENCES ky_bao_cao(id) ON DELETE CASCADE,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 2: DỰ ÁN ĐẦU TƯ DU LỊCH
-- Vốn lưu bằng SỐ, đơn vị tỷ đồng — bản giấy ghi lẫn "40 tỉ", "1.854,4 tỷ
-- đồng", "359.9 tỷ" nên không cộng được tổng vốn.
CREATE TABLE IF NOT EXISTS bc_du_an (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  xa_phuong_id  INT NOT NULL,
  ten           VARCHAR(255) NOT NULL,
  dia_chi       VARCHAR(255) NULL,
  nha_dau_tu    VARCHAR(255) NULL,
  quoc_gia      VARCHAR(60) NULL,
  von_ty        DECIMAL(15,3) NULL COMMENT 'Tỷ đồng',
  dien_tich_ha  DECIMAL(12,4) NULL,
  trang_thai    VARCHAR(30) NULL,
  ghi_chu       VARCHAR(500) NULL,
  nguoi_sua     INT NULL,
  xoa_luc       DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_xa (xa_phuong_id, xoa_luc),
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id),
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 3: RESORT, KHU NGHỈ DƯỠNG
CREATE TABLE IF NOT EXISTS bc_luu_tru (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  xa_phuong_id  INT NOT NULL,
  ten           VARCHAR(255) NOT NULL,
  dia_chi       VARCHAR(255) NULL,
  chu_co_so     VARCHAR(120) NULL COMMENT 'Không bao giờ hiện cho người dân',
  hang_sao      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = chưa xếp hạng',
  cong_khai     BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Hiện tên, địa chỉ, hạng sao trên trang người dân',
  nguoi_sua     INT NULL,
  xoa_luc       DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_xa (xa_phuong_id, xoa_luc),
  CHECK (hang_sao <= 5),
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id),
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- GIAI ĐOẠN 2 — BẢNG 4 ĐẾN 10 CỦA PHỤ LỤC, XÁC THỰC HAI LỚP
-- ============================================================================
-- Các bảng 4, 7, 8, 9, 10 là thông tin nhạy cảm (vụ việc an ninh, quân số,
-- tôn giáo, vi phạm của người nước ngoài): KHÔNG có đường dẫn công khai nào
-- đọc tới, mỗi lần cán bộ xem hay xuất đều ghi nhật ký.

-- ------------------------------------------- BẢNG 4: VỤ VIỆC PHỨC TẠP VỀ ANTT
CREATE TABLE IF NOT EXISTS bc_vu_viec (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  xa_phuong_id  INT NOT NULL,
  ten           VARCHAR(255) NOT NULL,
  nam           SMALLINT NULL COMMENT 'Năm phát sinh',
  dien_bien     TEXT NULL,
  huong_xu_ly   TEXT NULL,
  ket_qua       VARCHAR(30) NULL COMMENT 'da-xu-ly | dang-xu-ly | phuc-tap',
  ghi_chu       VARCHAR(500) NULL,
  nguoi_sua     INT NULL,
  xoa_luc       DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_xa (xa_phuong_id, xoa_luc),
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id),
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 5: VĂN BẢN PHỐI HỢP LỰC LƯỢNG
CREATE TABLE IF NOT EXISTS bc_phoi_hop (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  xa_phuong_id   INT NOT NULL,
  ten_van_ban    VARCHAR(500) NOT NULL,
  ngay_ban_hanh  DATE NULL,
  tinh_trang     VARCHAR(30) NULL COMMENT 'da-ban-hanh | dang-trinh',
  cac_ben        TEXT NULL,
  noi_dung       TEXT NULL,
  nguoi_sua      INT NULL,
  xoa_luc        DATETIME NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_xa (xa_phuong_id, xoa_luc),
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id),
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 6: VẬN ĐỘNG QUẦN CHÚNG, MÔ HÌNH
CREATE TABLE IF NOT EXISTS bc_van_dong (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ky_id         INT NOT NULL,
  xa_phuong_id  INT NOT NULL,
  ten_mo_hinh   VARCHAR(255) NOT NULL COMMENT 'Mô hình hoặc nội dung vận động',
  so_luot       INT UNSIGNED NULL,
  so_nguoi      INT UNSIGNED NULL,
  so_luong      INT UNSIGNED NULL COMMENT 'Số lượng mô hình',
  nguoi_sua     INT NULL,
  xoa_luc       DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ky_xa (ky_id, xa_phuong_id, xoa_luc),
  FOREIGN KEY (ky_id) REFERENCES ky_bao_cao(id) ON DELETE CASCADE,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 7: ĐỘI NGŨ CÁN BỘ CÔNG AN XÃ
-- Mỗi tổ một dòng. Máy kiểm: chức vụ, trình độ, chuyên môn, độ tuổi — nhóm
-- nào đã nhập thì cộng lại phải bằng số lượng của tổ.
CREATE TABLE IF NOT EXISTS bc_luc_luong (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  ky_id           INT NOT NULL,
  xa_phuong_id    INT NOT NULL,
  ten_to          VARCHAR(120) NOT NULL,
  so_luong        INT UNSIGNED NOT NULL DEFAULT 0,
  cv_pho_truong   INT UNSIGNED NULL, cv_to_truong INT UNSIGNED NULL, cv_to_pho INT UNSIGNED NULL, cv_can_bo INT UNSIGNED NULL,
  td_tien_si      INT UNSIGNED NULL, td_thac_si INT UNSIGNED NULL, td_dai_hoc INT UNSIGNED NULL, td_cao_dang INT UNSIGNED NULL, td_trung_cap INT UNSIGNED NULL,
  cm_an_ninh      INT UNSIGNED NULL, cm_canh_sat INT UNSIGNED NULL,
  tuoi_duoi_30    INT UNSIGNED NULL, tuoi_30_40 INT UNSIGNED NULL, tuoi_tren_40 INT UNSIGNED NULL,
  nguoi_sua       INT NULL,
  xoa_luc         DATETIME NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ky_xa (ky_id, xa_phuong_id, xoa_luc),
  FOREIGN KEY (ky_id) REFERENCES ky_bao_cao(id) ON DELETE CASCADE,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Tổng quân số công an của xã: một số cho mỗi xã mỗi kỳ, khác tổng các tổ
   (không phải ai cũng thuộc tổ phụ trách du lịch). */
CREATE TABLE IF NOT EXISTS bc_quan_so (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ky_id         INT NOT NULL,
  xa_phuong_id  INT NOT NULL,
  tong_quan_so  INT UNSIGNED NOT NULL DEFAULT 0,
  nguoi_sua     INT NULL,
  xoa_luc       DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ky_xa (ky_id, xa_phuong_id),
  FOREIGN KEY (ky_id) REFERENCES ky_bao_cao(id) ON DELETE CASCADE,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 8: DÂN CƯ, DÂN TỘC, TÔN GIÁO
CREATE TABLE IF NOT EXISTS bc_dan_cu (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  ky_id            INT NOT NULL,
  xa_phuong_id     INT NOT NULL,
  so_to_thon       INT UNSIGNED NULL,
  dan_so           INT UNSIGNED NULL,
  so_dan_toc       INT UNSIGNED NULL,
  co_so_ton_giao   INT UNSIGNED NULL,
  chuc_sac         INT UNSIGNED NULL,
  tin_do           INT UNSIGNED NULL,
  ghi_chu          VARCHAR(500) NULL,
  nguoi_sua        INT NULL,
  xoa_luc          DATETIME NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ky_xa (ky_id, xa_phuong_id),
  FOREIGN KEY (ky_id) REFERENCES ky_bao_cao(id) ON DELETE CASCADE,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- BẢNG 9: VI PHẠM CỦA KHÁCH NƯỚC NGOÀI
-- Mỗi vụ một dòng, CÓ QUỐC TỊCH -> bảng 10 (theo quốc tịch) do máy tự tổng
-- hợp từ đây, không nhập hai lần, không bao giờ lệch nhau.
CREATE TABLE IF NOT EXISTS bc_vi_pham (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  xa_phuong_id  INT NOT NULL,
  ngay          DATE NOT NULL,
  loai          VARCHAR(30) NOT NULL COMMENT 'hinh-su | xuat-nhap-canh | trat-tu | khac',
  quoc_tich     VARCHAR(60) NOT NULL,
  so_luot       INT UNSIGNED NOT NULL DEFAULT 1,
  noi_dung      VARCHAR(1000) NULL,
  nguoi_sua     INT NULL,
  xoa_luc       DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_xa_ngay (xa_phuong_id, ngay, xoa_luc),
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id),
  FOREIGN KEY (nguoi_sua) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- XÁC THỰC HAI LỚP (TỰ NGUYỆN)
-- Cán bộ tự bật trong "Tài khoản của tôi": sau mật khẩu phải nhập mã 6 số
-- trên điện thoại (Google Authenticator, Microsoft Authenticator...).
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff' AND COLUMN_NAME = 'totp_bi_mat');
SET @lenh := IF(@co = 0, 'ALTER TABLE staff ADD COLUMN totp_bi_mat VARCHAR(64) NULL, ADD COLUMN totp_bat BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN totp_buoc_cuoi BIGINT NULL COMMENT ''Chặn dùng lại mã vừa dùng''', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;


-- ============================================================================
-- GIAI ĐOẠN 3 — PHÍA NGƯỜI DÂN: LỘ TRÌNH, ẢNH, PHẢN ÁNH, TIN TỨC, TIẾNG ANH
-- ============================================================================

-- ------------------------------------------- TIẾNG ANH CHO ĐỊA ĐIỂM
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dia_diem' AND COLUMN_NAME = 'ten_en');
SET @lenh := IF(@co = 0, 'ALTER TABLE dia_diem ADD COLUMN ten_en VARCHAR(120) NULL AFTER ten, ADD COLUMN mo_ta_en TEXT NULL AFTER mo_ta', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

UPDATE dia_diem SET ten_en = CASE id
  WHEN 'van-mieu-tran-bien' THEN 'Tran Bien Temple of Literature'
  WHEN 'den-tho-nguyen-huu-canh' THEN 'Nguyen Huu Canh Temple'
  WHEN 'khu-du-lich-buu-long' THEN 'Buu Long Tourist Area'
  WHEN 'thac-giang-dien' THEN 'Giang Dien Waterfall'
  WHEN 'khu-du-lich-suoi-mo' THEN 'Suoi Mo Eco-tourism Area'
  WHEN 'khu-du-lich-bo-cap-vang' THEN 'Bo Cap Vang Eco-tourism Area'
  WHEN 'ho-tri-an' THEN 'Tri An Lake'
  WHEN 'vuon-quoc-gia-cat-tien' THEN 'Cat Tien National Park'
  WHEN 'thac-dak-mai' THEN 'Dak Mai Waterfall'
  WHEN 'vuon-quoc-gia-bu-gia-map' THEN 'Bu Gia Map National Park'
  WHEN 'nui-ba-ra' THEN 'Ba Ra Mountain'
  WHEN 'nui-chua-chan' THEN 'Chua Chan Mountain'
  WHEN 'cu-lao-pho' THEN 'Pho Islet (Cu Lao Pho)'
  WHEN 'soc-bom-bo' THEN 'Bom Bo Village'
  WHEN 'ho-suoi-lam' THEN 'Suoi Lam Lake' END,
mo_ta_en = CASE id
  WHEN 'van-mieu-tran-bien' THEN 'The first Temple of Literature in southern Vietnam, built in 1715 to honour learning and people who served the culture. Today''s complex is rebuilt on the original site and hosts events that encourage study.'
  WHEN 'den-tho-nguyen-huu-canh' THEN 'Temple of Nguyen Huu Canh, who founded the administration of the Dong Nai – Gia Dinh region in the late 17th century. It stands by the Dong Nai River, near Pho Islet.'
  WHEN 'khu-du-lich-buu-long' THEN 'Rocky hills, lakes and pagodas right inside the city, often called a "miniature Ha Long". Highlights include Long An Lake, Buu Phong Pagoda on the hilltop and many recreation areas.'
  WHEN 'thac-giang-dien' THEN 'A multi-tiered waterfall in the forest — a popular weekend spot for picnics and camping.'
  WHEN 'khu-du-lich-suoi-mo' THEN 'An eco-tourism area with streams and waterfalls in the forest, good for swimming and family picnics.'
  WHEN 'khu-du-lich-bo-cap-vang' THEN 'A riverside eco-tourism area with orchards, ponds and folk games; voted among the ten favourite eco-tourism destinations of 2024.'
  WHEN 'ho-tri-an' THEN 'A large hydropower reservoir dotted with small islands, famous for its sunsets and the O – Dong Truong islands; good for boat trips and camping.'
  WHEN 'vuon-quoc-gia-cat-tien' THEN 'Lowland tropical forest with rich wildlife, part of a UNESCO world biosphere reserve. Ideal for jungle trekking, bird-watching and cycling.'
  WHEN 'thac-dak-mai' THEN 'A waterfall inside Bu Gia Map National Park, honoured among the seven most impressive eco-tourism landscapes of 2023.'
  WHEN 'vuon-quoc-gia-bu-gia-map' THEN 'A vast forest on the northern border with much primary forest and wildlife. Parts of the area are border zones — ask the local police before visiting.'
  WHEN 'nui-ba-ra' THEN 'The iconic mountain of the Phuoc Long area, linked to the historic Ba Ra prison. The summit offers views over the surrounding hills.'
  WHEN 'nui-chua-chan' THEN 'A high mountain in the Xuan Loc area with Gia Lao Pagoda on its slope; a well-known hiking and pilgrimage site.'
  WHEN 'cu-lao-pho' THEN 'An islet on the Dong Nai River, once the busiest trading port of the south in the 17th–18th centuries; many old communal houses, pagodas and shrines remain.'
  WHEN 'soc-bom-bo' THEN 'A village of the S''tieng people, known from the song about rice-pounding to feed soldiers during the resistance war. Includes a S''tieng cultural conservation area.'
  WHEN 'ho-suoi-lam' THEN 'A lake among forested hills, a weekend picnic spot for local people.' END
WHERE ten_en IS NULL AND id IN ('van-mieu-tran-bien','den-tho-nguyen-huu-canh','khu-du-lich-buu-long','thac-giang-dien','khu-du-lich-suoi-mo',
  'khu-du-lich-bo-cap-vang','ho-tri-an','vuon-quoc-gia-cat-tien','thac-dak-mai','vuon-quoc-gia-bu-gia-map','nui-ba-ra','nui-chua-chan','cu-lao-pho','soc-bom-bo','ho-suoi-lam');

-- ------------------------------------------- LỘ TRÌNH DU LỊCH (cán bộ quản lý)
CREATE TABLE IF NOT EXISTS lich_trinh (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  ten         VARCHAR(120) NOT NULL,
  ten_en      VARCHAR(120) NULL,
  thoi_gian   VARCHAR(40) NULL COMMENT 'Ví dụ: 2 ngày 1 đêm',
  mo_ta       VARCHAR(600) NULL,
  mo_ta_en    VARCHAR(600) NULL,
  hien        BOOLEAN NOT NULL DEFAULT TRUE,
  thu_tu      INT NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lich_trinh_diem (
  lich_trinh_id  INT NOT NULL,
  thu_tu         SMALLINT NOT NULL,
  dia_diem_id    VARCHAR(80) NOT NULL,
  ngay           TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Ngày thứ mấy của lộ trình',
  ghi_chu        VARCHAR(300) NULL,
  PRIMARY KEY (lich_trinh_id, thu_tu),
  FOREIGN KEY (lich_trinh_id) REFERENCES lich_trinh(id) ON DELETE CASCADE,
  FOREIGN KEY (dia_diem_id) REFERENCES dia_diem(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Ba lộ trình trước đây viết cứng trong mã giao diện, nay chuyển vào đây để cán bộ sửa được. */
INSERT IGNORE INTO lich_trinh (id, ten, ten_en, thoi_gian, mo_ta, mo_ta_en, thu_tu) VALUES
  (1, 'Một ngày di sản bên sông', 'A heritage day by the river', '1 ngày', 'Văn miếu, núi đá Bửu Long và cù lao Phố — gọn trong một ngày quanh khu Biên Hoà cũ.', 'The Temple of Literature, Buu Long rocky hills and Pho Islet — all in one day around old Bien Hoa.', 1),
  (2, 'Rừng và hồ cuối tuần', 'Forest and lake weekend', '2 ngày 1 đêm', 'Ngắm hoàng hôn trên hồ Trị An, tắm suối, rồi vào rừng Cát Tiên xem chim.', 'Sunset over Tri An Lake, a swim in the streams, then bird-watching in Cat Tien forest.', 2),
  (3, 'Về miền đất đỏ phía bắc', 'The red-soil north', '2 ngày', 'Núi Bà Rá, sóc Bom Bo và thác Đắk Mai giữa rừng Bù Gia Mập.', 'Ba Ra Mountain, Bom Bo village and Dak Mai Waterfall in Bu Gia Map forest.', 3);
INSERT IGNORE INTO lich_trinh_diem (lich_trinh_id, thu_tu, dia_diem_id, ngay) VALUES
  (1, 1, 'van-mieu-tran-bien', 1), (1, 2, 'khu-du-lich-buu-long', 1), (1, 3, 'cu-lao-pho', 1), (1, 4, 'den-tho-nguyen-huu-canh', 1),
  (2, 1, 'ho-tri-an', 1), (2, 2, 'khu-du-lich-suoi-mo', 1), (2, 3, 'vuon-quoc-gia-cat-tien', 2),
  (3, 1, 'nui-ba-ra', 1), (3, 2, 'soc-bom-bo', 1), (3, 3, 'thac-dak-mai', 2), (3, 4, 'vuon-quoc-gia-bu-gia-map', 2);

-- ------------------------------------------- ẢNH ĐỊA ĐIỂM
-- Lưu ngay trong cơ sở dữ liệu: Render không có ổ đĩa giữ tệp lâu dài. Ảnh
-- được thu nhỏ trên trình duyệt trước khi tải lên (cạnh dài tối đa 1600px).
CREATE TABLE IF NOT EXISTS anh_dia_diem (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  dia_diem_id  VARCHAR(80) NOT NULL,
  du_lieu      MEDIUMBLOB NOT NULL,
  kieu         VARCHAR(20) NOT NULL,
  rong         SMALLINT UNSIGNED NULL,
  cao          SMALLINT UNSIGNED NULL,
  chu_thich    VARCHAR(200) NULL,
  thu_tu       SMALLINT NOT NULL DEFAULT 0,
  nguoi_tai    INT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_diem (dia_diem_id, thu_tu),
  FOREIGN KEY (dia_diem_id) REFERENCES dia_diem(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_tai) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- PHẢN ÁNH CỦA NGƯỜI DÂN, DU KHÁCH
-- Người dân chỉ GỬI, không có tra cứu kết quả. ma_tra_cuu là số hiệu nội bộ
-- để cán bộ đối chiếu; phan_hoi là ghi chú kết quả xử lý, chỉ cán bộ xem.
-- Số liên hệ (không bắt buộc) để cán bộ gọi lại khi cần, không bao giờ công khai.
CREATE TABLE IF NOT EXISTS phan_anh (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ma_tra_cuu    CHAR(8) NOT NULL UNIQUE,
  loai          VARCHAR(30) NOT NULL,
  dia_diem_id   VARCHAR(80) NULL,
  xa_phuong_id  INT NULL,
  noi_dung      VARCHAR(2000) NOT NULL,
  lien_he       VARCHAR(100) NULL,
  ip_bam        CHAR(64) NULL,
  trang_thai    VARCHAR(20) NOT NULL DEFAULT 'moi' COMMENT 'moi | dang-xu-ly | da-xu-ly | khong-xu-ly',
  phan_hoi      VARCHAR(2000) NULL COMMENT 'Kết quả xử lý — ghi chú nội bộ',
  nguoi_xu_ly   INT NULL,
  xu_ly_luc     DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trang_thai (trang_thai, created_at),
  FOREIGN KEY (dia_diem_id) REFERENCES dia_diem(id) ON DELETE SET NULL,
  FOREIGN KEY (xa_phuong_id) REFERENCES xa_phuong(id) ON DELETE SET NULL,
  FOREIGN KEY (nguoi_xu_ly) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------- TIN TỨC, CẢNH BÁO, SỐ ĐIỆN THOẠI CẦN BIẾT
CREATE TABLE IF NOT EXISTS tin_tuc (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  loai         VARCHAR(20) NOT NULL COMMENT 'canh-bao | su-kien | thong-bao | lien-he',
  tieu_de      VARCHAR(200) NOT NULL,
  tieu_de_en   VARCHAR(200) NULL,
  noi_dung     VARCHAR(3000) NULL,
  noi_dung_en  VARCHAR(3000) NULL,
  tu_ngay      DATE NULL,
  den_ngay     DATE NULL COMMENT 'Hết ngày này thì tự thôi hiện',
  dia_diem_id  VARCHAR(80) NULL,
  hien         BOOLEAN NOT NULL DEFAULT TRUE,
  thu_tu       INT NOT NULL DEFAULT 0,
  nguoi_tao    INT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hien (hien, loai),
  FOREIGN KEY (dia_diem_id) REFERENCES dia_diem(id) ON DELETE SET NULL,
  FOREIGN KEY (nguoi_tao) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Số khẩn cấp toàn quốc. Đường dây nóng du lịch của thành phố thì cán bộ tự
   thêm ở mục Tin tức (loại "Số điện thoại") — không đoán số ở đây. */
INSERT IGNORE INTO tin_tuc (id, loai, tieu_de, tieu_de_en, noi_dung, thu_tu) VALUES
  (1, 'lien-he', 'Công an', 'Police', '113', 1),
  (2, 'lien-he', 'Cứu nạn, cứu hộ, chữa cháy', 'Fire and rescue', '114', 2),
  (3, 'lien-he', 'Cấp cứu y tế', 'Ambulance', '115', 3),
  (4, 'lien-he', 'Tìm kiếm cứu nạn', 'Search and rescue', '112', 4);

-- ------------------------------------------- BÁO ĐÁNH GIÁ SAI PHẠM
-- Mỗi thiết bị báo một đánh giá một lần (lưu bản băm, như đánh giá).
CREATE TABLE IF NOT EXISTS bao_danh_gia (
  danh_gia_id  BIGINT NOT NULL,
  ma_thiet_bi  CHAR(64) NOT NULL,
  ly_do        VARCHAR(30) NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (danh_gia_id, ma_thiet_bi),
  FOREIGN KEY (danh_gia_id) REFERENCES danh_gia(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- GIAI ĐOẠN 4 — GIAO DIỆN MỚI: VÙNG DU LỊCH, PHƯƠNG TIỆN CỦA LỘ TRÌNH
-- ============================================================================
-- Vùng: để du khách lọc điểm đến theo miền. Gán sẵn theo toạ độ thật của
-- 15 điểm; cán bộ đổi được ở mục Địa điểm. Không suy ra vùng phía giao diện
-- (dễ sai, cán bộ không sửa được).
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dia_diem' AND COLUMN_NAME = 'vung');
SET @lenh := IF(@co = 0, 'ALTER TABLE dia_diem ADD COLUMN vung ENUM(''ven-song'',''mien-dong'',''phia-bac'') NULL COMMENT ''Vùng du lịch, để lọc'' AFTER xa_phuong_id', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

UPDATE dia_diem SET vung = CASE
    WHEN id IN ('van-mieu-tran-bien','den-tho-nguyen-huu-canh','khu-du-lich-buu-long','cu-lao-pho','khu-du-lich-bo-cap-vang','thac-giang-dien') THEN 'ven-song'
    WHEN id IN ('ho-tri-an','vuon-quoc-gia-cat-tien','khu-du-lich-suoi-mo','nui-chua-chan') THEN 'mien-dong'
    WHEN id IN ('nui-ba-ra','soc-bom-bo','thac-dak-mai','vuon-quoc-gia-bu-gia-map','ho-suoi-lam') THEN 'phia-bac'
  END
WHERE vung IS NULL AND id IN ('van-mieu-tran-bien','den-tho-nguyen-huu-canh','khu-du-lich-buu-long','cu-lao-pho','khu-du-lich-bo-cap-vang','thac-giang-dien',
  'ho-tri-an','vuon-quoc-gia-cat-tien','khu-du-lich-suoi-mo','nui-chua-chan','nui-ba-ra','soc-bom-bo','thac-dak-mai','vuon-quoc-gia-bu-gia-map','ho-suoi-lam');

-- Phương tiện gợi ý cho lộ trình (ô tô, xe máy…). Để trống cho cán bộ điền:
-- giao diện không hiện dòng này khi chưa có, không tự đoán.
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lich_trinh' AND COLUMN_NAME = 'phuong_tien');
SET @lenh := IF(@co = 0, 'ALTER TABLE lich_trinh ADD COLUMN phuong_tien VARCHAR(60) NULL AFTER thoi_gian, ADD COLUMN phuong_tien_en VARCHAR(60) NULL AFTER phuong_tien', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

-- Điểm lấy nét của ảnh (phần trăm ngang, dọc): khi ảnh bị cắt cho vừa khung
-- (thẻ, trình chiếu), phần cán bộ chọn luôn nằm trong khung.
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anh_dia_diem' AND COLUMN_NAME = 'tieu_diem_x');
SET @lenh := IF(@co = 0, 'ALTER TABLE anh_dia_diem ADD COLUMN tieu_diem_x TINYINT UNSIGNED NOT NULL DEFAULT 50 AFTER chu_thich, ADD COLUMN tieu_diem_y TINYINT UNSIGNED NOT NULL DEFAULT 50 AFTER tieu_diem_x', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

-- ============================================================================
-- GIAI ĐOẠN 5 — BÀI GIỚI THIỆU CHI TIẾT TỪNG ĐỊA ĐIỂM
-- ============================================================================
-- chi_tiet: bài dài hiện ở trang riêng của địa điểm. Định dạng đơn giản:
-- dòng "## " là tiêu đề mục, dòng "- " là gạch đầu dòng, dòng trống ngăn đoạn.
-- Mục "Lịch sử hình thành" mỗi dòng dạng "Mốc: nội dung" hiện thành dòng thời
-- gian. Bài viết sẵn là bản TỔNG HỢP, chờ cán bộ đối chiếu (cột da_kiem_tra);
-- chỉ điền khi cột còn trống, chạy lại không đè bài cán bộ đã sửa.
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dia_diem' AND COLUMN_NAME = 'chi_tiet');
SET @lenh := IF(@co = 0, 'ALTER TABLE dia_diem ADD COLUMN chi_tiet TEXT NULL AFTER mo_ta_en, ADD COLUMN chi_tiet_en TEXT NULL AFTER chi_tiet', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Văn miếu Trấn Biên được dựng năm 1715, thời chúa Nguyễn Phúc Chu, là văn miếu đầu tiên ở vùng đất phương Nam — sớm hơn cả văn miếu ở kinh thành Huế. Nơi đây thờ Khổng Tử và tôn vinh những người có công với nền học vấn, văn hoá của dân tộc.

Công trình cũ bị phá huỷ trong thời Pháp chiếm đóng ở thế kỷ XIX. Văn miếu hiện nay được phục dựng trên nền đất xưa và khánh thành đầu những năm 2000, theo lối kiến trúc cổ với cổng tam quan, hồ nước, nhà bia và khu điện thờ chính.

## Lịch sử hình thành
- 1715: Chúa Nguyễn Phúc Chu cho dựng Văn miếu ở dinh Trấn Biên — văn miếu đầu tiên ở phương Nam.
- Thế kỷ XVIII – đầu XIX: Văn miếu được trùng tu nhiều lần, là nơi tế lễ, tôn vinh Nho học của cả vùng Gia Định.
- 1861 – 1862: Khi quân Pháp đánh chiếm Biên Hoà, Văn miếu bị phá huỷ, chỉ còn lại nền cũ.
- 1998 – 2002: Phục dựng trên nền đất xưa theo kiến trúc cổ; khánh thành năm 2002.
- Từ 2002 đến nay: Trung tâm văn hoá, khuyến học của địa phương, nơi tổ chức khai bút đầu xuân, vinh danh học sinh giỏi.

## Có gì để xem
- Cổng tam quan, Khuê Văn Các và hồ nước trước sân — góc chụp ảnh đẹp nhất vào buổi sáng.
- Khu điện thờ chính và nhà bia ghi danh các danh nhân.
- Các hoạt động khuyến học, khai bút đầu xuân, lễ vinh danh học sinh giỏi được tổ chức hằng năm.

## Kinh nghiệm
- Văn miếu nằm gần khu du lịch Bửu Long, có thể ghép hai điểm trong một buổi.
- Đây là nơi thờ tự: ăn mặc kín đáo, giữ trật tự trong khu điện thờ.
- Dịp Tết và mùa thi, nhiều gia đình đến xin chữ, cầu may cho con em — đông vào sáng sớm.', chi_tiet_en = '## About
Tran Bien Temple of Literature was founded in 1715 under Lord Nguyen Phuc Chu — the first temple of literature in the southern lands, older than the one in the imperial capital Hue. It honours Confucius and the scholars who shaped Vietnamese learning and culture.

The original buildings were destroyed in the 19th century. Today''s complex was rebuilt on the old grounds in the early 2000s in classical style, with a triple gate, a pond, stele houses and the main shrine.

## Timeline
- 1715: Founded under Lord Nguyen Phuc Chu at Tran Bien citadel — the first temple of literature in the south.
- 18th – early 19th century: Restored several times; the centre of Confucian rites for the Gia Dinh region.
- 1861 – 1862: Destroyed when French troops took Bien Hoa; only the foundations remained.
- 1998 – 2002: Rebuilt on the old site in classical style; reopened in 2002.
- Since 2002: A cultural and study-promotion centre, hosting new-year calligraphy and student awards.

## What to see
- The triple gate, the Khue Van pavilion and the pond — best photographed in the morning.
- The main shrine and the stele houses.
- New-year calligraphy and study-promotion ceremonies held every year.

## Tips
- It sits next to Buu Long tourist area; the two fit into one half-day.
- It is a place of worship: dress modestly and keep quiet near the shrine.' WHERE id = 'van-mieu-tran-bien' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Năm 1698, Thống suất Lễ Thành hầu Nguyễn Hữu Cảnh được chúa Nguyễn cử vào kinh lược vùng đất phía Nam. Ông lập dinh Trấn Biên và dinh Phiên Trấn, đặt nền hành chính đầu tiên cho vùng Đồng Nai – Gia Định, chiêu mộ lưu dân khai hoang lập làng.

Để tưởng nhớ công lao ấy, người dân lập đền thờ ông bên sông Đồng Nai, gần cù lao Phố — nơi từng là thương cảng sầm uất nhất phương Nam. Đền là di tích lịch sử, nơi diễn ra lễ giỗ hằng năm với nhiều nghi thức truyền thống.

## Lịch sử hình thành
- 1698: Lễ Thành hầu Nguyễn Hữu Cảnh vào kinh lược, lập dinh Trấn Biên, đặt nền hành chính cho vùng Đồng Nai – Gia Định.
- 1700: Ông mất trên đường trở về sau chuyến dẹp loạn ở vùng biên giới Tây Nam.
- Thế kỷ XVIII: Người dân lập đền thờ bên sông Đồng Nai, gần thương cảng cù lao Phố, để tưởng nhớ công lao mở cõi.
- Thế kỷ XIX – XX: Đền được tu bổ nhiều lần, lễ giỗ hằng năm trở thành sinh hoạt văn hoá của cả vùng.
- Ngày nay: Di tích lịch sử – văn hoá, nơi tổ chức lễ tưởng niệm và giáo dục truyền thống.

## Có gì để xem
- Kiến trúc đình đền Nam Bộ với mái ngói, hoành phi, câu đối chạm khắc.
- Cảnh sông Đồng Nai và cù lao Phố ngay cạnh đền.
- Lễ hội tưởng niệm Nguyễn Hữu Cảnh hằng năm, có tế lễ và các hoạt động văn hoá dân gian.

## Kinh nghiệm
- Nên kết hợp với tham quan cù lao Phố: chùa Ông (Thất Phủ cổ miếu), chùa Đại Giác.
- Đây là nơi thờ tự, ăn mặc lịch sự; hỏi ban quản lý trước khi chụp ảnh bên trong điện thờ.', chi_tiet_en = '## About
In 1698 Lord Nguyen sent Marquis Nguyen Huu Canh south to organise the new lands. He set up the first administration of the Dong Nai – Gia Dinh region and settled migrants in new villages.

Local people built this temple by the Dong Nai River, next to Cu Lao Pho — once the busiest trading port of the south — to honour him. His anniversary is commemorated every year with traditional rites.

## Timeline
- 1698: Marquis Nguyen Huu Canh arrives, founds Tran Bien and lays out the first administration of Dong Nai – Gia Dinh.
- 1700: He dies on the way back from a campaign on the south-western frontier.
- 18th century: Locals build a temple by the Dong Nai River near the Cu Lao Pho port in his memory.
- 19th – 20th century: Restored several times; his anniversary becomes a regional cultural event.
- Today: A historic site hosting the annual commemoration.

## What to see
- Southern-style temple architecture with carved panels and couplets.
- The river and Cu Lao Pho island right beside the temple.

## Tips
- Combine with the old temples and pagodas on Cu Lao Pho.
- Dress respectfully; ask before photographing inside the shrine.' WHERE id = 'den-tho-nguyen-huu-canh' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Bửu Long là quần thể núi đá, hồ nước và chùa chiền nằm ngay trong khu đô thị cũ của Biên Hoà, thường được ví là "Hạ Long thu nhỏ". Phần lớn cảnh quan hình thành từ những mỏ đá xưa: vách đá dựng đứng soi bóng xuống hồ, xen giữa là cây xanh và đảo nhỏ.

## Lịch sử hình thành
- Cuối thế kỷ XVII: Theo truyền lại, chùa Bửu Phong được dựng trên núi — một trong những ngôi chùa sớm nhất của vùng.
- Thế kỷ XX: Khu đồi đá được khai thác làm mỏ đá xây dựng; các hố khai thác dần thành hồ sâu, vách đá dựng đứng.
- Cuối thế kỷ XX – đầu XXI: Mỏ đá ngừng khai thác, khu vực được cải tạo thành khu du lịch với hồ Long Ẩn, đảo, vườn cây.
- Ngày nay: Điểm vui chơi, dã ngoại quen thuộc ngay trong đô thị, ghép tuyến với Văn miếu Trấn Biên.

## Có gì để xem
- Hồ Long Ẩn với vách đá và đảo nhỏ — có thể đi thuyền dạo hồ.
- Chùa Bửu Phong trên núi, một trong những ngôi chùa lâu đời của vùng, nhìn xuống toàn cảnh khu du lịch và sông Đồng Nai.
- Khu vui chơi, công viên nước, chỗ cắm trại và ăn uống cho gia đình.

## Đi lại
Bửu Long ở gần trung tâm, đi xe máy hoặc ô tô thuận tiện; có thể ghép với Văn miếu Trấn Biên ngay bên cạnh.

## Kinh nghiệm
- Leo bậc đá lên chùa Bửu Phong mất chừng nửa giờ, nên đi sáng sớm hoặc chiều mát.
- Mang giày đế bám, nước uống; không leo lên các vách đá không có lối đi.
- Cuối tuần và ngày lễ rất đông, nên đến sớm.', chi_tiet_en = '## About
Buu Long is a cluster of rock hills, lakes and pagodas inside the old city of Bien Hoa, often called "a little Ha Long Bay". Most of the scenery grew out of old stone quarries: sheer cliffs above green water, small islands and trees.

## Timeline
- Late 17th century: By tradition, Buu Phong Pagoda is founded on the hill — one of the earliest in the area.
- 20th century: The rock hills are quarried; the pits slowly become deep lakes under sheer cliffs.
- Late 20th – early 21st century: Quarrying ends and the area is landscaped into a park around Long An Lake.
- Today: A popular in-city park, paired with the Temple of Literature next door.

## What to see
- Long An Lake with its cliffs and islets — boat rides available.
- Buu Phong Pagoda on the hilltop, one of the oldest in the area, with views over the park and the Dong Nai River.
- Play areas, a water park, picnic and camping spots for families.

## Tips
- The stone steps up to Buu Phong take about half an hour; go early or late afternoon.
- Wear grippy shoes and stay on marked paths. Weekends are busy.' WHERE id = 'khu-du-lich-buu-long' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Thác Giang Điền là quần thể thác nước nhiều tầng đổ xuống giữa rừng cây, cách khu đô thị Biên Hoà cũ không xa. Khu du lịch sinh thái được xây dựng quanh thác, giữ lại nhiều mảng rừng, suối và hồ nước, là điểm dã ngoại cuối tuần quen thuộc của người dân thành phố và TP.HCM.

## Lịch sử hình thành
- Trước đây: Thác nằm giữa vùng rừng và vườn cây, chủ yếu người dân quanh vùng biết tới.
- Đầu thế kỷ XXI: Khu du lịch sinh thái được đầu tư quanh thác, giữ lại rừng, suối, xây hồ, cầu và đường dạo.
- Ngày nay: Điểm dã ngoại cuối tuần quen thuộc của người dân thành phố và TP.HCM. (Mốc năm cụ thể: cán bộ bổ sung.)

## Có gì để xem
- Các tầng thác trắng xoá giữa những tảng đá lớn, đẹp nhất vào mùa mưa khi nước nhiều.
- Hồ nước, cầu treo, đường dạo trong rừng.
- Khu cắm trại, trò chơi tập thể, nhà hàng và chỗ nghỉ qua đêm.

## Đi lại
Đi theo quốc lộ 1 hoặc đường cao tốc rồi rẽ vào đường dẫn tới khu du lịch; xe máy, ô tô đều tới tận nơi.

## Kinh nghiệm
- Chỉ tắm ở khu vực được cho phép; đá quanh thác rất trơn, nước có thể dâng nhanh sau mưa.
- Trẻ em luôn cần người lớn đi kèm khi chơi gần nước.
- Mùa mưa (khoảng tháng 5 – 11) thác đẹp nhất; mùa khô nước ít hơn nhưng dễ đi lại.', chi_tiet_en = '## About
Giang Dien is a multi-tier waterfall in the forest not far from old Bien Hoa. The eco-park around it keeps patches of forest, streams and a lake, and is a favourite weekend picnic spot for families from the city and Ho Chi Minh City.

## Timeline
- Earlier: The falls sat among forest and gardens, known mainly to local people.
- Early 21st century: An eco-park is developed around the falls, keeping the forest and streams.
- Today: A favourite weekend spot for the city and Ho Chi Minh City.

## What to see
- Cascades over large boulders, fullest in the rainy season.
- A lake, a suspension bridge and forest walks.
- Camping grounds, group games, restaurants and overnight stays.

## Tips
- Swim only in designated areas; rocks are slippery and water can rise quickly after rain.
- The falls are fullest from about May to November.' WHERE id = 'thac-giang-dien' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Suối Mơ là khu du lịch sinh thái ở vùng Tân Phú, phía đông bắc thành phố, nằm gần quốc lộ 20 — tuyến đường đi Đà Lạt. Dòng suối chảy qua những bãi đá lớn và tạo thành các thác nhỏ, hai bên là rừng cây mát rượi.

## Lịch sử hình thành
- Trước đây: Dòng suối giữa rừng ven quốc lộ 20, nơi người dân địa phương tắm suối, nghỉ chân.
- Đầu thế kỷ XXI: Được đầu tư thành khu du lịch sinh thái với đường dạo, chòi nghỉ, khu ăn uống.
- Ngày nay: Điểm dừng chân quen thuộc trên tuyến đi Cát Tiên, Đà Lạt. (Mốc năm cụ thể: cán bộ bổ sung.)

## Có gì để xem
- Thác và những hồ nước tự nhiên giữa các tảng đá — chỗ tắm suối của gia đình.
- Đường dạo ven suối, các chòi nghỉ dưới tán cây.
- Khu ăn uống, cắm trại, nghỉ qua đêm.

## Đi lại
Theo quốc lộ 20; tiện ghé khi đi Vườn quốc gia Cát Tiên hoặc Đà Lạt.

## Kinh nghiệm
- Đá trong suối trơn, nên đi dép quai hậu hoặc giày lội nước.
- Mùa mưa nước chảy mạnh, chỉ xuống suối ở khu được cho phép và theo hướng dẫn của nhân viên.', chi_tiet_en = '## About
Suoi Mo is an eco-park in the Tan Phu area, north-east of the city, close to National Road 20 (the road to Da Lat). A stream runs over large boulders, forming small falls under shady forest.

## Timeline
- Earlier: A forest stream by National Road 20 where locals swam and rested.
- Early 21st century: Developed into an eco-park with paths, huts and restaurants.
- Today: A familiar stop on the road to Cat Tien and Da Lat.

## What to see
- Natural pools between the rocks — a family swimming spot.
- Streamside paths and shaded huts; food, camping and overnight stays.

## Tips
- A handy stop on the way to Cat Tien National Park or Da Lat.
- Rocks are slippery; in the rainy season only enter the water where staff allow.' WHERE id = 'khu-du-lich-suoi-mo' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Bò Cạp Vàng là khu du lịch sinh thái ở vùng Nhơn Trạch, gần sông, rợp bóng cây với vườn cây trái, ao hồ và kênh rạch kiểu miền Tây. Khu du lịch được nhiều bình chọn đưa vào nhóm điểm du lịch sinh thái được yêu thích.

## Lịch sử hình thành
- Trước đây: Vùng đất vườn, ao, kênh rạch ven sông đặc trưng của Nhơn Trạch.
- Những năm gần đây: Được xây dựng thành khu du lịch sinh thái đồng quê, giữ cảnh vườn cây, ao sen, kênh rạch.
- 2024: Được bình chọn vào nhóm điểm du lịch sinh thái được yêu thích. (Các mốc khác: cán bộ bổ sung.)

## Có gì để xem
- Vườn cây, ao sen, cầu tre, kênh rạch — bối cảnh chụp ảnh đồng quê Nam Bộ.
- Trò chơi dân gian, trò chơi vận động cho trẻ em và đoàn đông người.
- Ẩm thực đồng quê, chỗ nghỉ cho dã ngoại cuối tuần.

## Đi lại
Gần TP.HCM qua cầu Phú Mỹ hoặc đường cao tốc; thuận tiện cho chuyến đi trong ngày.

## Kinh nghiệm
- Phù hợp đi theo gia đình có trẻ nhỏ, công ty tổ chức hoạt động tập thể.
- Mang kem chống muỗi, mũ nón; trẻ em chơi gần ao hồ cần người lớn trông.', chi_tiet_en = '## About
Bo Cap Vang is a riverside eco-park in the Nhon Trach area, with fruit gardens, lotus ponds and Mekong-style canals. It has appeared in several lists of favourite eco-tourism spots.

## Timeline
- Earlier: Riverside gardens, ponds and canals typical of Nhon Trach.
- Recent years: Developed into a countryside eco-park keeping its gardens and lotus ponds.
- 2024: Named among favourite eco-tourism spots.

## What to see
- Gardens, lotus ponds and bamboo bridges — classic southern countryside scenes.
- Folk games and team activities; countryside food.

## Tips
- Close to Ho Chi Minh City — an easy day trip, good for families and company outings.
- Bring insect repellent; watch children near the ponds.' WHERE id = 'khu-du-lich-bo-cap-vang' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Hồ Trị An là hồ chứa của nhà máy thuỷ điện Trị An trên sông Đồng Nai, xây dựng trong những năm 1980 và hoàn thành đầu thập niên 1990. Mặt hồ rộng hơn 300 km², điểm xuyết hàng chục đảo lớn nhỏ, là một trong những hồ nhân tạo lớn nhất miền Nam.

## Lịch sử hình thành
- 1945 – 1975: Vùng rừng quanh lưu vực sông Đồng Nai là chiến khu Đ, căn cứ kháng chiến quan trọng của miền Đông Nam Bộ.
- 1984: Khởi công công trình thuỷ điện Trị An trên sông Đồng Nai.
- 1988 – 1991: Các tổ máy lần lượt phát điện; công trình hoàn thành năm 1991, lòng hồ rộng hơn 300 km² hình thành.
- Từ những năm 1990: Làng bè nuôi cá, nghề đánh bắt trên hồ phát triển; đảo Ó – Đồng Trường mở du lịch sinh thái.
- Ngày nay: Vừa là công trình năng lượng, cấp nước, vừa là điểm du lịch hồ – đảo nổi tiếng của thành phố.

## Có gì để xem
- Hoàng hôn trên hồ — cảnh nổi tiếng nhất của Trị An, đẹp nhất vào mùa khô khi trời quang.
- Đảo Ó – Đồng Trường: khu du lịch sinh thái trên đảo, gắn với căn cứ kháng chiến chiến khu Đ.
- Làng bè nuôi cá trên hồ, xem ngư dân kéo lưới buổi sáng sớm.
- Đập và nhà máy thuỷ điện nhìn từ xa (khu vực nhà máy là công trình được bảo vệ, không vào tự do).

## Đi lại
Từ trung tâm thành phố đi về phía bắc theo các tuyến tỉnh lộ tới khu vực La Ngà, Trị An; ra đảo bằng thuyền của các khu du lịch.

## Kinh nghiệm
- Đi thuyền phải mặc áo phao; không tự ý bơi ra xa trên hồ — hồ rất sâu và rộng.
- Đặc sản cá lăng, cá thát lát từ hồ; nên thử ở các quán ven hồ.
- Muốn ngắm hoàng hôn, đến trước khi mặt trời lặn khoảng một giờ.', chi_tiet_en = '## About
Tri An Lake is the reservoir of the Tri An hydropower plant on the Dong Nai River, built in the 1980s and finished in the early 1990s. Covering more than 300 km² and dotted with dozens of islands, it is one of the largest man-made lakes in southern Vietnam.

## Timeline
- 1945 – 1975: The forests of the Dong Nai basin form War Zone D, a key resistance base.
- 1984: Construction of the Tri An hydropower plant begins.
- 1988 – 1991: Turbines come online in turn; completed in 1991, creating a lake of over 300 km².
- From the 1990s: Floating fish farms and fishing grow; O – Dong Truong islands open to eco-tourism.
- Today: Both a power and water source and a well-known lake-and-island destination.

## What to see
- Sunsets over the water — Tri An''s signature view, best on clear dry-season evenings.
- O – Dong Truong islands, an eco-tourism area tied to the War Zone D resistance base.
- Floating fish-farm villages; fishermen hauling nets at dawn.
- The dam seen from a distance (the plant itself is a protected site).

## Tips
- Always wear a life jacket on boats; do not swim out into the lake.
- Try local river fish at the lakeside restaurants. Arrive about an hour before sunset.' WHERE id = 'ho-tri-an' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Vườn quốc gia Cát Tiên là một trong những khu rừng nhiệt đới đất thấp quý giá nhất còn lại ở Việt Nam, trải trên địa phận nhiều tỉnh dọc sông Đồng Nai. Vùng lõi của vườn là một phần Khu dự trữ sinh quyển Đồng Nai được UNESCO công nhận; vùng đất ngập nước Bàu Sấu là khu Ramsar có tầm quan trọng quốc tế.

Rừng là nơi sống của hàng trăm loài chim, thú, bò sát và nhiều loài quý hiếm như bò tót, voọc, vượn đen má vàng, cá sấu nước ngọt.

## Lịch sử hình thành
- 1978: Khu rừng cấm Nam Cát Tiên được thành lập để bảo vệ rừng đất thấp ven sông Đồng Nai.
- 1992: Thành lập Vườn quốc gia Cát Tiên, hợp nhất các khu Nam Cát Tiên, Tây Cát Tiên và Cát Lộc.
- 2001: UNESCO công nhận Khu dự trữ sinh quyển Cát Tiên (năm 2011 mở rộng thành Khu dự trữ sinh quyển Đồng Nai).
- 2005: Vùng đất ngập nước Bàu Sấu được công nhận là khu Ramsar có tầm quan trọng quốc tế.
- 2010: Cá thể tê giác Java cuối cùng ở Việt Nam bị săn trộm trong vườn — bài học đắt giá về bảo tồn.
- Ngày nay: Trung tâm bảo tồn đa dạng sinh học, nghiên cứu và du lịch sinh thái hàng đầu phía Nam.

## Có gì để xem
- Bàu Sấu: đi bộ xuyên rừng tới hồ ngập nước, có thể gặp cá sấu, chim nước (cần đăng ký, đi cùng kiểm lâm).
- Cây Tung cổ thụ, cây Gõ đỏ hàng trăm năm tuổi trên các tuyến đường mòn.
- Ghềnh Bến Cự trên sông Đồng Nai.
- Xem thú đêm bằng xe chuyên dụng, xem chim buổi sáng sớm.
- Trung tâm cứu hộ linh trưởng Đảo Tiên (theo lịch của vườn).
- Đạp xe trên đường rừng.

## Đi lại
Theo quốc lộ 20 rồi rẽ vào đường tới trụ sở vườn; qua sông Đồng Nai bằng phà để vào khu trung tâm.

## Kinh nghiệm
- Nên ở lại ít nhất một đêm để đi Bàu Sấu và xem thú đêm.
- Mùa khô (khoảng tháng 12 – 4) đường rừng dễ đi; mùa mưa có vắt, nên mang tất chống vắt.
- Giữ yên lặng, không cho thú ăn, không mang đồ nhựa dùng một lần vào rừng.', chi_tiet_en = '## About
Cat Tien National Park protects one of the most valuable remaining lowland tropical forests in Vietnam, along the Dong Nai River. Its core is part of the UNESCO Dong Nai Biosphere Reserve, and the Crocodile Lake (Bau Sau) wetland is a Ramsar site of international importance.

The forest is home to hundreds of bird and mammal species, including gaur, langurs, yellow-cheeked gibbons and Siamese crocodiles.

## Timeline
- 1978: Nam Cat Tien protected forest is created to save the lowland forest along the Dong Nai River.
- 1992: Cat Tien National Park is founded, merging Nam Cat Tien, Tay Cat Tien and Cat Loc.
- 2001: UNESCO recognises the Cat Tien Biosphere Reserve (expanded as the Dong Nai Biosphere Reserve in 2011).
- 2005: The Crocodile Lake wetland becomes a Ramsar site.
- 2010: The last Javan rhino in Vietnam is poached here — a hard lesson for conservation.
- Today: A leading centre for biodiversity, research and eco-tourism in the south.

## What to see
- Crocodile Lake: a forest trek to the wetland (register in advance, go with a ranger).
- Giant ancient trees along the trails; the Ben Cu rapids.
- Night safaris and early-morning birdwatching; cycling forest roads.
- The Dao Tien primate rescue centre (on the park''s schedule).

## Tips
- Stay at least one night for Crocodile Lake and the night safari.
- Dry season (about December–April) is easiest; in the rainy season bring leech socks.
- Keep quiet, never feed animals, and carry your rubbish out.' WHERE id = 'vuon-quoc-gia-cat-tien' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Thác Đắk Mai nằm trong Vườn quốc gia Bù Gia Mập, ở vùng rừng biên giới phía bắc thành phố. Nước đổ qua nhiều tầng đá giữa rừng già, tạo thành những hồ nước trong xanh. Thác được bình chọn vào nhóm điểm du lịch sinh thái có cảnh quan ấn tượng.

## Lịch sử hình thành
- Trước đây: Thác nằm sâu trong rừng biên giới, chỉ đồng bào và kiểm lâm biết tới.
- Từ khi thành lập Vườn quốc gia Bù Gia Mập (2002): Thác thuộc rừng đặc dụng, được bảo vệ cùng hệ sinh thái xung quanh.
- 2023: Được bình chọn vào nhóm điểm du lịch sinh thái có cảnh quan ấn tượng; du lịch có kiểm soát bắt đầu phát triển.

## Có gì để xem
- Các tầng thác giữa rừng nguyên sinh, đẹp nhất vào mùa mưa.
- Đường mòn trong rừng, suối và thảm thực vật phong phú của vườn quốc gia.

## Đi lại
Đường vào xa và qua rừng, nên đi ô tô gầm cao hoặc xe máy vững tay lái; liên hệ Vườn quốc gia Bù Gia Mập trước khi đi.

## Kinh nghiệm
- Thác nằm trong rừng đặc dụng: đi theo hướng dẫn của kiểm lâm, không tự ý cắm trại, đốt lửa.
- Mùa mưa đường trơn, nước dâng nhanh — theo dõi thời tiết, không tắm khi nước lớn.
- Không có nhiều dịch vụ ăn uống quanh thác, nên mang theo nước và đồ ăn nhẹ, mang rác ra khỏi rừng.', chi_tiet_en = '## About
Dak Mai Falls lies inside Bu Gia Map National Park, in the border forests in the north of the city. Water drops over several rock tiers through old-growth forest into clear pools.

## Timeline
- Earlier: Deep in the border forest, known only to locals and rangers.
- Since Bu Gia Map National Park was founded (2002): Protected as special-use forest.
- 2023: Listed among striking eco-tourism landscapes; controlled visits begin.

## Tips
- Access is long and through forest — use a sturdy vehicle and contact the national park first.
- It is protected forest: follow ranger guidance, no camping or fires without permission.
- Few services nearby: bring water and snacks, and take your rubbish out.' WHERE id = 'thac-dak-mai' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Vườn quốc gia Bù Gia Mập nằm ở vùng biên giới phía bắc thành phố, giáp Campuchia và Tây Nguyên. Đây là vùng chuyển tiếp giữa cao nguyên và đồng bằng Nam Bộ nên hệ sinh thái rất đa dạng, còn nhiều diện tích rừng nguyên sinh, rừng tre nứa và nhiều loài động vật hoang dã.

## Lịch sử hình thành
- Trước 2002: Vùng rừng biên giới được bảo vệ dưới dạng khu bảo tồn thiên nhiên.
- 2002: Thành lập Vườn quốc gia Bù Gia Mập.
- Ngày nay: Bảo tồn rừng nguyên sinh vùng chuyển tiếp Tây Nguyên – Đông Nam Bộ, phát triển du lịch sinh thái có kiểm soát.

## Có gì để xem
- Thác Đắk Mai và các dòng suối trong rừng.
- Các tuyến đi bộ xuyên rừng, quan sát chim và thực vật.
- Văn hoá của đồng bào S''tiêng, M''nông sống quanh vùng đệm.

## Đi lại
Vườn ở xa trung tâm, nên đi ô tô và ở lại qua đêm tại khu vực lân cận. Liên hệ ban quản lý vườn để đăng ký tham quan và thuê hướng dẫn viên.

## Kinh nghiệm
- Mùa khô thuận lợi cho đi rừng; mang giày đi rừng, áo dài tay, thuốc chống côn trùng.
- Tuân thủ quy định của rừng đặc dụng: không săn bắt, không hái lượm, không xả rác.', chi_tiet_en = '## About
Bu Gia Map National Park lies on the northern border of the city, next to Cambodia and the Central Highlands. As a transition zone between highland and lowland, it has great biodiversity, large tracts of primary forest, bamboo forest and wildlife.

## Timeline
- Before 2002: The border forest is protected as a nature reserve.
- 2002: Bu Gia Map National Park is established.
- Today: Protecting primary forest between the Central Highlands and the south-east, with controlled eco-tourism.

## Tips
- Remote: travel by car, stay nearby overnight, and register with the park office for a guide.
- Dry season is best for trekking; bring long sleeves and insect repellent.' WHERE id = 'vuon-quoc-gia-bu-gia-map' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Núi Bà Rá cao khoảng 723 m, là ngọn núi cao nhất vùng Phước Long và là biểu tượng của vùng đất này. Đứng trên đỉnh có thể nhìn toàn cảnh đồi núi, rừng cao su và lòng hồ thuỷ điện Thác Mơ ngay dưới chân núi.

Dưới chân núi là di tích nhà tù Bà Rá do thực dân Pháp xây dựng, nơi giam giữ nhiều chiến sĩ cách mạng — nay là di tích lịch sử quốc gia.

## Lịch sử hình thành
- Từ xa xưa: Núi gắn với truyền thuyết về bà Rá và là nơi sinh sống của đồng bào S''tiêng quanh vùng.
- Những năm 1940: Thực dân Pháp lập nhà tù Bà Rá dưới chân núi để giam giữ chiến sĩ cách mạng.
- 1945 – 1975: Vùng núi là địa bàn hoạt động của lực lượng kháng chiến.
- Những năm 1990: Hồ thuỷ điện Thác Mơ hình thành ngay chân núi, tạo nên cảnh núi – hồ hiện nay.
- Ngày nay: Di tích nhà tù được công nhận cấp quốc gia; núi có đường leo và cáp treo phục vụ du lịch.

## Có gì để xem
- Đường lên đỉnh bằng bậc đá hoặc cáp treo, các miếu thờ trên sườn núi.
- Toàn cảnh hồ Thác Mơ, đặc biệt lúc bình minh và hoàng hôn.
- Di tích nhà tù Bà Rá.

## Kinh nghiệm
- Leo bộ lên đỉnh mất vài giờ, nên xuất phát sớm, mang đủ nước.
- Mùa mưa đường đá trơn, có sương mù trên đỉnh — kiểm tra thời tiết trước khi leo.
- Rằm tháng Giêng có nhiều người hành hương lên các miếu thờ trên núi.', chi_tiet_en = '## About
Ba Ra Mountain, about 723 m high, is the highest peak of the Phuoc Long area and its landmark. From the top you see rolling hills, rubber plantations and the Thac Mo hydropower lake below.

At the foot of the mountain is the Ba Ra prison, built by the French colonial government to hold revolutionaries — now a national historic site.

## Timeline
- Ancient times: The mountain is tied to the legend of Lady Ra and to the S''tieng communities around it.
- 1940s: The French colonial government builds Ba Ra prison at its foot.
- 1945 – 1975: The area is a resistance stronghold.
- 1990s: The Thac Mo hydropower lake forms below the mountain.
- Today: The prison is a national historic site; trails and a cable car serve visitors.

## Tips
- Climbing on foot takes a few hours; start early and carry water. A cable car also runs to the upper slopes.
- In the rainy season the stone path is slippery and the summit often misty.' WHERE id = 'nui-ba-ra' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Núi Chứa Chan (còn gọi là núi Gia Lào) cao khoảng 837 m, là ngọn núi cao nhất vùng Xuân Lộc và là điểm leo núi, hành hương quen thuộc của miền Đông Nam Bộ. Trên sườn núi có chùa Gia Lào hàng trăm năm tuổi cùng nhiều chùa, miếu nhỏ.

## Lịch sử hình thành
- Từ thế kỷ XVIII: Các nhà sư dựng am, chùa trên sườn núi; chùa Gia Lào trở thành điểm hành hương của vùng.
- 1945 – 1975: Đỉnh núi (cao điểm 837) là vị trí quân sự quan trọng nhờ tầm quan sát rộng.
- Sau 1975: Chùa chiền được tu bổ; núi trở thành điểm leo núi, hành hương đầu năm của miền Đông.
- Những năm gần đây: Có cáp treo lên các chùa trên sườn núi; được công nhận là di tích danh thắng của địa phương.

## Có gì để xem
- Chùa Gia Lào và các điểm thờ tự trên đường lên núi.
- Đường leo qua rừng và bãi đá, nhìn xuống đồng ruộng, vườn cây vùng Xuân Lộc.
- Đỉnh núi đón bình minh, mây phủ vào sáng sớm mùa mưa.
- Cáp treo phục vụ khách lên các chùa trên sườn núi.

## Kinh nghiệm
- Leo tới đỉnh mất nhiều giờ và khá dốc: mang giày tốt, nước, đèn pin nếu đi sớm; nên đi theo nhóm.
- Không leo vào ban đêm hay khi mưa lớn; báo cho người nhà lộ trình của mình.
- Dịp đầu năm âm lịch rất đông người hành hương.
- Đặc sản quanh vùng: chôm chôm, sầu riêng Xuân Lộc theo mùa.', chi_tiet_en = '## About
Chua Chan Mountain (also called Gia Lao), about 837 m high, is the highest peak of the Xuan Loc area and a favourite for hiking and pilgrimage in south-east Vietnam. The centuries-old Gia Lao Pagoda and several shrines sit on its slopes.

## Timeline
- From the 18th century: Monks build hermitages and pagodas; Gia Lao Pagoda becomes a pilgrimage site.
- 1945 – 1975: The summit (Hill 837) is a strategic military lookout.
- After 1975: Pagodas are restored; the mountain becomes a hiking and new-year pilgrimage spot.
- Recent years: A cable car serves the pagodas on the slopes.

## Tips
- Reaching the summit takes several hours on steep trails: good shoes, water, go in a group.
- Do not hike at night or in heavy rain. It is very busy around the lunar new year.
- A cable car serves the pagodas on the slopes.' WHERE id = 'nui-chua-chan' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Cuối thế kỷ XVII, nhóm di dân người Hoa do Trần Thượng Xuyên dẫn đầu được chúa Nguyễn cho định cư ở vùng Đồng Nai. Họ cùng cư dân Việt biến cù lao Phố thành thương cảng Nông Nại Đại Phố — thương cảng sầm uất bậc nhất phương Nam thế kỷ XVII – XVIII, thuyền buôn nhiều nước ra vào tấp nập.

Cuối thế kỷ XVIII, thương cảng bị tàn phá trong chiến tranh và suy tàn; trung tâm buôn bán chuyển dần về Sài Gòn – Chợ Lớn. Nhưng cù lao vẫn giữ lại nhiều đình, chùa, miếu cổ.

## Lịch sử hình thành
- 1679: Nhóm di dân người Hoa do Trần Thượng Xuyên dẫn đầu được chúa Nguyễn cho định cư ở vùng Đồng Nai.
- 1684: Dựng Thất Phủ cổ miếu (chùa Ông), nơi sinh hoạt chung của cộng đồng thương nhân.
- Cuối thế kỷ XVII – giữa XVIII: Thương cảng Nông Nại Đại Phố thịnh vượng nhất phương Nam, thuyền buôn nhiều nước ra vào.
- 1776 – 1777: Chiến tranh tàn phá thương cảng; thương nhân dời về vùng Sài Gòn – Chợ Lớn, cù lao suy tàn.
- Thế kỷ XIX – XX: Cù lao trở thành làng vườn ven sông, còn giữ nhiều đình, chùa, miếu cổ.
- Ngày nay: Vùng di sản với các di tích cấp quốc gia, du lịch văn hoá – tâm linh và vườn cây.

## Có gì để xem
- Chùa Ông (Thất Phủ cổ miếu), dựng từ cuối thế kỷ XVII — một trong những miếu Hoa cổ nhất Nam Bộ.
- Chùa Đại Giác, ngôi chùa cổ gắn với nhiều giai thoại thời chúa Nguyễn.
- Đền thờ Nguyễn Hữu Cảnh ngay bên sông.
- Vườn cây ăn trái, đường làng ven sông Đồng Nai.

## Kinh nghiệm
- Đi xe đạp hoặc xe máy vòng quanh cù lao trong nửa ngày là hợp lý.
- Rằm tháng Giêng có lễ hội ở chùa Ông, rất đông và nhiều nghi lễ truyền thống.
- Ăn mặc lịch sự khi vào chùa, miếu.', chi_tiet_en = '## About
In the late 17th century Chinese migrants led by Tran Thuong Xuyen settled in the Dong Nai region. Together with Vietnamese settlers they turned Cu Lao Pho island into the port of Nong Nai Dai Pho — the busiest trading port of the south in the 17th and 18th centuries.

War in the late 18th century ruined the port and trade moved to Saigon – Cho Lon, but the island kept many old temples and pagodas.

## Timeline
- 1679: Chinese migrants led by Tran Thuong Xuyen are allowed to settle in the Dong Nai region.
- 1684: That Phu Co Mieu (Ong Pagoda) is built as the merchants'' community temple.
- Late 17th – mid 18th century: Nong Nai Dai Pho is the most prosperous port of the south.
- 1776 – 1777: War destroys the port; merchants move to Saigon – Cho Lon.
- 19th – 20th century: The island becomes a riverside village of orchards, keeping its old temples.
- Today: A heritage area of national relics, cultural and spiritual tourism.

## What to see
- Ong Pagoda (That Phu Co Mieu), founded in the late 17th century — one of the oldest Chinese temples in the south.
- Dai Giac Pagoda; the Nguyen Huu Canh temple by the river; orchards and riverside lanes.

## Tips
- Half a day by bicycle or motorbike is enough to loop the island.
- The first full moon of the lunar year brings a large festival at Ong Pagoda.' WHERE id = 'cu-lao-pho' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Sóc Bom Bo là làng của đồng bào S''tiêng, nổi tiếng khắp cả nước qua bài hát "Tiếng chày trên sóc Bom Bo" của nhạc sĩ Xuân Hồng. Trong kháng chiến, dân làng ngày đêm giã gạo nuôi bộ đội — tiếng chày vang khắp núi rừng trở thành biểu tượng của tinh thần đoàn kết quân dân.

Ngày nay ở đây có khu bảo tồn văn hoá dân tộc S''tiêng, giới thiệu nhà dài truyền thống, nông cụ, nhạc cụ và đời sống của đồng bào.

## Lịch sử hình thành
- Từ lâu đời: Vùng cư trú của đồng bào S''tiêng với nhà dài, nương rẫy, cồng chiêng.
- 1945 – 1975: Dân làng giã gạo nuôi bộ đội, góp sức cho các chiến dịch ở miền Đông.
- 1965: Nhạc sĩ Xuân Hồng sáng tác "Tiếng chày trên sóc Bom Bo", đưa tên sóc đi khắp cả nước.
- Sau 1975: Sóc được công nhận là di tích lịch sử.
- Ngày nay: Khu bảo tồn văn hoá dân tộc S''tiêng, giữ nhà dài, nghề dệt, cồng chiêng và lễ hội truyền thống.

## Có gì để xem
- Nhà dài, nhà sàn truyền thống của người S''tiêng.
- Cồng chiêng, nghề dệt thổ cẩm, đan lát, rượu cần.
- Khu di tích lịch sử gắn với câu chuyện giã gạo nuôi quân.
- Các lễ hội truyền thống của đồng bào (theo lịch địa phương).

## Kinh nghiệm
- Tôn trọng phong tục: hỏi trước khi chụp ảnh người dân, không tự ý vào nhà dân.
- Mua sản phẩm thổ cẩm, đồ đan của bà con là cách hỗ trợ giữ nghề truyền thống.', chi_tiet_en = '## About
Bom Bo is a village of the S''tieng people, known nationwide through the song "The sound of pestles in Bom Bo village". During the war villagers pounded rice day and night to feed the soldiers, and the sound became a symbol of solidarity.

Today a S''tieng cultural conservation area shows traditional longhouses, tools, instruments and daily life.

## Timeline
- Long ago: Home of the S''tieng people with longhouses, upland fields and gongs.
- 1945 – 1975: Villagers pound rice to feed the soldiers.
- 1965: Composer Xuan Hong writes "The sound of pestles in Bom Bo village", making the name known nationwide.
- After 1975: The village is recognised as a historic site.
- Today: A S''tieng cultural conservation area keeping longhouses, weaving, gongs and festivals.

## What to see
- Traditional S''tieng longhouses and stilt houses.
- Gongs, brocade weaving, basketry and rice wine; the historic site of the rice-pounding story.

## Tips
- Respect local customs: ask before photographing people and do not enter homes uninvited.
- Buying brocade and handicrafts helps keep these crafts alive.' WHERE id = 'soc-bom-bo' AND chi_tiet IS NULL;
UPDATE dia_diem SET chi_tiet = '## Giới thiệu
Hồ Suối Lam là hồ nước nằm giữa vùng đồi rừng và vườn cây ở phía bắc thành phố, gần khu vực Đồng Xoài cũ. Mặt hồ phẳng lặng, quanh hồ là rừng cây và vườn cao su, điều — chỗ dã ngoại, thư giãn cuối tuần quen thuộc của người dân địa phương.

## Lịch sử hình thành
- Trước đây: Vùng đồi đất đỏ bazan với rừng và vườn cây công nghiệp.
- Sau khi hình thành hồ: Mặt nước giữa đồi rừng thành nơi dã ngoại, nghỉ ngơi của người dân quanh vùng.
- Ngày nay: Điểm thư giãn cuối tuần của địa phương. (Mốc năm cụ thể: cán bộ bổ sung.)

## Có gì để xem
- Cảnh hồ buổi sáng sớm có sương và lúc hoàng hôn.
- Đường đi dạo, chỗ ngồi picnic dưới tán cây ven hồ.
- Vườn cây công nghiệp đặc trưng vùng đất đỏ bazan.

## Kinh nghiệm
- Dịch vụ quanh hồ còn ít, nên mang theo nước, đồ ăn và mang rác về.
- Không tắm hồ ở nơi không có biển cho phép — hồ sâu, đáy dốc.
- Kết hợp với các điểm khác ở vùng phía bắc như núi Bà Rá, sóc Bom Bo.', chi_tiet_en = '## About
Suoi Lam is a lake among wooded hills and plantations in the north of the city, near old Dong Xoai. The calm water is ringed by trees, rubber and cashew gardens — a local favourite for weekend picnics.

## Timeline
- Earlier: Red basalt hills with forest and plantations.
- After the lake formed: A picnic and rest spot for local people.
- Today: A local weekend retreat.

## Tips
- Few services around the lake: bring water and food, and take your rubbish home.
- Do not swim where there is no sign allowing it — the lake is deep with steep banks.
- Combine with Ba Ra Mountain or Bom Bo village in the north.' WHERE id = 'ho-suoi-lam' AND chi_tiet IS NULL;

-- ============================================================================
-- GIAI ĐOẠN 6 — ĐIỂM QUAN SÁT 360°
-- ============================================================================
-- Mỗi điểm quan sát là một ảnh toàn cảnh 360° chụp tại một vị trí của địa
-- điểm (đỉnh núi, cổng chính, bến thuyền…): du khách kéo chuột hoặc xoay điện
-- thoại để nhìn quanh. Ảnh lưu trong cơ sở dữ liệu như ảnh địa điểm.
--   goc_ngang: góc chụp ngang (360 = ảnh 360° trọn vòng, 180 = ảnh panorama nửa vòng)
--   huong_dau: hướng nhìn lúc mở (độ, -180..180)
--   nguon: 'anh' = ảnh cán bộ tải lên (du_lieu), 'google' = ảnh 360° trên Google Maps
--          (Street View hoặc ảnh 360° người dùng đăng), nhúng thẳng vào trang qua google_url
CREATE TABLE IF NOT EXISTS diem_quan_sat (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  dia_diem_id  VARCHAR(80) NOT NULL,
  ten          VARCHAR(120) NOT NULL,
  ten_en       VARCHAR(120) NULL,
  nguon        ENUM('anh','google') NOT NULL DEFAULT 'anh',
  du_lieu      MEDIUMBLOB NULL,
  google_url   VARCHAR(2000) NULL,
  kieu         VARCHAR(20) NULL,
  rong         SMALLINT UNSIGNED NULL,
  cao          SMALLINT UNSIGNED NULL,
  goc_ngang    SMALLINT UNSIGNED NOT NULL DEFAULT 360,
  huong_dau    SMALLINT NOT NULL DEFAULT 0,
  thu_tu       SMALLINT NOT NULL DEFAULT 0,
  nguoi_tai    INT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_diem (dia_diem_id, thu_tu),
  FOREIGN KEY (dia_diem_id) REFERENCES dia_diem(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_tai) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Bảng tạo từ bản trước (chưa có nguồn Google Maps): thêm cột.
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diem_quan_sat' AND COLUMN_NAME = 'google_url');
SET @lenh := IF(@co = 0, 'ALTER TABLE diem_quan_sat ADD COLUMN nguon ENUM(''anh'',''google'') NOT NULL DEFAULT ''anh'' AFTER ten_en, MODIFY du_lieu MEDIUMBLOB NULL, ADD COLUMN google_url VARCHAR(2000) NULL AFTER du_lieu, MODIFY kieu VARCHAR(20) NULL', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

-- ============================================================================
-- GIAI ĐOẠN 7 — TIN TỨC CÓ ẢNH, TIN NỔI BẬT, ĐƯỜNG DẪN NGUỒN
-- ============================================================================
-- noi_bat: tin nổi bật, tự lướt ở đầu trang Tin tức. lien_ket: đường dẫn tới
-- nguồn tin (trang của sở, báo…). Nội dung tin nới lên TEXT để viết bài dài.
SET @co := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tin_tuc' AND COLUMN_NAME = 'noi_bat');
SET @lenh := IF(@co = 0, 'ALTER TABLE tin_tuc ADD COLUMN noi_bat BOOLEAN NOT NULL DEFAULT FALSE AFTER hien, ADD COLUMN lien_ket VARCHAR(300) NULL AFTER dia_diem_id, MODIFY noi_dung TEXT NULL, MODIFY noi_dung_en TEXT NULL', 'DO 0');
PREPARE lenh FROM @lenh; EXECUTE lenh; DEALLOCATE PREPARE lenh;

-- Ảnh của tin (ảnh đầu là ảnh bìa), lưu trong cơ sở dữ liệu như ảnh địa điểm.
CREATE TABLE IF NOT EXISTS anh_tin (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  tin_id       INT NOT NULL,
  du_lieu      MEDIUMBLOB NOT NULL,
  kieu         VARCHAR(20) NOT NULL,
  rong         SMALLINT UNSIGNED NULL,
  cao          SMALLINT UNSIGNED NULL,
  chu_thich    VARCHAR(200) NULL,
  thu_tu       SMALLINT NOT NULL DEFAULT 0,
  nguoi_tai    INT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tin (tin_id, thu_tu),
  FOREIGN KEY (tin_id) REFERENCES tin_tuc(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_tai) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT COUNT(*) AS so_dia_diem, (SELECT COUNT(*) FROM xa_phuong) AS so_xa_phuong FROM dia_diem;
