/**
 * NỘI DUNG CHO NGƯỜI DÂN — /api/quan-tri/... (đã qua requireAuth)
 *
 * Cán bộ quản lý những gì người dân thấy: lộ trình gợi ý, ảnh địa điểm, tin
 * tức – cảnh báo – số điện thoại cần biết; và xử lý phản ánh người dân gửi.
 * Một quyền duy nhất như mọi phần khác; mọi thao tác ghi nhật ký.
 */
import express, { Router } from 'express';
import { pool } from '../db.js';
import { ghiNhatKy } from '../lib/helpers.js';
import { sanitizeText } from '../lib/security.js';
import { docNgay } from '../lib/phu-luc.js';
import { xoaDemCongKhai } from './cong-khai.js';

const router = Router();
const ngay = (v) => { const r = docNgay(v); return r.loi ? undefined : r.gt; };

/* ================================================================ LỘ TRÌNH */
router.get('/lo-trinh', async (_req, res, next) => {
  try {
    const [lt] = await pool.query('SELECT * FROM lich_trinh ORDER BY thu_tu, id');
    const [diem] = await pool.query('SELECT * FROM lich_trinh_diem ORDER BY lich_trinh_id, thu_tu');
    res.json(lt.map((t) => ({ id: t.id, ten: t.ten, tenEn: t.ten_en, thoiGian: t.thoi_gian, phuongTien: t.phuong_tien ?? null, phuongTienEn: t.phuong_tien_en ?? null, moTa: t.mo_ta, moTaEn: t.mo_ta_en, hien: !!t.hien, thuTu: t.thu_tu,
      diem: diem.filter((d) => d.lich_trinh_id === t.id).map((d) => ({ id: d.dia_diem_id, ngay: d.ngay, ghiChu: d.ghi_chu })) })));
  } catch (e) { next(e); }
});

