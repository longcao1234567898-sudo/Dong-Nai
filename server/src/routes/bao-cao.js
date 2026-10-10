/**
 * PHỤ LỤC THỐNG KÊ — đường dẫn /api/quan-tri/bao-cao/...
 *
 * MỘT QUYỀN DUY NHẤT: cán bộ nào đã đăng nhập cũng nhập, sửa, chốt được số
 * liệu của mọi xã/phường, quản lý danh sách xã/phường và kỳ báo cáo. Bù lại,
 * mọi thay đổi đều ghi LỊCH SỬ (giá trị cũ, giá trị mới, ai, lúc nào) và
 * NHẬT KÝ, xoá chỉ là đánh dấu nên khôi phục được.
 *
 * Hai chốt chặn để số liệu đã báo cáo không bị sửa lén:
 *   · Kỳ đã KHOÁ: không ai sửa được số liệu kỳ đó.
 *   · Xã đã CHỐT báo cáo kỳ: muốn sửa phải "mở lại" và ghi lý do.
 * Hai chốt này chỉ áp dụng cho bảng theo kỳ. Danh mục sống (dự án, resort)
 * thì sửa lúc nào cũng được — dự án đổi tình trạng là chuyện thường.
 */
import express, { Router } from 'express';
import { pool } from '../db.js';
import { ghiNhatKy } from '../lib/helpers.js';
import { sanitizeText } from '../lib/security.js';
import { BANG, layBang, cauHinhGiaoDien, docDong, raDong, tenXa, tachTenXa, chuanHoa, hienGiaTri, docNgay, TRANG_THAI_DU_AN } from '../lib/phu-luc.js';
import { docTepExcel, taoTepMau, LoiNhap } from '../lib/excel-nhap.js';
import { dungBang, xuatExcel, xuatWord } from '../lib/xuat-phu-luc.js';

const router = Router();
const nhanTep = express.raw({ type: () => true, limit: '5mb' });
const raKy = (k) => ({ id: k.id, ten: k.ten, tuNgay: k.tu_ngay, denNgay: k.den_ngay, hanNop: k.han_nop, khoa: !!k.khoa });
const docJson = (v) => { if (v === null || v === undefined) return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return null; } };

async function layKy(id) {
  const [[k]] = await pool.query('SELECT * FROM ky_bao_cao WHERE id = ?', [Number(id) || 0]);
  return k || null;
}
async function layXa(id) {
  const [[x]] = await pool.query('SELECT * FROM xa_phuong WHERE id = ?', [Number(id) || 0]);
  return x || null;
}
async function layDsXa() {
  const [ds] = await pool.query('SELECT id, ten, loai, hien FROM xa_phuong ORDER BY loai = \'xa\', ten');
  return ds;
}

/** Kỳ đã khoá hoặc xã đã chốt -> trả [mã lỗi, câu báo]; sửa được -> null. */
async function chanSua(kyId, xaId) {
  const ky = await layKy(kyId);
  if (!ky) return [404, 'Không tìm thấy kỳ báo cáo.'];
  if (ky.khoa) return [409, `Kỳ "${ky.ten}" đã khoá, không sửa được số liệu. Mở khoá kỳ ở mục Báo cáo kỳ nếu thật cần sửa.`];
  const [[n]] = await pool.query('SELECT trang_thai FROM nop_bao_cao WHERE ky_id = ? AND xa_phuong_id = ?', [ky.id, xaId]);
  if (n?.trang_thai === 'da-chot') return [409, `Báo cáo kỳ "${ky.ten}" của xã/phường này đã chốt. Bấm "Mở lại" ở mục Báo cáo kỳ nếu cần sửa.`];
  return null;
}

async function ghiLichSu(conn, req, bang, id, { xa, ky = null, hanhDong, cu = null, moi = null }) {
  await conn.query(
    'INSERT INTO lich_su_sua (bang, ban_ghi_id, xa_phuong_id, ky_id, staff_id, hanh_dong, cu, moi) VALUES (?,?,?,?,?,?,?,?)',
    [bang.key, id, xa, ky, req.staff.id, hanhDong, cu ? JSON.stringify(cu) : null, moi ? JSON.stringify(moi) : null]);
}

/** Chỉ giữ các cột thật sự đổi — lịch sử đọc dễ, không đầy cột giống nhau. */
function khacNhau(bang, cuRow, moi) {
  const cu = raDong(bang, cuRow), a = {}, b = {};
  for (const t of bang.truong) {
    if (t.kieu === 'tinh' || !(t.k in moi)) continue;
    if (String(cu[t.k] ?? '') !== String(moi[t.k] ?? '')) { a[t.k] = cu[t.k]; b[t.k] = moi[t.k]; }
  }
  return Object.keys(b).length ? { cu: a, moi: b } : null;
}

const timBang = (req, res) => {
  const b = layBang(req.params.bang);
  if (!b) res.status(404).json({ error: 'Không có bảng này.' });
  return b;
};

/* =========================================================== CẤU HÌNH */
router.get('/cau-hinh', async (_req, res, next) => {
  try {
    const xa = await layDsXa();
    const [ky] = await pool.query('SELECT * FROM ky_bao_cao ORDER BY tu_ngay DESC, den_ngay DESC');
    res.json({ bang: BANG.map(cauHinhGiaoDien), xaPhuong: xa.map((x) => ({ id: x.id, ten: tenXa(x), tenRieng: x.ten, loai: x.loai, hien: !!x.hien })), ky: ky.map(raKy) });
  } catch (e) { next(e); }
});

