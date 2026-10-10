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
app.use(express.json({ limit: '200kb' }));   // không nhận tệp, gói nhỏ là đủ
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

app.listen(PORT, () => {
  console.log(`🌿 Du lịch Đồng Nai — máy chủ chạy tại cổng ${PORT}`);
  if (!turnstileEnabled()) console.warn('⚠️  Chưa khai TURNSTILE_SECRET_KEY: ô xác minh chống người máy đang tắt.');
});