async function docLoTrinh(b) {
  const ten = sanitizeText(String(b.ten || ''), 120);
  if (!ten) return { loi: 'Thiếu tên lộ trình.' };
  const diem = Array.isArray(b.diem) ? b.diem.slice(0, 20) : [];
  if (diem.length < 2) return { loi: 'Lộ trình cần ít nhất 2 điểm đến.' };
  const [co] = await pool.query('SELECT id FROM dia_diem WHERE id IN (?)', [diem.map((d) => String(d.id))]);
  const thieu = diem.find((d) => !co.some((c) => c.id === String(d.id)));
  if (thieu) return { loi: `Không có địa điểm mã "${thieu.id}".` };
  return { du: { ten, ten_en: sanitizeText(String(b.tenEn || ''), 120) || null, thoi_gian: sanitizeText(String(b.thoiGian || ''), 40) || null,
    phuong_tien: sanitizeText(String(b.phuongTien || ''), 60) || null, phuong_tien_en: sanitizeText(String(b.phuongTienEn || ''), 60) || null,
    mo_ta: sanitizeText(String(b.moTa || ''), 600) || null, mo_ta_en: sanitizeText(String(b.moTaEn || ''), 600) || null,
    hien: b.hien !== false, thu_tu: Number.isInteger(Number(b.thuTu)) ? Number(b.thuTu) : 0 },
  diem: diem.map((d, i) => [i + 1, String(d.id), Math.min(Math.max(Math.floor(Number(d.ngay)) || 1, 1), 30), sanitizeText(String(d.ghiChu || ''), 300) || null]) };
}
async function luuLoTrinh(req, res, id) {
  const { loi, du, diem } = await docLoTrinh(req.body || {});
  if (loi) return res.status(400).json({ error: loi });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (id) {
      const [kq] = await conn.query('UPDATE lich_trinh SET ? WHERE id = ?', [du, id]);
      if (!kq.affectedRows) { await conn.rollback(); return res.status(404).json({ error: 'Không tìm thấy lộ trình.' }); }
      await conn.query('DELETE FROM lich_trinh_diem WHERE lich_trinh_id = ?', [id]);
    } else id = (await conn.query('INSERT INTO lich_trinh SET ?', [du]))[0].insertId;
    await conn.query('INSERT INTO lich_trinh_diem (thu_tu, dia_diem_id, ngay, ghi_chu, lich_trinh_id) VALUES ?', [diem.map((d) => [...d, id])]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await ghiNhatKy(pool, req, { hanhDong: req.params.id ? 'sua_lo_trinh' : 'them_lo_trinh', loaiDoiTuong: 'lich_trinh', doiTuongId: id, chiTiet: { ten: du.ten } });
  res.status(req.params.id ? 200 : 201).json({ id });
}
router.post('/lo-trinh', (req, res, next) => luuLoTrinh(req, res, null).catch(next));
router.put('/lo-trinh/:id', (req, res, next) => luuLoTrinh(req, res, Number(req.params.id) || -1).catch(next));
router.delete('/lo-trinh/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM lich_trinh WHERE id = ?', [Number(req.params.id) || 0]);
    await ghiNhatKy(pool, req, { hanhDong: 'xoa_lo_trinh', loaiDoiTuong: 'lich_trinh', doiTuongId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ================================================================ ẢNH ĐỊA ĐIỂM */
const TOI_DA_ANH = 20;
const nhanAnh = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '1500kb' });
/* Nhận diện ảnh bằng mấy byte đầu tệp, không tin phần đuôi hay Content-Type người gửi khai. */
function kieuAnh(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
export const _kieuAnh = kieuAnh;   // cho bộ kiểm thử

router.get('/dia-diem/:id/anh', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, rong, cao, chu_thich, tieu_diem_x, tieu_diem_y, LENGTH(du_lieu) AS co FROM anh_dia_diem WHERE dia_diem_id = ? ORDER BY thu_tu, id', [String(req.params.id)]);
    res.json(rows.map((r) => ({ id: r.id, rong: r.rong, cao: r.cao, chuThich: r.chu_thich, tieuDiemX: r.tieu_diem_x ?? 50, tieuDiemY: r.tieu_diem_y ?? 50, kichThuoc: Number(r.co) })));
  } catch (e) { next(e); }
});
router.post('/dia-diem/:id/anh', nhanAnh, async (req, res, next) => {
  try {
    const kieu = kieuAnh(req.body);
    if (!kieu) return res.status(400).json({ error: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.' });
    const [[dd]] = await pool.query('SELECT id FROM dia_diem WHERE id = ?', [String(req.params.id)]);
    if (!dd) return res.status(404).json({ error: 'Không tìm thấy địa điểm.' });
    const [[{ so }]] = await pool.query('SELECT COUNT(*) AS so FROM anh_dia_diem WHERE dia_diem_id = ?', [dd.id]);
    if (Number(so) >= TOI_DA_ANH) return res.status(409).json({ error: `Mỗi địa điểm tối đa ${TOI_DA_ANH} ảnh. Xoá bớt ảnh cũ trước.` });
    const kichCo = (v) => { const n = Math.floor(Number(v)); return n > 0 && n < 10000 ? n : null; };
    const [kq] = await pool.query('INSERT INTO anh_dia_diem SET ?', [{ dia_diem_id: dd.id, du_lieu: req.body, kieu, rong: kichCo(req.query.rong), cao: kichCo(req.query.cao),
      chu_thich: sanitizeText(String(req.query.chuThich || ''), 200) || null, thu_tu: Number(so) + 1, nguoi_tai: req.staff.id }]);
    await ghiNhatKy(pool, req, { hanhDong: 'them_anh', loaiDoiTuong: 'dia_diem', doiTuongId: dd.id, chiTiet: { anh: kq.insertId, kb: Math.round(req.body.length / 1024) } });
    xoaDemCongKhai(); res.status(201).json({ id: kq.insertId });
  } catch (e) {
    if (e.type === 'entity.too.large') return res.status(413).json({ error: 'Ảnh lớn hơn 1,5 MB. Trang tự thu nhỏ ảnh trước khi gửi — thử lại hoặc chọn ảnh khác.' });
    next(e);
  }
});
router.patch('/anh/:id', async (req, res, next) => {
  try {
    const doi = {};
    if (req.body?.chuThich !== undefined) doi.chu_thich = sanitizeText(String(req.body.chuThich), 200) || null;
    if (Number.isInteger(req.body?.thuTu)) doi.thu_tu = req.body.thuTu;
    const phanTram = (v) => (Number.isInteger(v) && v >= 0 && v <= 100 ? v : undefined);
    if (phanTram(req.body?.tieuDiemX) !== undefined) doi.tieu_diem_x = req.body.tieuDiemX;
    if (phanTram(req.body?.tieuDiemY) !== undefined) doi.tieu_diem_y = req.body.tieuDiemY;
    if (!Object.keys(doi).length) return res.status(400).json({ error: 'Không có gì để đổi.' });
    await pool.query('UPDATE anh_dia_diem SET ? WHERE id = ?', [doi, Number(req.params.id) || 0]);
    xoaDemCongKhai(); res.json({ ok: true });
  } catch (e) { next(e); }
});
/* Ảnh gốc cho cán bộ chỉnh — đọc được cả ảnh của điểm đang ẩn (đường công khai thì không). */
router.get('/anh/:id/tep', async (req, res, next) => {
  try {
    const [[a]] = await pool.query('SELECT du_lieu, kieu FROM anh_dia_diem WHERE id = ?', [Number(req.params.id) || 0]);
    if (!a) return res.status(404).json({ error: 'Không tìm thấy ảnh.' });
    res.setHeader('Content-Type', a.kieu); res.setHeader('Cache-Control', 'no-store');
    res.send(a.du_lieu);
  } catch (e) { next(e); }
});
/* Thay nội dung ảnh (sau khi xoay, cắt trên trình duyệt). Ảnh công khai được trình duyệt
   nhớ đệm VĨNH VIỄN theo mã, nên không ghi đè: tạo bản ghi mới (mã mới) giữ thứ tự, chú
   thích, điểm lấy nét, rồi xoá bản cũ — người xem luôn thấy ảnh mới. */
router.put('/anh/:id/tep', nhanAnh, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const kieu = kieuAnh(req.body);
    if (!kieu) return res.status(400).json({ error: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.' });
    const [[cu]] = await conn.query('SELECT id, dia_diem_id, chu_thich, thu_tu, tieu_diem_x, tieu_diem_y FROM anh_dia_diem WHERE id = ?', [Number(req.params.id) || 0]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy ảnh.' });
    const kichCo = (v) => { const n = Math.floor(Number(v)); return n > 0 && n < 10000 ? n : null; };
    await conn.beginTransaction();
    const [kq] = await conn.query('INSERT INTO anh_dia_diem SET ?', [{ dia_diem_id: cu.dia_diem_id, du_lieu: req.body, kieu, rong: kichCo(req.query.rong), cao: kichCo(req.query.cao),
      chu_thich: cu.chu_thich, thu_tu: cu.thu_tu, tieu_diem_x: cu.tieu_diem_x ?? 50, tieu_diem_y: cu.tieu_diem_y ?? 50, nguoi_tai: req.staff.id }]);
    await conn.query('DELETE FROM anh_dia_diem WHERE id = ?', [cu.id]);
    await conn.commit();
    await ghiNhatKy(pool, req, { hanhDong: 'sua_anh', loaiDoiTuong: 'dia_diem', doiTuongId: cu.dia_diem_id, chiTiet: { cu: cu.id, moi: kq.insertId } });
    xoaDemCongKhai(); res.json({ id: kq.insertId });
  } catch (e) {
    await conn.rollback().catch(() => {});
    if (e.type === 'entity.too.large') return res.status(413).json({ error: 'Ảnh lớn hơn 1,5 MB.' });
    next(e);
  } finally { conn.release(); }
});
router.delete('/anh/:id', async (req, res, next) => {
  try {
    const [[a]] = await pool.query('SELECT dia_diem_id FROM anh_dia_diem WHERE id = ?', [Number(req.params.id) || 0]);
    if (!a) return res.status(404).json({ error: 'Không tìm thấy ảnh.' });
    await pool.query('DELETE FROM anh_dia_diem WHERE id = ?', [Number(req.params.id)]);
    await ghiNhatKy(pool, req, { hanhDong: 'xoa_anh', loaiDoiTuong: 'dia_diem', doiTuongId: a.dia_diem_id });
    xoaDemCongKhai(); res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ================================================================ TIN TỨC */
const LOAI_TIN = ['canh-bao', 'su-kien', 'thong-bao', 'lien-he'];
router.get('/tin-tuc', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tin_tuc ORDER BY FIELD(loai, \'canh-bao\', \'su-kien\', \'thong-bao\', \'lien-he\'), thu_tu, id DESC');
    res.json(rows.map((r) => ({ id: r.id, loai: r.loai, tieuDe: r.tieu_de, tieuDeEn: r.tieu_de_en, noiDung: r.noi_dung, noiDungEn: r.noi_dung_en,
      tuNgay: r.tu_ngay, denNgay: r.den_ngay, diaDiemId: r.dia_diem_id, hien: !!r.hien, thuTu: r.thu_tu })));
  } catch (e) { next(e); }
});
function docTin(b) {
  const tieuDe = sanitizeText(String(b.tieuDe || ''), 200);
  if (!LOAI_TIN.includes(b.loai)) return { loi: 'Chọn loại tin.' };
  if (!tieuDe) return { loi: 'Thiếu tiêu đề.' };
  const tu = ngay(b.tuNgay), den = ngay(b.denNgay);
  if (tu === undefined || den === undefined) return { loi: 'Ngày không hợp lệ.' };
  if (tu && den && den < tu) return { loi: 'Ngày kết thúc phải sau ngày bắt đầu.' };
  return { du: { loai: b.loai, tieu_de: tieuDe, tieu_de_en: sanitizeText(String(b.tieuDeEn || ''), 200) || null,
    noi_dung: sanitizeText(String(b.noiDung || ''), 3000) || null, noi_dung_en: sanitizeText(String(b.noiDungEn || ''), 3000) || null,
    tu_ngay: tu, den_ngay: den, dia_diem_id: b.diaDiemId ? String(b.diaDiemId) : null, hien: b.hien !== false,
    thu_tu: Number.isInteger(Number(b.thuTu)) ? Number(b.thuTu) : 0 } };
}
router.post('/tin-tuc', async (req, res, next) => {
  try {
    const { loi, du } = docTin(req.body || {}); if (loi) return res.status(400).json({ error: loi });
    const [kq] = await pool.query('INSERT INTO tin_tuc SET ?', [{ ...du, nguoi_tao: req.staff.id }]);
    await ghiNhatKy(pool, req, { hanhDong: 'them_tin', loaiDoiTuong: 'tin_tuc', doiTuongId: kq.insertId, chiTiet: { tieuDe: du.tieu_de } });
    res.status(201).json({ id: kq.insertId });
  } catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Địa điểm không hợp lệ.' }); next(e); }
});
router.put('/tin-tuc/:id', async (req, res, next) => {
  try {
    const { loi, du } = docTin(req.body || {}); if (loi) return res.status(400).json({ error: loi });
    const [kq] = await pool.query('UPDATE tin_tuc SET ? WHERE id = ?', [du, Number(req.params.id) || 0]);
    if (!kq.affectedRows) return res.status(404).json({ error: 'Không tìm thấy tin.' });
    await ghiNhatKy(pool, req, { hanhDong: 'sua_tin', loaiDoiTuong: 'tin_tuc', doiTuongId: req.params.id, chiTiet: { tieuDe: du.tieu_de } });
    res.json({ ok: true });
  } catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Địa điểm không hợp lệ.' }); next(e); }
});
router.delete('/tin-tuc/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tin_tuc WHERE id = ?', [Number(req.params.id) || 0]);
    await ghiNhatKy(pool, req, { hanhDong: 'xoa_tin', loaiDoiTuong: 'tin_tuc', doiTuongId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ================================================================ PHẢN ÁNH */
const TRANG_THAI_PA = ['moi', 'dang-xu-ly', 'da-xu-ly', 'khong-xu-ly'];
router.get('/phan-anh', async (req, res, next) => {
  try {
    const dk = [], ts = [];
    if (TRANG_THAI_PA.includes(req.query.trangThai)) { dk.push('p.trang_thai = ?'); ts.push(req.query.trangThai); }
    if (Number(req.query.xa)) { dk.push('p.xa_phuong_id = ?'); ts.push(Number(req.query.xa)); }
    const [rows] = await pool.query(
      `SELECT p.*, d.ten AS ten_dia_diem, s.full_name AS ten_xu_ly FROM phan_anh p LEFT JOIN dia_diem d ON d.id = p.dia_diem_id
         LEFT JOIN staff s ON s.id = p.nguoi_xu_ly ${dk.length ? 'WHERE ' + dk.join(' AND ') : ''}
        ORDER BY p.trang_thai = 'moi' DESC, p.created_at DESC LIMIT 300`, ts);
    res.json(rows.map((r) => ({ id: r.id, ma: r.ma_tra_cuu, loai: r.loai, diaDiem: r.ten_dia_diem, diaDiemId: r.dia_diem_id, xaPhuongId: r.xa_phuong_id,
      noiDung: r.noi_dung, lienHe: r.lien_he, trangThai: r.trang_thai, phanHoi: r.phan_hoi, nguoiXuLy: r.ten_xu_ly, xuLyLuc: r.xu_ly_luc, guiLuc: r.created_at })));
  } catch (e) { next(e); }
});
router.patch('/phan-anh/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!TRANG_THAI_PA.includes(b.trangThai)) return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    const phanHoi = sanitizeText(String(b.phanHoi || ''), 2000) || null;
    if (['da-xu-ly', 'khong-xu-ly'].includes(b.trangThai) && !phanHoi) {
      return res.status(400).json({ error: 'Ghi kết quả xử lý trước khi đóng phản ánh (ghi chú nội bộ, người gửi không xem được).' });
    }
    const xa = Number(b.xaPhuongId) > 0 ? Number(b.xaPhuongId) : null;
    const [kq] = await pool.query(
      'UPDATE phan_anh SET trang_thai = ?, phan_hoi = ?, xa_phuong_id = COALESCE(?, xa_phuong_id), nguoi_xu_ly = ?, xu_ly_luc = NOW() WHERE id = ?',
      [b.trangThai, phanHoi, xa, req.staff.id, Number(req.params.id) || 0]);
    if (!kq.affectedRows) return res.status(404).json({ error: 'Không tìm thấy phản ánh.' });
    await ghiNhatKy(pool, req, { hanhDong: 'xu_ly_phan_anh', loaiDoiTuong: 'phan_anh', doiTuongId: req.params.id, chiTiet: { trangThai: b.trangThai } });
    res.json({ ok: true });
  } catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Xã/phường không hợp lệ.' }); next(e); }
});

export default router;
