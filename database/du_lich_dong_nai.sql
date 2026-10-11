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

SELECT COUNT(*) AS so_dia_diem, (SELECT COUNT(*) FROM xa_phuong) AS so_xa_phuong FROM dia_diem;
