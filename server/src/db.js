/**
 * Kết nối MySQL bằng connection pool (mysql2/promise).
 * Hỗ trợ SSL cho MySQL cloud (Aiven...) qua biến DB_SSL_CA hoặc DB_SSL.
 */
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import 'dotenv/config';

function buildSsl() {
  if (process.env.DB_SSL_CA) return { ca: fs.readFileSync(process.env.DB_SSL_CA) };
  // Nhà cung cấp cho tải ca.pem nhưng Render không có filesystem cố định
  // -> cho phép dán thẳng nội dung PEM vào biến môi trường.
  if (process.env.DB_SSL_CA_PEM) return { ca: process.env.DB_SSL_CA_PEM };
  /* DB_SSL=true: BẬT TLS và VẪN xác thực CA của hệ thống.
     Trước đây nhánh này trả rejectUnauthorized:false -> mã hoá mà KHÔNG xác
     thực, tức chỉ chống nghe lén thụ động, không chống được man-in-the-middle.
     Kẻ đứng giữa Render và MySQL cloud đọc được đúng thứ mà lớp AES-256-GCM
     đang cố bảo vệ: bản ghi danh tính ĐÃ GIẢI MÃ trong kết quả truy vấn. */
  if (process.env.DB_SSL === 'true') return { minVersion: 'TLSv1.2' };
  return undefined;
}

/** Thông số kết nối dùng chung (pool và kết nối riêng để tự nâng cấp cơ sở dữ liệu). */
export const cauHinhKetNoi = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'du_lich_dong_nai',
  charset: 'utf8mb4_unicode_ci',
  dateStrings: ['DATE'],
  ssl: buildSsl(),
});

export const pool = mysql.createPool({
  ...cauHinhKetNoi(),
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
  /* Cột kiểu DATE (ngày của kỳ báo cáo, ngày vi phạm...) trả về chuỗi
     "2026-06-30" thay vì đối tượng Date: Date của JavaScript luôn kèm giờ và
     múi giờ, đổi qua đổi lại dễ lệch sang ngày hôm trước. */
  dateStrings: ['DATE'],
  ssl: buildSsl(),
});