/* =========================================================== XÃ/PHƯỜNG */
/* Thêm nhiều xã/phường một lần: dán danh sách, mỗi dòng một đơn vị. */
router.post('/xa-phuong', async (req, res, next) => {
  try {
    const dong = String(req.body?.danhSach || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 300);
    if (!dong.length) return res.status(400).json({ error: 'Dán danh sách, mỗi dòng một xã/phường, ví dụ "Phường Trấn Biên".' });
    let them = 0; const trung = [], loi = [];
    for (const d of dong) {
      const x = tachTenXa(d);
      if (!x) { loi.push(`"${d.slice(0, 60)}": cần ghi rõ "Xã", "Phường" hoặc "Đặc khu" ở đầu.`); continue; }
      const [kq] = await pool.query('INSERT IGNORE INTO xa_phuong (ten, loai) VALUES (?,?)', [x.ten, x.loai]);
      if (kq.affectedRows) them++; else trung.push(tenXa(x));
    }
    if (them) await ghiNhatKy(pool, req, { hanhDong: 'them_xa_phuong', chiTiet: { soLuong: them } });
    res.json({ them, trung, loi });
  } catch (e) { next(e); }
});
router.patch('/xa-phuong/:id', async (req, res, next) => {
  try {
    const x = await layXa(req.params.id);
    if (!x) return res.status(404).json({ error: 'Không tìm thấy xã/phường.' });
    const b = req.body || {}, doi = {};
    if (b.ten !== undefined) {
      const t = tachTenXa(b.ten);
      if (!t) return res.status(400).json({ error: 'Tên cần ghi đủ, ví dụ "Phường Trấn Biên".' });
      Object.assign(doi, t);
    }
    if (typeof b.hien === 'boolean') doi.hien = b.hien;
    if (!Object.keys(doi).length) return res.status(400).json({ error: 'Không có gì để đổi.' });
    try { await pool.query('UPDATE xa_phuong SET ? WHERE id = ?', [doi, x.id]); }
    catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Đã có xã/phường trùng tên.' }); throw e; }
    await ghiNhatKy(pool, req, { hanhDong: 'sua_xa_phuong', loaiDoiTuong: 'xa_phuong', doiTuongId: x.id, chiTiet: { cu: tenXa(x), ...doi } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* =========================================================== KỲ BÁO CÁO */
function docKy(b) {
  const ten = sanitizeText(String(b.ten || ''), 80);
  const tu = docNgay(b.tuNgay), den = docNgay(b.denNgay), han = docNgay(b.hanNop);
  const loi = !ten ? 'Thiếu tên kỳ, ví dụ "6 tháng cuối năm 2026".'
    : tu.loi || !tu.gt ? 'Từ ngày không hợp lệ.' : den.loi || !den.gt ? 'Đến ngày không hợp lệ.'
    : den.gt < tu.gt ? 'Đến ngày phải sau từ ngày.' : han.loi ? 'Hạn nộp không hợp lệ.' : null;
  return { loi, du: { ten, tu_ngay: tu.gt, den_ngay: den.gt, han_nop: han.gt } };
}
router.post('/ky', async (req, res, next) => {
  try {
    const { loi, du } = docKy(req.body || {});
    if (loi) return res.status(400).json({ error: loi });
    try {
      const [kq] = await pool.query('INSERT INTO ky_bao_cao SET ?', [du]);
      await ghiNhatKy(pool, req, { hanhDong: 'them_ky', loaiDoiTuong: 'ky_bao_cao', doiTuongId: kq.insertId, chiTiet: { ten: du.ten } });
      res.status(201).json({ id: kq.insertId });
    } catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Đã có kỳ báo cáo cùng khoảng thời gian.' }); throw e; }
  } catch (e) { next(e); }
});
router.patch('/ky/:id', async (req, res, next) => {
  try {
    const ky = await layKy(req.params.id);
    if (!ky) return res.status(404).json({ error: 'Không tìm thấy kỳ báo cáo.' });
    const b = req.body || {};
    if (typeof b.khoa === 'boolean') {
      await pool.query('UPDATE ky_bao_cao SET khoa = ? WHERE id = ?', [b.khoa, ky.id]);
      await ghiNhatKy(pool, req, { hanhDong: b.khoa ? 'khoa_ky' : 'mo_khoa_ky', loaiDoiTuong: 'ky_bao_cao', doiTuongId: ky.id, chiTiet: { ten: ky.ten } });
      return res.json({ ok: true });
    }
    const { loi, du } = docKy({ ten: ky.ten, tuNgay: ky.tu_ngay, denNgay: ky.den_ngay, hanNop: ky.han_nop, ...b });
    if (loi) return res.status(400).json({ error: loi });
    try { await pool.query('UPDATE ky_bao_cao SET ? WHERE id = ?', [du, ky.id]); }
    catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Đã có kỳ báo cáo cùng khoảng thời gian.' }); throw e; }
    await ghiNhatKy(pool, req, { hanhDong: 'sua_ky', loaiDoiTuong: 'ky_bao_cao', doiTuongId: ky.id, chiTiet: du });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* =========================================================== TIẾN ĐỘ, CHỐT */
async function demTheoXa(kyId) {
  const dem = {};
  for (const b of BANG.filter((x) => !x.dan)) {
    const [rows] = b.theoKy
      ? await pool.query(`SELECT xa_phuong_id AS xa, COUNT(*) AS so FROM ${b.bangDb} WHERE ky_id = ? AND xoa_luc IS NULL GROUP BY xa_phuong_id`, [kyId])
      : await pool.query(`SELECT xa_phuong_id AS xa, COUNT(*) AS so FROM ${b.bangDb} WHERE xoa_luc IS NULL GROUP BY xa_phuong_id`);
    for (const r of rows) (dem[r.xa] ||= {})[b.key] = Number(r.so);
  }
  return dem;
}

router.get('/nop', async (req, res, next) => {
  try {
    const ky = await layKy(req.query.ky);
    if (!ky) return res.status(404).json({ error: 'Chọn kỳ báo cáo.' });
    const dsXa = (await layDsXa()).filter((x) => x.hien);
    const [nop] = await pool.query(
      `SELECT n.*, s.full_name AS ten_nguoi_chot FROM nop_bao_cao n LEFT JOIN staff s ON s.id = n.nguoi_chot WHERE n.ky_id = ?`, [ky.id]);
    const [kps] = await pool.query('SELECT xa_phuong_id, bang FROM khong_phat_sinh WHERE ky_id = ?', [ky.id]);
    const dem = await demTheoXa(ky.id);
    res.json({ ky: raKy(ky), ds: dsXa.map((x) => {
      const n = nop.find((r) => r.xa_phuong_id === x.id);
      return { xaPhuongId: x.id, ten: tenXa(x), trangThai: n?.trang_thai || 'dang-nhap', chotLuc: n?.chot_luc || null, nguoiChot: n?.ten_nguoi_chot || null,
        lyDoMoLai: n?.ly_do_mo_lai || null, soDong: dem[x.id] || {}, khongPhatSinh: kps.filter((k) => k.xa_phuong_id === x.id).map((k) => k.bang) };
    }) });
  } catch (e) { next(e); }
});

router.post('/nop/:ky/:xa/chot', async (req, res, next) => {
  try {
    const ky = await layKy(req.params.ky), xa = await layXa(req.params.xa);
    if (!ky || !xa) return res.status(404).json({ error: 'Không tìm thấy kỳ hoặc xã/phường.' });
    const chan = await chanSua(ky.id, xa.id);
    if (chan) return res.status(chan[0]).json({ error: chan[1] });
    /* Chỉ chốt được khi mọi bảng theo kỳ đã có số liệu hoặc đã xác nhận "không phát sinh". */
    const dem = (await demTheoXa(ky.id))[xa.id] || {};
    const [kps] = await pool.query('SELECT bang FROM khong_phat_sinh WHERE ky_id = ? AND xa_phuong_id = ?', [ky.id, xa.id]);
    const thieu = BANG.filter((b) => b.theoKy && !b.dan && !dem[b.key] && !kps.some((k) => k.bang === b.key));
    if (thieu.length) return res.status(400).json({ error: `Chưa chốt được: ${thieu.map((b) => `bảng ${b.so} (${b.ten.toLowerCase()})`).join(', ')} chưa có số liệu. Nhập số liệu hoặc đánh dấu "không phát sinh".` });
    await pool.query(
      `INSERT INTO nop_bao_cao (ky_id, xa_phuong_id, trang_thai, nguoi_chot, chot_luc) VALUES (?,?,'da-chot',?,NOW())
       ON DUPLICATE KEY UPDATE trang_thai = 'da-chot', nguoi_chot = VALUES(nguoi_chot), chot_luc = NOW()`, [ky.id, xa.id, req.staff.id]);
    await ghiNhatKy(pool, req, { hanhDong: 'chot_bao_cao', loaiDoiTuong: 'xa_phuong', doiTuongId: xa.id, chiTiet: { ky: ky.ten, xa: tenXa(xa) } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/nop/:ky/:xa/mo-lai', async (req, res, next) => {
  try {
    const ky = await layKy(req.params.ky), xa = await layXa(req.params.xa);
    if (!ky || !xa) return res.status(404).json({ error: 'Không tìm thấy kỳ hoặc xã/phường.' });
    if (ky.khoa) return res.status(409).json({ error: `Kỳ "${ky.ten}" đã khoá. Mở khoá kỳ trước.` });
    const lyDo = sanitizeText(String(req.body?.lyDo || ''), 500);
    if (lyDo.length < 5) return res.status(400).json({ error: 'Ghi lý do mở lại (ít nhất 5 ký tự) — lý do được lưu vào nhật ký.' });
    await pool.query(`UPDATE nop_bao_cao SET trang_thai = 'dang-nhap', ly_do_mo_lai = ? WHERE ky_id = ? AND xa_phuong_id = ?`, [lyDo, ky.id, xa.id]);
    await ghiNhatKy(pool, req, { hanhDong: 'mo_lai_bao_cao', loaiDoiTuong: 'xa_phuong', doiTuongId: xa.id, chiTiet: { ky: ky.ten, xa: tenXa(xa), lyDo } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.put('/khong-phat-sinh', async (req, res, next) => {
  try {
    const b = req.body || {}, bang = layBang(b.bang);
    if (!bang || bang.dan) return res.status(404).json({ error: 'Không có bảng này.' });
    const xa = await layXa(b.xaPhuongId);
    if (!xa) return res.status(404).json({ error: 'Không tìm thấy xã/phường.' });
    const chan = await chanSua(b.kyId, xa.id);
    if (chan) return res.status(chan[0]).json({ error: chan[1] });
    if (b.co) {
      if (bang.theoKy) {
        const [[{ so }]] = await pool.query(`SELECT COUNT(*) AS so FROM ${bang.bangDb} WHERE ky_id = ? AND xa_phuong_id = ? AND xoa_luc IS NULL`, [b.kyId, xa.id]);
        if (Number(so)) return res.status(409).json({ error: `Kỳ này đã có ${so} dòng số liệu. Xoá các dòng đó trước khi đánh dấu không phát sinh.` });
      }
      await pool.query('INSERT IGNORE INTO khong_phat_sinh (ky_id, xa_phuong_id, bang, nguoi_danh_dau) VALUES (?,?,?,?)', [b.kyId, xa.id, bang.key, req.staff.id]);
    } else await pool.query('DELETE FROM khong_phat_sinh WHERE ky_id = ? AND xa_phuong_id = ? AND bang = ?', [b.kyId, xa.id, bang.key]);
    await ghiNhatKy(pool, req, { hanhDong: b.co ? 'danh_dau_khong_phat_sinh' : 'bo_khong_phat_sinh', loaiDoiTuong: 'xa_phuong', doiTuongId: xa.id, chiTiet: { bang: bang.so, ky: Number(b.kyId) } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* =========================================================== DỮ LIỆU TỪNG BẢNG */
router.get('/bang/:bang', async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    if (bang.dan) return res.json(await bang.tinh(pool, req.query));
    const dk = [req.query.daXoa === '1' ? 't.xoa_luc IS NOT NULL' : 't.xoa_luc IS NULL'], ts = [];
    if (bang.theoKy) {
      if (!Number(req.query.ky)) return res.status(400).json({ error: 'Chọn kỳ báo cáo.' });
      dk.push('t.ky_id = ?'); ts.push(Number(req.query.ky));
    }
    if (Number(req.query.xa)) { dk.push('t.xa_phuong_id = ?'); ts.push(Number(req.query.xa)); }
    const [rows] = await pool.query(
      `SELECT t.*, s.username AS nguoi_sua_ten FROM ${bang.bangDb} t LEFT JOIN staff s ON s.id = t.nguoi_sua
        WHERE ${dk.join(' AND ')} ORDER BY t.xa_phuong_id, t.id LIMIT 3000`, ts);
    res.json(rows.map((r) => raDong(bang, r)));
  } catch (e) { next(e); }
});

async function layDong(bang, id) {
  const [[r]] = await pool.query(`SELECT * FROM ${bang.bangDb} WHERE id = ?`, [Number(id) || 0]);
  return r || null;
}

router.post('/bang/:bang', async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    if (bang.dan) return res.status(405).json({ error: 'Bảng này do máy tự tổng hợp, không nhập tay.' });
    const b = req.body || {};
    const xa = await layXa(b.xa_phuong_id);
    if (!xa) return res.status(400).json({ error: 'Chọn xã/phường.' });
    const { loi, du } = docDong(bang, b);
    if (loi) return res.status(400).json({ error: loi });
    let kyId = null;
    if (bang.theoKy) {
      kyId = Number(b.ky_id);
      const chan = await chanSua(kyId, xa.id);
      if (chan) return res.status(chan[0]).json({ error: chan[1] });
      await pool.query('DELETE FROM khong_phat_sinh WHERE ky_id = ? AND xa_phuong_id = ? AND bang = ?', [kyId, xa.id, bang.key]);
    }
    if (bang.motDongMoiXa) {
      const [[co]] = await pool.query(`SELECT id, xoa_luc FROM ${bang.bangDb} WHERE ky_id = ? AND xa_phuong_id = ?`, [kyId, xa.id]);
      if (co && !co.xoa_luc) return res.status(409).json({ error: `${tenXa(xa)} đã có số liệu kỳ này. Sửa dòng đã có thay vì thêm mới.` });
      if (co) {   // dòng đã xoá trước đây: dùng lại để không vướng khoá "mỗi xã một dòng mỗi kỳ"
        await pool.query(`UPDATE ${bang.bangDb} SET ?, xoa_luc = NULL, nguoi_sua = ? WHERE id = ?`, [du, req.staff.id, co.id]);
        await ghiLichSu(pool, req, bang, co.id, { xa: xa.id, ky: kyId, hanhDong: 'them', moi: du });
        return res.status(201).json({ id: co.id });
      }
    }
    const [kq] = await pool.query(`INSERT INTO ${bang.bangDb} SET ?`, [{ ...du, xa_phuong_id: xa.id, ...(bang.theoKy ? { ky_id: kyId } : {}), nguoi_sua: req.staff.id }]);
    await ghiLichSu(pool, req, bang, kq.insertId, { xa: xa.id, ky: kyId, hanhDong: 'them', moi: du });
    await ghiNhatKy(pool, req, { hanhDong: 'them_phu_luc', loaiDoiTuong: bang.key, doiTuongId: kq.insertId, chiTiet: { xa: tenXa(xa) } });
    res.status(201).json({ id: kq.insertId });
  } catch (e) { next(e); }
});

router.put('/bang/:bang/:id', async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    const r = !bang.dan && await layDong(bang, req.params.id);
    if (!r || r.xoa_luc) return res.status(404).json({ error: 'Không tìm thấy dòng này (có thể đã bị xoá).' });
    if (bang.theoKy) { const chan = await chanSua(r.ky_id, r.xa_phuong_id); if (chan) return res.status(chan[0]).json({ error: chan[1] }); }
    const { loi, du } = docDong(bang, req.body || {});
    if (loi) return res.status(400).json({ error: loi });
    /* Danh mục sống được chuyển sang xã khác (gán nhầm xã); bảng theo kỳ thì không. */
    let xaMoi = r.xa_phuong_id;
    if (!bang.theoKy && req.body?.xa_phuong_id && Number(req.body.xa_phuong_id) !== r.xa_phuong_id) {
      const xa = await layXa(req.body.xa_phuong_id);
      if (!xa) return res.status(400).json({ error: 'Xã/phường không hợp lệ.' });
      xaMoi = xa.id; du.xa_phuong_id = xa.id;
    }
    const doi = khacNhau(bang, r, du);
    if (!doi && xaMoi === r.xa_phuong_id) return res.json({ ok: true, khongDoi: true });
    await pool.query(`UPDATE ${bang.bangDb} SET ?, nguoi_sua = ? WHERE id = ?`, [du, req.staff.id, r.id]);
    await ghiLichSu(pool, req, bang, r.id, { xa: xaMoi, ky: r.ky_id ?? null, hanhDong: 'sua',
      cu: { ...(doi?.cu || {}), ...(xaMoi !== r.xa_phuong_id ? { xa_phuong_id: r.xa_phuong_id } : {}) },
      moi: { ...(doi?.moi || {}), ...(xaMoi !== r.xa_phuong_id ? { xa_phuong_id: xaMoi } : {}) } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/bang/:bang/:id', async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    const r = !bang.dan && await layDong(bang, req.params.id);
    if (!r || r.xoa_luc) return res.status(404).json({ error: 'Không tìm thấy dòng này.' });
    if (bang.theoKy) { const chan = await chanSua(r.ky_id, r.xa_phuong_id); if (chan) return res.status(chan[0]).json({ error: chan[1] }); }
    await pool.query(`UPDATE ${bang.bangDb} SET xoa_luc = NOW(), nguoi_sua = ? WHERE id = ?`, [req.staff.id, r.id]);
    await ghiLichSu(pool, req, bang, r.id, { xa: r.xa_phuong_id, ky: r.ky_id ?? null, hanhDong: 'xoa', cu: raDong(bang, r) });
    await ghiNhatKy(pool, req, { hanhDong: 'xoa_phu_luc', loaiDoiTuong: bang.key, doiTuongId: r.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/bang/:bang/:id/khoi-phuc', async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    const r = !bang.dan && await layDong(bang, req.params.id);
    if (!r || !r.xoa_luc) return res.status(404).json({ error: 'Dòng này không ở trạng thái đã xoá.' });
    if (bang.theoKy) { const chan = await chanSua(r.ky_id, r.xa_phuong_id); if (chan) return res.status(chan[0]).json({ error: chan[1] }); }
    await pool.query(`UPDATE ${bang.bangDb} SET xoa_luc = NULL, nguoi_sua = ? WHERE id = ?`, [req.staff.id, r.id]);
    await ghiLichSu(pool, req, bang, r.id, { xa: r.xa_phuong_id, ky: r.ky_id ?? null, hanhDong: 'khoi-phuc' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/bang/:bang/:id/lich-su', async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    const [rows] = await pool.query(
      `SELECT l.hanh_dong, l.cu, l.moi, l.created_at, s.username, s.full_name FROM lich_su_sua l LEFT JOIN staff s ON s.id = l.staff_id
        WHERE l.bang = ? AND l.ban_ghi_id = ? ORDER BY l.id DESC LIMIT 200`, [bang.key, Number(req.params.id) || 0]);
    res.json(rows.map((r) => ({ hanhDong: r.hanh_dong, cu: docJson(r.cu), moi: docJson(r.moi), luc: r.created_at, canBo: r.full_name || r.username || null })));
  } catch (e) { next(e); }
});

/* =========================================================== EXCEL: MẪU VÀ NHẬP */
router.get('/bang/:bang/mau', async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    if (bang.dan) return res.status(405).json({ error: 'Bảng này do máy tự tổng hợp, không có mẫu nhập.' });
    const buf = await taoTepMau(bang, await layDsXa(), await layKy(req.query.ky));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="mau-bang-${bang.so}-${bang.key}.xlsx"`);
    res.send(buf);
  } catch (e) { next(e); }
});

/** Tìm xã theo chữ trong tệp: "Phường Trấn Biên", "phuong tran bien", hoặc chỉ "Trấn Biên" nếu không trùng. */
function timXa(dsXa, chu) {
  const c = chuanHoa(chu);
  if (!c) return null;
  return dsXa.find((x) => chuanHoa(tenXa(x)) === c) || (() => { const ds = dsXa.filter((x) => chuanHoa(x.ten) === c); return ds.length === 1 ? ds[0] : null; })();
}

/*
 * POST /bang/:bang/nhap?ky=&xa=&thu=1   (thân yêu cầu là tệp .xlsx)
 *   thu=1  chỉ kiểm tra, trả về lỗi từng dòng và số dòng sẽ thêm/cập nhật
 *   không  lưu — TẤT CẢ hoặc KHÔNG dòng nào: còn một dòng lỗi là không lưu gì
 */
router.post('/bang/:bang/nhap', nhanTep, async (req, res, next) => {
  try {
    const bang = timBang(req, res); if (!bang) return;
    if (bang.dan) return res.status(405).json({ error: 'Bảng này do máy tự tổng hợp, không nhập được.' });
    const ky = bang.theoKy ? await layKy(req.query.ky) : null;
    if (bang.theoKy && !ky) return res.status(400).json({ error: 'Chọn kỳ báo cáo trước khi nhập tệp.' });
    const dsXa = await layDsXa();
    const xaMacDinh = Number(req.query.xa) ? dsXa.find((x) => x.id === Number(req.query.xa)) : null;

    let doc;
    try { doc = await docTepExcel(req.body, bang); } catch (e) { if (e instanceof LoiNhap) return res.status(400).json({ error: e.message }); throw e; }

    const loi = [], hopLe = [], chanXa = new Map();
    for (const d of doc.dong) {
      const xa = d.xa ? timXa(dsXa, d.xa) : xaMacDinh;
      if (!xa) { loi.push({ dong: d.so, loi: d.xa ? `Không có xã/phường "${String(d.xa).slice(0, 60)}" trong danh sách.` : 'Thiếu xã/phường (ghi ở cột Xã/phường, hoặc chọn xã/phường trên web).' }); continue; }
      const kq = docDong(bang, d.vao);
      if (kq.loi) { loi.push({ dong: d.so, loi: kq.loi }); continue; }
      if (bang.theoKy) {
        if (!chanXa.has(xa.id)) chanXa.set(xa.id, await chanSua(ky.id, xa.id));
        const chan = chanXa.get(xa.id);
        if (chan) { loi.push({ dong: d.so, loi: `${tenXa(xa)}: ${chan[1]}` }); continue; }
      }
      hopLe.push({ so: d.so, xa, du: kq.du });
    }
    /* Cùng một dòng xuất hiện hai lần trong tệp -> báo lỗi, không để dòng sau âm thầm đè dòng trước. */
    if (bang.motDongMoiXa || bang.khoaTrung) {
      const gap = new Map();
      for (const h of hopLe) {
        const khoa = bang.motDongMoiXa ? h.xa.id : `${h.xa.id}:${chuanHoa(h.du[bang.khoaTrung])}`;
        if (gap.has(khoa)) loi.push({ dong: h.so, loi: `Trùng với dòng ${gap.get(khoa)} (${bang.motDongMoiXa ? tenXa(h.xa) : `cùng tên, cùng ${tenXa(h.xa)}`}).` });
        else gap.set(khoa, h.so);
      }
    }

    /* Dòng nào sẽ cập nhật dòng đã có: cùng xã + cùng kỳ (bảng mỗi xã một dòng), hoặc cùng xã + cùng tên (danh mục). */
    const [coSan] = await pool.query(`SELECT * FROM ${bang.bangDb} WHERE xoa_luc IS NULL${bang.theoKy ? ' AND ky_id = ?' : ''}`, bang.theoKy ? [ky.id] : []);
    const khop = (h) => (bang.motDongMoiXa ? coSan.find((r) => r.xa_phuong_id === h.xa.id)
      : bang.khoaTrung ? coSan.find((r) => r.xa_phuong_id === h.xa.id && chuanHoa(r[bang.khoaTrung]) === chuanHoa(h.du[bang.khoaTrung])) : null);
    const trangThai = (h) => { const cu = khop(h); return !cu ? 'them' : khacNhau(bang, cu, h.du) ? 'cap-nhat' : 'khong-doi'; };
    const dem = (tt) => hopLe.filter((h) => trangThai(h) === tt).length;
    const ketQua = { soDong: doc.dong.length, them: dem('them'), capNhat: dem('cap-nhat'), khongDoi: dem('khong-doi'),
      loi: loi.sort((a, b) => a.dong - b.dong).slice(0, 200), cotBoQua: doc.cotBoQua };
    if (req.query.thu === '1') {
      return res.json({ ...ketQua, xemTruoc: hopLe.slice(0, 15).map((h) => ({ dong: h.so, xa: tenXa(h.xa), trangThai: trangThai(h), ...h.du })) });
    }
    if (loi.length) return res.status(400).json({ ...ketQua, error: `Còn ${loi.length} dòng lỗi — chưa lưu dòng nào. Sửa tệp rồi tải lại.` });
    if (!hopLe.length) return res.status(400).json({ ...ketQua, error: 'Tệp không có dòng số liệu nào.' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const h of hopLe) {
        const cu = khop(h);
        if (cu) {
          const doi = khacNhau(bang, cu, h.du);
          if (!doi) continue;
          await conn.query(`UPDATE ${bang.bangDb} SET ?, nguoi_sua = ? WHERE id = ?`, [h.du, req.staff.id, cu.id]);
          await ghiLichSu(conn, req, bang, cu.id, { xa: h.xa.id, ky: ky?.id ?? null, hanhDong: 'nhap-excel', ...doi });
        } else {
          let id;
          const [[daXoa]] = bang.motDongMoiXa ? await conn.query(`SELECT id FROM ${bang.bangDb} WHERE ky_id = ? AND xa_phuong_id = ?`, [ky.id, h.xa.id]) : [[null]];
          if (daXoa) { await conn.query(`UPDATE ${bang.bangDb} SET ?, xoa_luc = NULL, nguoi_sua = ? WHERE id = ?`, [h.du, req.staff.id, daXoa.id]); id = daXoa.id; }
          else {
            const [kq] = await conn.query(`INSERT INTO ${bang.bangDb} SET ?`, [{ ...h.du, xa_phuong_id: h.xa.id, ...(ky ? { ky_id: ky.id } : {}), nguoi_sua: req.staff.id }]);
            id = kq.insertId;
          }
          await ghiLichSu(conn, req, bang, id, { xa: h.xa.id, ky: ky?.id ?? null, hanhDong: 'nhap-excel', moi: h.du });
        }
        if (ky) await conn.query('DELETE FROM khong_phat_sinh WHERE ky_id = ? AND xa_phuong_id = ? AND bang = ?', [ky.id, h.xa.id, bang.key]);
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
    await ghiNhatKy(pool, req, { hanhDong: 'nhap_excel_phu_luc', loaiDoiTuong: bang.key, chiTiet: { them: ketQua.them, capNhat: ketQua.capNhat, ky: ky?.ten } });
    res.json({ ok: true, ...ketQua });
  } catch (e) {
    if (e.type === 'entity.too.large') return res.status(413).json({ error: 'Tệp lớn hơn 5 MB. Chia nhỏ tệp.' });
    next(e);
  }
});

/* =========================================================== XUẤT PHỤ LỤC */
/**
 * Gom số liệu và dựng các bảng xuất. Dùng chung cho tệp Excel và Word.
 * Bảng có trường ngày (vụ việc, vi phạm...) chỉ lấy trong khoảng [tu, den].
 */
export async function gomPhuLuc({ ky, kySoSanh, xaId, tu, den, dsKey }) {
  const dsXaTatCa = await layDsXa();
  const kyDs = [ky, kySoSanh].filter(Boolean);
  const [kpsRows] = await pool.query(`SELECT ky_id, xa_phuong_id, bang FROM khong_phat_sinh WHERE ky_id IN (${kyDs.map(() => '?').join(',')})`, kyDs.map((k) => k.id));
  const ketQua = [];
  for (const bang of BANG.filter((b) => !dsKey || dsKey.includes(b.key))) {
    let dong;
    if (bang.dan) dong = await bang.tinh(pool, { tu, den });
    else {
      const dk = ['xoa_luc IS NULL'], ts = [];
      if (bang.theoKy) { dk.push(`ky_id IN (${kyDs.map(() => '?').join(',')})`); ts.push(...kyDs.map((k) => k.id)); }
      if (bang.locNgay && tu) { dk.push(`(${bang.locNgay} IS NULL OR ${bang.locNgay} >= ?)`); ts.push(tu); }
      if (bang.locNgay && den) { dk.push(`(${bang.locNgay} IS NULL OR ${bang.locNgay} <= ?)`); ts.push(den); }
      if (bang.locNam && den) { dk.push(`(${bang.locNam} IS NULL OR ${bang.locNam} <= ?)`); ts.push(Number(String(den).slice(0, 4))); }
      const [rows] = await pool.query(`SELECT * FROM ${bang.bangDb} WHERE ${dk.join(' AND ')} ORDER BY xa_phuong_id, id`, ts);
      dong = rows.map((r) => raDong(bang, r));
    }
    const coSo = new Set(dong.map((r) => r.xa_phuong_id));
    const dsXa = dsXaTatCa.filter((x) => (xaId ? x.id === xaId : x.hien || coSo.has(x.id)));
    const kps = new Set(kpsRows.filter((k) => k.bang === bang.key).map((k) => `${k.ky_id}:${k.xa_phuong_id}`));
    const phuDe = bang.theoKy ? `Kỳ: ${kyDs.map((k) => k.ten).join(' và ')}`
      : bang.locNgay || bang.dan ? `Từ ${hienGiaTri({ kieu: 'ngay' }, tu)} đến ${hienGiaTri({ kieu: 'ngay' }, den)}` : `Tính đến ${hienGiaTri({ kieu: 'ngay' }, den)}`;
    ketQua.push(dungBang(bang, { dsXa, dong, kyDs: bang.theoKy ? kyDs : [ky], khongPhatSinh: kps, phuDe }));
  }
  return ketQua;
}

router.get('/xuat', async (req, res, next) => {
  try {
    const ky = await layKy(req.query.ky);
    if (!ky) return res.status(400).json({ error: 'Chọn kỳ báo cáo.' });
    const kySoSanh = Number(req.query.kySoSanh) && Number(req.query.kySoSanh) !== ky.id ? await layKy(req.query.kySoSanh) : null;
    const tu = docNgay(req.query.tu).gt || ky.tu_ngay, den = docNgay(req.query.den).gt || ky.den_ngay;
    const dsKey = req.query.bang ? String(req.query.bang).split(',').filter((k) => layBang(k)) : null;
    const xaId = Number(req.query.xa) || null;
    const dsBang = await gomPhuLuc({ ky, kySoSanh, xaId, tu, den, dsKey });
    const p = (n) => String(n).padStart(2, '0'), d = new Date();
    const meta = { kyTen: ky.ten + (kySoSanh ? ` (so sánh: ${kySoSanh.ten})` : ''), nguoiXuat: req.staff.name || req.staff.username,
      luc: `${p(d.getHours())}:${p(d.getMinutes())} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`, mucDo: 'TÀI LIỆU NỘI BỘ' };
    const word = req.query.dinhDang === 'docx';
    const buf = word ? await xuatWord(dsBang, meta) : await xuatExcel(dsBang, meta);
    await ghiNhatKy(pool, req, { hanhDong: 'xuat_phu_luc', loaiDoiTuong: 'ky_bao_cao', doiTuongId: ky.id,
      chiTiet: { dinhDang: word ? 'docx' : 'xlsx', bang: dsBang.map((b) => b.so), xa: xaId } });
    res.setHeader('Content-Type', word ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="phu-luc-thong-ke-ky-${ky.id}.${word ? 'docx' : 'xlsx'}"`);
    res.send(buf);
  } catch (e) { next(e); }
});

/* =========================================================== THỐNG KÊ CÁN BỘ */
router.get('/thong-ke', async (req, res, next) => {
  try {
    const ky = await layKy(req.query.ky);
    if (!ky) return res.status(400).json({ error: 'Chọn kỳ báo cáo.' });
    const ss = Number(req.query.kySoSanh) && Number(req.query.kySoSanh) !== ky.id ? await layKy(req.query.kySoSanh) : null;
    const dsXa = await layDsXa();
    const ten = (id) => tenXa(dsXa.find((x) => x.id === id)) || '?';

    const [khach] = await pool.query(`SELECT ky_id, xa_phuong_id, quoc_te, noi_dia FROM bc_khach WHERE xoa_luc IS NULL AND ky_id IN (?, ?)`, [ky.id, ss?.id ?? 0]);
    const xaCoKhach = [...new Set(khach.map((r) => r.xa_phuong_id))];
    const khachTheoXa = xaCoKhach.map((id) => {
      const a = khach.find((r) => r.xa_phuong_id === id && r.ky_id === ky.id), b = ss && khach.find((r) => r.xa_phuong_id === id && r.ky_id === ss.id);
      return { xa: ten(id), quocTe: a ? Number(a.quoc_te) : null, noiDia: a ? Number(a.noi_dia) : null,
        ssQuocTe: b ? Number(b.quoc_te) : null, ssNoiDia: b ? Number(b.noi_dia) : null };
    }).sort((a, b) => (Number(b.quocTe) + Number(b.noiDia)) - (Number(a.quocTe) + Number(a.noiDia)));
    const cong = (id, k) => khach.filter((r) => r.ky_id === id).reduce((s, r) => s + Number(r[k]), 0);

    const [duAnTT] = await pool.query(`SELECT trang_thai, COUNT(*) AS so, COALESCE(SUM(von_ty), 0) AS von FROM bc_du_an WHERE xoa_luc IS NULL GROUP BY trang_thai`);
    const [duAnQG] = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(quoc_gia), ''), 'Chưa ghi') AS qg, COUNT(*) AS so, COALESCE(SUM(von_ty), 0) AS von FROM bc_du_an WHERE xoa_luc IS NULL GROUP BY qg ORDER BY von DESC, so DESC LIMIT 12`);
    const [luuTru] = await pool.query(`SELECT hang_sao, COUNT(*) AS so FROM bc_luu_tru WHERE xoa_luc IS NULL GROUP BY hang_sao`);
    const nop = await pool.query(`SELECT trang_thai FROM nop_bao_cao n JOIN xa_phuong x ON x.id = n.xa_phuong_id WHERE n.ky_id = ? AND x.hien = 1`, [ky.id]);
    const soXa = dsXa.filter((x) => x.hien).length, daChot = nop[0].filter((r) => r.trang_thai === 'da-chot').length;

    const canhBao = [];
    const homNay = new Date().toISOString().slice(0, 10);
    if (ky.han_nop && ky.han_nop < homNay && daChot < soXa) canhBao.push(`Đã quá hạn nộp (${hienGiaTri({ kieu: 'ngay' }, ky.han_nop)}) mà còn ${soXa - daChot} xã/phường chưa chốt báo cáo.`);
    if (ss) {
      /* So sánh chỉ có nghĩa khi hai kỳ dài gần bằng nhau (năm với năm, 6 tháng với 6 tháng). */
      const dai = (k) => (new Date(k.den_ngay) - new Date(k.tu_ngay)) / 864e5;
      if (Math.abs(dai(ky) - dai(ss)) > 20) canhBao.push(`Kỳ "${ky.ten}" và kỳ "${ss.ten}" dài khác nhau — so sánh số khách chỉ để tham khảo.`);
      else for (const x of khachTheoXa) {
        const a = Number(x.quocTe) + Number(x.noiDia), b = Number(x.ssQuocTe) + Number(x.ssNoiDia);
        if (x.quocTe !== null && x.ssQuocTe !== null && b >= 100 && Math.abs(a - b) / b > 0.5) {
          canhBao.push(`${x.xa}: số khách ${a > b ? 'tăng' : 'giảm'} ${Math.round(Math.abs(a - b) / b * 100)}% so với ${ss.ten} — nên kiểm tra lại số liệu.`);
        }
      }
    }
    const tamNgung = duAnTT.filter((r) => ['tam-ngung', 'thu-hoi', 'cham-trien-khai'].includes(r.trang_thai)).reduce((s, r) => s + Number(r.so), 0);
    if (tamNgung) canhBao.push(`${tamNgung} dự án đang tạm ngưng, chậm triển khai hoặc có chủ trương thu hồi.`);

    res.json({
      ky: raKy(ky), kySoSanh: ss ? raKy(ss) : null,
      khach: { quocTe: cong(ky.id, 'quoc_te'), noiDia: cong(ky.id, 'noi_dia'), ssQuocTe: ss ? cong(ss.id, 'quoc_te') : null, ssNoiDia: ss ? cong(ss.id, 'noi_dia') : null, theoXa: khachTheoXa },
      duAn: {
        theoTrangThai: TRANG_THAI_DU_AN.map(([k, n]) => { const r = duAnTT.find((x) => x.trang_thai === k); return { trangThai: n, so: Number(r?.so || 0), von: Number(r?.von || 0) }; })
          .concat(duAnTT.some((x) => !x.trang_thai) ? [{ trangThai: 'Chưa ghi', so: Number(duAnTT.find((x) => !x.trang_thai).so), von: Number(duAnTT.find((x) => !x.trang_thai).von) }] : []),
        theoQuocGia: duAnQG.map((r) => ({ quocGia: r.qg, so: Number(r.so), von: Number(r.von) })),
      },
      luuTru: [5, 4, 3, 2, 1, 0].map((h) => ({ hang: h ? `${h} sao` : 'Chưa xếp hạng', so: Number(luuTru.find((r) => Number(r.hang_sao) === h)?.so || 0) })),
      nop: { soXa, daChot },
      canhBao,
    });
  } catch (e) { next(e); }
});

export default router;
