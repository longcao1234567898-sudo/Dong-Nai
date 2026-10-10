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
-- ============================================================================

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

SELECT COUNT(*) AS so_dia_diem FROM dia_diem;
