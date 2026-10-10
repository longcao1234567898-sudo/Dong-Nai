/**
 * ĐƯỜNG DẪN QUẢN TRỊ — mọi đường dẫn ở đây đã qua requireAuth (index.js).
 *
 * Phân quyền:
 *   handler (cán bộ)   nhập lượt khách, xem tổng quan
 *   manager (chỉ huy)  + quản lý địa điểm, ẩn đánh giá vi phạm, nhật ký, xuất dữ liệu
 *   admin (quản trị)   + khoá, mở khoá, gỡ tạm khoá tài khoản cán bộ
 * Tạo tài khoản mới vẫn bằng lệnh trên máy chủ (scripts-them-can-bo.js), giống
 * Điểm Chạm An Ninh: chiếm được một phiên đăng nhập cũng không tự tạo được
 * tài khoản cửa sau.
 */
import { Router } from 'express';
import { pool } from '../db.js';
import { authorize } from '../middleware/authorize.js';
import { xoaDemTrangThai } from '../middleware/auth.js';
import { ghiNhatKy } from '../lib/helpers.js';
import { sanitizeText } from '../lib/security.js';
import { xoaDemCongKhai } from './cong-khai.js';

const router = Router();
const CHI_HUY = authorize('admin', 'manager');
const LOAI = ['thien-nhien', 'di-tich', 'vui-choi', 'luu-tru', 'am-thuc', 'dac-san'];
const thangHopLe = (t) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(t || ''));
/* Khung toạ độ của thành phố Đồng Nai (sau hợp nhất với Bình Phước), nới
   rộng một chút. Chặn lỗi hay gặp nhất: đảo ngược vĩ độ và kinh độ. */
const trongKhung = (lat, lng) => lat >= 10.3 && lat <= 12.4 && lng >= 106.4 && lng <= 107.7;

function slug(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}
function docDiaDiem(b) {
  const lat = Number(b.lat), lng = Number(b.lng);
  const loi = !String(b.ten || '').trim() ? 'Thiếu tên địa điểm.'
    : !LOAI.includes(b.loai) ? 'Loại địa điểm không hợp lệ.'
    : !Number.isFinite(lat) || !Number.isFinite(lng) ? 'Vĩ độ và kinh độ phải là số, ví dụ 10.9645 và 106.8016.'
    : !trongKhung(lat, lng) ? 'Toạ độ nằm ngoài thành phố Đồng Nai. Kiểm xem có đảo ngược vĩ độ và kinh độ không.'
    : b.web && !/^https?:\/\//i.test(String(b.web)) ? 'Trang web phải bắt đầu bằng http:// hoặc https://' : null;
  return { loi, du: {
    ten: sanitizeText(String(b.ten || ''), 120), loai: b.loai, mo_ta: sanitizeText(String(b.moTa || ''), 1500) || null,
    dia_chi: sanitizeText(String(b.diaChi || ''), 200) || null, lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7,
    sdt: String(b.sdt || '').replace(/[^0-9+ .()-]/g, '').slice(0, 20) || null, web: String(b.web || '').slice(0, 200) || null,
    gio_mo: sanitizeText(String(b.gioMo || ''), 80) || null, noi_bat: !!b.noiBat, hien: b.hien !== false, da_kiem_tra: !!b.daKiemTra,
  } };
}

