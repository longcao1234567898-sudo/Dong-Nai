/**
 * TÀI KHOẢN CỦA TÔI — /api/quan-tri/tai-khoan/...
 *
 * Cán bộ tự đổi mật khẩu và tự bật/tắt xác thực hai lớp cho chính mình.
 * Đổi mật khẩu, bật, tắt đều phải chứng minh lại là chính chủ (mật khẩu hiện
 * tại hoặc mã 6 số): một phiên đăng nhập bị bỏ quên trên máy tính chung không
 * đủ để kẻ khác chiếm hẳn tài khoản.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { ghiNhatKy, layIpThat } from '../lib/helpers.js';
import { kiemMatKhau } from '../lib/mat-khau.js';
import { taoBiMat, kiemMa, duongDanOtp } from '../lib/totp.js';
import { hashRefreshToken } from '../lib/token.js';

const router = Router();
const gioiHan = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => layIpThat(req),
  message: { error: 'Thử quá nhiều lần. Chờ 15 phút rồi thử lại.' } });

async function toi(req) {
  const [[s]] = await pool.query('SELECT id, username, full_name, password_hash, totp_bat, totp_bi_mat, totp_buoc_cuoi FROM staff WHERE id = ?', [req.staff.id]);
  return s;
}

router.get('/', async (req, res, next) => {
  try {
    const s = await toi(req);
    res.json({ hoTen: s.full_name, username: s.username, haiLop: !!s.totp_bat });
  } catch (e) { next(e); }
});

router.post('/doi-mat-khau', gioiHan, async (req, res, next) => {
  try {
    const s = await toi(req);
    const { matKhauCu, matKhauMoi } = req.body || {};
    if (!(await bcrypt.compare(String(matKhauCu || ''), s.password_hash))) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    const loi = kiemMatKhau(matKhauMoi, s.username);
    if (loi) return res.status(400).json({ error: loi });
    if (matKhauMoi === matKhauCu) return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu cũ.' });
    await pool.query('UPDATE staff SET password_hash = ? WHERE id = ?', [await bcrypt.hash(matKhauMoi, 12), s.id]);
    /* Đổi mật khẩu thường vì nghi bị lộ -> thu hồi mọi phiên khác, chỉ giữ phiên đang dùng. */
    const hienTai = req.cookies?.refreshToken ? hashRefreshToken(req.cookies.refreshToken) : '';
    await pool.query('DELETE FROM refresh_tokens WHERE staff_id = ? AND token_hash <> ?', [s.id, hienTai]);
    await ghiNhatKy(pool, req, { hanhDong: 'doi_mat_khau', loaiDoiTuong: 'staff', doiTuongId: s.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* Bước 1: tạo khoá bí mật, CHƯA bật — để quét mã QR. Bước 2: nhập đúng mã mới bật. */
router.post('/hai-lop/bat-dau', gioiHan, async (req, res, next) => {
  try {
    const s = await toi(req);
    if (s.totp_bat) return res.status(409).json({ error: 'Xác thực hai lớp đang bật rồi.' });
    const biMat = taoBiMat();
    await pool.query('UPDATE staff SET totp_bi_mat = ?, totp_buoc_cuoi = NULL WHERE id = ?', [biMat, s.id]);
    res.json({ biMat, duongDan: duongDanOtp(biMat, s.username) });
  } catch (e) { next(e); }
});

router.post('/hai-lop/xac-nhan', gioiHan, async (req, res, next) => {
  try {
    const s = await toi(req);
    if (s.totp_bat) return res.status(409).json({ error: 'Xác thực hai lớp đang bật rồi.' });
    const kq = kiemMa(s.totp_bi_mat, req.body?.ma);
    if (!kq.ok) return res.status(400).json({ error: 'Mã không đúng. Kiểm tra đồng hồ điện thoại đúng giờ, rồi nhập mã đang hiện.' });
    await pool.query('UPDATE staff SET totp_bat = TRUE, totp_buoc_cuoi = ? WHERE id = ?', [kq.buoc, s.id]);
    await ghiNhatKy(pool, req, { hanhDong: 'bat_hai_lop', loaiDoiTuong: 'staff', doiTuongId: s.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/hai-lop/tat', gioiHan, async (req, res, next) => {
  try {
    const s = await toi(req);
    if (!s.totp_bat) return res.status(409).json({ error: 'Xác thực hai lớp chưa bật.' });
    if (!(await bcrypt.compare(String(req.body?.matKhau || ''), s.password_hash))) return res.status(400).json({ error: 'Mật khẩu không đúng.' });
    if (!kiemMa(s.totp_bi_mat, req.body?.ma, { buocCuoi: s.totp_buoc_cuoi }).ok) return res.status(400).json({ error: 'Mã 6 số không đúng.' });
    await pool.query('UPDATE staff SET totp_bat = FALSE, totp_bi_mat = NULL, totp_buoc_cuoi = NULL WHERE id = ?', [s.id]);
    await ghiNhatKy(pool, req, { hanhDong: 'tat_hai_lop', loaiDoiTuong: 'staff', doiTuongId: s.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
