/**
 * Máy chủ DU LỊCH ĐỒNG NAI.
 *
 * Cấu hình bảo mật chép theo Điểm Chạm An Ninh: helmet, Permissions-Policy,
 * CORS có danh sách trắng kèm cookie, tin một tầng proxy để lấy đúng IP thật.
 * Phần đăng nhập cán bộ (routes/auth.js) dùng nguyên bản đã kiểm chứng.
 */
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import congKhaiRouter from './routes/cong-khai.js';
import quanTriRouter from './routes/quan-tri.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { turnstileEnabled } from './lib/turnstile.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);   // Render đặt một tầng proxy phía trước
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

/* CORS: chỉ cho giao diện của mình gọi, kèm cookie phiên đăng nhập.
   CORS_ORIGIN có thể ghi nhiều địa chỉ, ngăn bằng dấu phẩy. */
const choPhep = ['http://localhost:5173', ...String(process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)];
app.use(cors({
  origin(origin, cb) { if (!origin || choPhep.includes(origin)) return cb(null, true); cb(new Error('CORS không cho phép địa chỉ này')); },
  credentials: true,
}));
/* Dữ liệu dạng JSON chỉ cần gói nhỏ. Tệp Excel tải lên đi đường riêng
   (express.raw ở routes/bao-cao.js) với giới hạn riêng 5 MB. */
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  let db = false;
  try { await pool.query('SELECT 1'); db = true; } catch { /* báo false */ }
  res.status(db ? 200 : 503).json({ ok: db, db, turnstile: turnstileEnabled() });
});

app.use('/api/auth', authRouter);
app.use('/api/cong-khai', congKhaiRouter);
app.use('/api/quan-tri', requireAuth, quanTriRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy.' }));
app.use(errorHandler);

/* Kiểm cấu trúc cơ sở dữ liệu lúc khởi động: mã mới chạy trên cơ sở dữ liệu
   cũ (quên chạy lại tệp SQL) thì báo rõ ngay, thay vì để từng trang báo lỗi
   khó hiểu. Chỉ cảnh báo, không chặn khởi động. */
const CAN_CO = ['xa_phuong', 'ky_bao_cao', 'nop_bao_cao', 'khong_phat_sinh', 'lich_su_sua', 'bc_khach', 'bc_du_an', 'bc_luu_tru'];
async function kiemCauTruc() {
  try {
    const [rows] = await pool.query('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()');
    const co = new Set(rows.map((r) => r.t ?? r.TABLE_NAME));
    const thieu = CAN_CO.filter((t) => !co.has(t));
    if (thieu.length) console.warn(`⚠️  Cơ sở dữ liệu thiếu bảng: ${thieu.join(', ')}.\n   → Dán lại toàn bộ database/du_lich_dong_nai.sql vào HeidiSQL rồi F9 (chạy lại không mất số liệu).`);
  } catch (e) { console.warn('⚠️  Chưa kiểm được cấu trúc cơ sở dữ liệu:', e.message); }
}

app.listen(PORT, () => {
  console.log(`🌿 Du lịch Đồng Nai — máy chủ chạy tại cổng ${PORT}`);
  if (!turnstileEnabled()) console.warn('⚠️  Chưa khai TURNSTILE_SECRET_KEY: ô xác minh chống người máy đang tắt.');
  kiemCauTruc();
});