/* ------------------------------------------------------------ TỔNG QUAN */
router.get('/tong-quan', async (_req, res, next) => {
  try {
    const thang = new Date().toISOString().slice(0, 7);
    const [[a]] = await pool.query('SELECT COUNT(*) AS so, SUM(da_kiem_tra = 0) AS cho FROM dia_diem');
    const [[b]] = await pool.query('SELECT COALESCE(SUM(noi_dia + quoc_te), 0) AS k FROM luot_khach WHERE thang = ?', [thang]);
    const [[c]] = await pool.query('SELECT COUNT(*) AS so FROM danh_gia WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    res.json({ diaDiem: Number(a.so), choKiemTra: Number(a.cho || 0), khachThangNay: Number(b.k), danhGiaMoi: Number(c.so) });
  } catch (e) { next(e); }
});

/* ------------------------------------------------------------ ĐỊA ĐIỂM */
router.get('/dia-diem', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM dia_diem ORDER BY ten');
    res.json(rows.map((r) => ({ id: r.id, ten: r.ten, loai: r.loai, moTa: r.mo_ta, diaChi: r.dia_chi, lat: Number(r.lat), lng: Number(r.lng),
      sdt: r.sdt, web: r.web, gioMo: r.gio_mo, noiBat: !!r.noi_bat, hien: !!r.hien, daKiemTra: !!r.da_kiem_tra, nguon: r.nguon })));
  } catch (e) { next(e); }
});
router.post('/dia-diem', CHI_HUY, async (req, res, next) => {
  try {
    const { loi, du } = docDiaDiem(req.body || {}); if (loi) return res.status(400).json({ error: loi });
    const id = slug(du.ten) || 'diem-' + Date.now();
    const [[co]] = await pool.query('SELECT id FROM dia_diem WHERE id = ?', [id]);
    if (co) return res.status(409).json({ error: 'Đã có địa điểm cùng tên. Sửa địa điểm đó thay vì thêm mới.' });
    await pool.query('INSERT INTO dia_diem SET ?', [{ id, ...du, nguon: 'Cán bộ nhập' }]);
    await ghiNhatKy(pool, req, { hanhDong: 'them_dia_diem', loaiDoiTuong: 'dia_diem', doiTuongId: id, chiTiet: { ten: du.ten } });
    xoaDemCongKhai(); res.status(201).json({ id });
  } catch (e) { next(e); }
});
router.put('/dia-diem/:id', CHI_HUY, async (req, res, next) => {
  try {
    const { loi, du } = docDiaDiem(req.body || {}); if (loi) return res.status(400).json({ error: loi });
    const [kq] = await pool.query('UPDATE dia_diem SET ? WHERE id = ?', [du, String(req.params.id)]);
    if (!kq.affectedRows) return res.status(404).json({ error: 'Không tìm thấy địa điểm.' });
    await ghiNhatKy(pool, req, { hanhDong: 'sua_dia_diem', loaiDoiTuong: 'dia_diem', doiTuongId: req.params.id, chiTiet: { ten: du.ten } });
    xoaDemCongKhai(); res.json({ ok: true });
  } catch (e) { next(e); }
});
router.patch('/dia-diem/:id/hien', CHI_HUY, async (req, res, next) => {
  try {
    const hien = !!req.body?.hien;
    await pool.query('UPDATE dia_diem SET hien = ? WHERE id = ?', [hien, String(req.params.id)]);
    await ghiNhatKy(pool, req, { hanhDong: hien ? 'hien_dia_diem' : 'an_dia_diem', loaiDoiTuong: 'dia_diem', doiTuongId: req.params.id });
    xoaDemCongKhai(); res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ------------------------------------------------------------ LƯỢT KHÁCH */
async function luuKhach(req, d) {
  const nd = Math.floor(Number(d.noiDia)), qt = Math.floor(Number(d.quocTe || 0));
  if (!thangHopLe(d.thang)) return 'Tháng phải dạng 2026-08.';
  if (!(nd >= 0 && qt >= 0 && nd < 1e8 && qt < 1e8)) return 'Số khách không hợp lệ.';
  const [[dd]] = await pool.query('SELECT id FROM dia_diem WHERE id = ?', [String(d.diaDiemId || '')]);
  if (!dd) return `Không có địa điểm mã "${d.diaDiemId}".`;
  await pool.query(
    `INSERT INTO luot_khach (dia_diem_id, thang, noi_dia, quoc_te, nguoi_nhap) VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE noi_dia = VALUES(noi_dia), quoc_te = VALUES(quoc_te), nguoi_nhap = VALUES(nguoi_nhap)`,
    [dd.id, d.thang, nd, qt, req.staff.id]);
  return null;
}
router.get('/luot-khach', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.dia_diem_id, d.ten, l.thang, l.noi_dia, l.quoc_te, s.username AS nguoi_nhap, l.updated_at
         FROM luot_khach l JOIN dia_diem d ON d.id = l.dia_diem_id LEFT JOIN staff s ON s.id = l.nguoi_nhap
        ORDER BY l.updated_at DESC LIMIT 60`);
    res.json(rows.map((r) => ({ diaDiemId: r.dia_diem_id, ten: r.ten, thang: r.thang, noiDia: r.noi_dia, quocTe: r.quoc_te, nguoiNhap: r.nguoi_nhap, luc: r.updated_at })));
  } catch (e) { next(e); }
});
router.put('/luot-khach', async (req, res, next) => {
  try {
    const loi = await luuKhach(req, req.body || {}); if (loi) return res.status(400).json({ error: loi });
    await ghiNhatKy(pool, req, { hanhDong: 'nhap_luot_khach', loaiDoiTuong: 'dia_diem', doiTuongId: req.body.diaDiemId, chiTiet: { thang: req.body.thang } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post('/luot-khach/hang-loat', async (req, res, next) => {
  try {
    const ds = Array.isArray(req.body?.dong) ? req.body.dong.slice(0, 500) : [];
    let ok = 0; const loi = [];
    for (const [i, d] of ds.entries()) { const l = await luuKhach(req, d); if (l) loi.push(`Dòng ${i + 1}: ${l}`); else ok++; }
    if (ok) await ghiNhatKy(pool, req, { hanhDong: 'nhap_luot_khach_hang_loat', chiTiet: { soDong: ok } });
    res.json({ ok, loi });
  } catch (e) { next(e); }
});

/* ------------------------------------------------------------ ĐÁNH GIÁ */
router.get('/danh-gia', CHI_HUY, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.id, d.ten, g.sao, g.nhan_xet, g.ten_hien_thi, g.bi_an, g.updated_at
         FROM danh_gia g JOIN dia_diem d ON d.id = g.dia_diem_id ORDER BY g.updated_at DESC LIMIT 100`);
    res.json(rows.map((r) => ({ id: r.id, diaDiem: r.ten, sao: r.sao, nhanXet: r.nhan_xet, ten: r.ten_hien_thi, biAn: !!r.bi_an, luc: r.updated_at })));
  } catch (e) { next(e); }
});
/* Ẩn chứ không xoá — đánh giá bị ẩn vẫn còn để đối chiếu nếu có khiếu nại. */
router.patch('/danh-gia/:id/an', CHI_HUY, async (req, res, next) => {
  try {
    const an = !!req.body?.an;
    await pool.query('UPDATE danh_gia SET bi_an = ? WHERE id = ?', [an, Number(req.params.id)]);
    await ghiNhatKy(pool, req, { hanhDong: an ? 'an_danh_gia' : 'hien_danh_gia', loaiDoiTuong: 'danh_gia', doiTuongId: req.params.id });
    xoaDemCongKhai(); res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ------------------------------------------------------------ CÁN BỘ */
router.get('/can-bo', authorize('admin'), async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name, username, role, is_active, failed_attempts, locked_until, last_login FROM staff ORDER BY id');
    res.json(rows.map((r) => ({ id: r.id, hoTen: r.full_name, username: r.username, vaiTro: r.role, hoatDong: !!r.is_active,
      soLanSai: Number(r.failed_attempts || 0), tamKhoaDen: r.locked_until, dangNhapCuoi: r.last_login })));
  } catch (e) { next(e); }
});
router.patch('/can-bo/:id', authorize('admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === Number(req.staff.id)) return res.status(400).json({ error: 'Không tự khoá tài khoản của chính mình.' });
    if (req.body?.goTamKhoa) {
      await pool.query('UPDATE staff SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [id]);
      await ghiNhatKy(pool, req, { hanhDong: 'go_tam_khoa', loaiDoiTuong: 'staff', doiTuongId: id });
    } else if (typeof req.body?.hoatDong === 'boolean') {
      await pool.query('UPDATE staff SET is_active = ? WHERE id = ?', [req.body.hoatDong, id]);
      /* Khoá là có hiệu lực ngay: thu hồi phiên và xoá bộ nhớ đệm trạng thái. */
      if (!req.body.hoatDong) await pool.query('DELETE FROM refresh_tokens WHERE staff_id = ?', [id]);
      xoaDemTrangThai(id);
      await ghiNhatKy(pool, req, { hanhDong: req.body.hoatDong ? 'mo_khoa_tai_khoan' : 'khoa_tai_khoan', loaiDoiTuong: 'staff', doiTuongId: id });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ------------------------------------------------------------ NHẬT KÝ & XUẤT */
router.get('/nhat-ky', CHI_HUY, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.created_at, l.action, l.target_id, l.details, l.ip_address, s.username
         FROM staff_activity_logs l LEFT JOIN staff s ON s.id = l.staff_id ORDER BY l.id DESC LIMIT 200`);
    res.json(rows.map((r) => ({ luc: r.created_at, hanhDong: r.action, doiTuong: r.target_id, chiTiet: r.details, ip: r.ip_address, canBo: r.username })));
  } catch (e) { next(e); }
});
router.get('/xuat', CHI_HUY, async (req, res, next) => {
  try {
    const [dd] = await pool.query('SELECT * FROM dia_diem');
    const [lk] = await pool.query('SELECT dia_diem_id, thang, noi_dia, quoc_te FROM luot_khach');
    /* Không xuất mã thiết bị và IP băm — chỉ nội dung đánh giá. */
    const [dg] = await pool.query('SELECT dia_diem_id, sao, canh_quan, dich_vu, ve_sinh, gia_ca, di_cung, thoi_diem, nhan_xet, ten_hien_thi, bi_an, updated_at FROM danh_gia');
    await ghiNhatKy(pool, req, { hanhDong: 'xuat_du_lieu' });
    res.setHeader('Content-Disposition', 'attachment; filename="du-lieu-du-lich-dong-nai.json"');
    res.json({ xuatLuc: new Date().toISOString(), diaDiem: dd, luotKhach: lk, danhGia: dg });
  } catch (e) { next(e); }
});

export default router;
