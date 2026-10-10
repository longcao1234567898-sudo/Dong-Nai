/**
 * ĐƯỜNG DẪN CÔNG KHAI — du khách xem điểm đến, đánh giá, thống kê.
 *
 * ⚠️ Đánh giá là chỗ dễ bị phá nhất (chấm 1 sao hàng loạt, quảng cáo). Ba lớp:
 *    1. Mỗi thiết bị chỉ MỘT đánh giá cho mỗi điểm — gửi lại là sửa bài cũ.
 *    2. Giới hạn 10 lần gửi mỗi giờ trên một địa chỉ IP.
 *    3. Ô xác minh Turnstile khi máy chủ đã khai khoá Cloudflare.
 *    Mã thiết bị và IP chỉ lưu dạng băm có HASH_PEPPER, không lưu bản thô.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { layIpThat } from '../lib/helpers.js';
import { sanitizeText } from '../lib/security.js';
import { verifyTurnstile, turnstileEnabled } from '../lib/turnstile.js';

const router = Router();
const PEPPER = process.env.HASH_PEPPER || '';
const bam = (s) => crypto.createHash('sha256').update(PEPPER + '|' + s).digest('hex');
const DI_CUNG = ['gia-dinh', 'ban-be', 'cap-doi', 'mot-minh'];
const thangHopLe = (t) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(t || ''));
const diem = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; };

/* Danh sách điểm đến kèm điểm đánh giá — đọc nhiều nhất nên nhớ đệm 30 giây. */
let dem = { luc: 0, du: null };
export const xoaDemCongKhai = () => { dem = { luc: 0, du: null }; };

router.get('/dia-diem', async (_req, res, next) => {
  try {
    if (dem.du && Date.now() - dem.luc < 30_000) return res.json(dem.du);
    const [rows] = await pool.query(
      `SELECT d.id, d.ten, d.loai, d.mo_ta, d.dia_chi, d.lat, d.lng, d.sdt, d.web, d.gio_mo, d.noi_bat,
              COUNT(g.id) AS so_dg, AVG(g.sao) AS sao_tb,
              AVG(g.canh_quan) AS tb_canh_quan, AVG(g.dich_vu) AS tb_dich_vu, AVG(g.ve_sinh) AS tb_ve_sinh, AVG(g.gia_ca) AS tb_gia_ca,
              SUM(g.sao = 5) AS s5, SUM(g.sao = 4) AS s4, SUM(g.sao = 3) AS s3, SUM(g.sao = 2) AS s2, SUM(g.sao = 1) AS s1
         FROM dia_diem d LEFT JOIN danh_gia g ON g.dia_diem_id = d.id AND g.bi_an = 0
        WHERE d.hien = 1
        GROUP BY d.id
        ORDER BY d.noi_bat DESC, d.ten`
    );
    const so = (v) => (v === null ? null : Number(v));
    dem = { luc: Date.now(), du: rows.map((r) => ({
      id: r.id, ten: r.ten, loai: r.loai, moTa: r.mo_ta, diaChi: r.dia_chi, lat: Number(r.lat), lng: Number(r.lng),
      sdt: r.sdt, web: r.web, gioMo: r.gio_mo, noiBat: !!r.noi_bat,
      soDanhGia: Number(r.so_dg), saoTb: so(r.sao_tb),
      tieuChi: { canhQuan: so(r.tb_canh_quan), dichVu: so(r.tb_dich_vu), veSinh: so(r.tb_ve_sinh), giaCa: so(r.tb_gia_ca) },
      phanBo: [5, 4, 3, 2, 1].map((n) => Number(r['s' + n] || 0)),
    })) };
    res.json(dem.du);
  } catch (e) { next(e); }
});

router.get('/dia-diem/:id/danh-gia', async (req, res, next) => {
  try {
    const sx = { cao: 'sao DESC, updated_at DESC', thap: 'sao ASC, updated_at DESC' }[req.query.sx] || 'updated_at DESC';
    const [rows] = await pool.query(
      `SELECT id, sao, canh_quan, dich_vu, ve_sinh, gia_ca, di_cung, thoi_diem, nhan_xet, ten_hien_thi, updated_at
         FROM danh_gia WHERE dia_diem_id = ? AND bi_an = 0 ORDER BY ${sx} LIMIT 50`, [String(req.params.id)]);
    res.json(rows.map((r) => ({ id: r.id, sao: r.sao, tieuChi: { canhQuan: r.canh_quan, dichVu: r.dich_vu, veSinh: r.ve_sinh, giaCa: r.gia_ca },
      diCung: r.di_cung, thoiDiem: r.thoi_diem, nhanXet: r.nhan_xet, ten: r.ten_hien_thi, luc: r.updated_at })));
  } catch (e) { next(e); }
});

/* Đánh giá của chính thiết bị này — để điền sẵn khi du khách muốn sửa. */
router.get('/dia-diem/:id/cua-toi', async (req, res, next) => {
  try {
    const may = String(req.get('X-Ma-Thiet-Bi') || '');
    if (!/^[a-f0-9-]{20,64}$/i.test(may)) return res.json(null);
    const [[r]] = await pool.query(
      `SELECT sao, canh_quan, dich_vu, ve_sinh, gia_ca, di_cung, thoi_diem, nhan_xet, ten_hien_thi
         FROM danh_gia WHERE dia_diem_id = ? AND ma_thiet_bi = ?`, [String(req.params.id), bam(may)]);
    res.json(r ? { sao: r.sao, tieuChi: { canhQuan: r.canh_quan, dichVu: r.dich_vu, veSinh: r.ve_sinh, giaCa: r.gia_ca },
      diCung: r.di_cung, thoiDiem: r.thoi_diem, nhanXet: r.nhan_xet, ten: r.ten_hien_thi } : null);
  } catch (e) { next(e); }
});

const gioiHanDanhGia = rateLimit({ windowMs: 60 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => layIpThat(req), message: { error: 'Bạn gửi đánh giá quá nhiều trong một giờ. Thử lại sau.' } });

router.post('/danh-gia', gioiHanDanhGia, async (req, res, next) => {
  try {
    const b = req.body || {};
    const may = String(req.get('X-Ma-Thiet-Bi') || '');
    if (!/^[a-f0-9-]{20,64}$/i.test(may)) return res.status(400).json({ error: 'Thiếu mã thiết bị. Tải lại trang rồi gửi lại.' });
    const sao = diem(b.sao);
    if (!sao) return res.status(400).json({ error: 'Chọn số sao đánh giá chung từ 1 đến 5.' });
    if (turnstileEnabled()) {
      const kq = await verifyTurnstile(b.captchaToken, layIpThat(req));
      if (!kq.ok) return res.status(400).json({ error: kq.error || 'Chưa qua bước xác minh.', canCaptcha: true });
    }
    const [[dd]] = await pool.query('SELECT id FROM dia_diem WHERE id = ? AND hien = 1', [String(b.diaDiemId || '')]);
    if (!dd) return res.status(404).json({ error: 'Không tìm thấy địa điểm.' });
    const tc = b.tieuChi || {};
    const vals = [dd.id, bam(may), bam(layIpThat(req)), sao, diem(tc.canhQuan), diem(tc.dichVu), diem(tc.veSinh), diem(tc.giaCa),
      DI_CUNG.includes(b.diCung) ? b.diCung : null, thangHopLe(b.thoiDiem) ? b.thoiDiem : null,
      sanitizeText(String(b.nhanXet || ''), 500) || null, sanitizeText(String(b.ten || ''), 40) || null];
    await pool.query(
      `INSERT INTO danh_gia (dia_diem_id, ma_thiet_bi, ip_bam, sao, canh_quan, dich_vu, ve_sinh, gia_ca, di_cung, thoi_diem, nhan_xet, ten_hien_thi)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE ip_bam=VALUES(ip_bam), sao=VALUES(sao), canh_quan=VALUES(canh_quan), dich_vu=VALUES(dich_vu),
         ve_sinh=VALUES(ve_sinh), gia_ca=VALUES(gia_ca), di_cung=VALUES(di_cung), thoi_diem=VALUES(thoi_diem),
         nhan_xet=VALUES(nhan_xet), ten_hien_thi=VALUES(ten_hien_thi)`, vals);
    xoaDemCongKhai();
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

/* Thống kê công khai — chỉ số tổng hợp, không có dữ liệu cá nhân. */
router.get('/thong-ke', async (req, res, next) => {
  try {
    const [namRows] = await pool.query('SELECT DISTINCT LEFT(thang, 4) AS nam FROM luot_khach ORDER BY nam DESC');
    const nams = namRows.map((r) => r.nam);
    const nam = nams.includes(String(req.query.nam)) ? String(req.query.nam) : (nams[0] || String(new Date().getFullYear()));
    const [thang] = await pool.query(
      `SELECT thang, SUM(noi_dia) AS nd, SUM(quoc_te) AS qt FROM luot_khach WHERE thang LIKE ? GROUP BY thang`, [nam + '-%']);
    const [top] = await pool.query(
      `SELECT d.ten, SUM(l.noi_dia + l.quoc_te) AS tong FROM luot_khach l JOIN dia_diem d ON d.id = l.dia_diem_id
        WHERE l.thang LIKE ? AND d.hien = 1 GROUP BY d.id ORDER BY tong DESC LIMIT 8`, [nam + '-%']);
    const [[dg]] = await pool.query(
      `SELECT COUNT(*) AS so, AVG(sao) AS tb, AVG(canh_quan) AS cq, AVG(dich_vu) AS dv, AVG(ve_sinh) AS vs, AVG(gia_ca) AS gc,
              SUM(sao=1) s1, SUM(sao=2) s2, SUM(sao=3) s3, SUM(sao=4) s4, SUM(sao=5) s5
         FROM danh_gia WHERE bi_an = 0`);
    const [theoThang] = await pool.query(
      `SELECT DATE_FORMAT(updated_at, '%Y-%m') AS thang, COUNT(*) AS so FROM danh_gia
        WHERE bi_an = 0 AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY thang`);
    const [saoDiem] = await pool.query(
      `SELECT d.ten, AVG(g.sao) AS tb, COUNT(*) AS so FROM danh_gia g JOIN dia_diem d ON d.id = g.dia_diem_id
        WHERE g.bi_an = 0 AND d.hien = 1 GROUP BY d.id ORDER BY tb DESC, so DESC LIMIT 10`);
    const n = (v) => (v === null ? null : Number(v));
    res.json({
      nams: nams.length ? nams : [nam], nam,
      thang: Array.from({ length: 12 }, (_, i) => { const t = `${nam}-${String(i + 1).padStart(2, '0')}`; const r = thang.find((x) => x.thang === t);
        return { thang: t, noiDia: Number(r?.nd || 0), quocTe: Number(r?.qt || 0) }; }),
      topDiaDiem: top.map((r) => ({ ten: r.ten, tong: Number(r.tong) })),
      danhGia: { so: Number(dg.so), saoTb: n(dg.tb), tieuChi: { canhQuan: n(dg.cq), dichVu: n(dg.dv), veSinh: n(dg.vs), giaCa: n(dg.gc) },
        phanBo: [1, 2, 3, 4, 5].map((k) => Number(dg['s' + k] || 0)) },
      danhGiaTheoThang: theoThang.map((r) => ({ thang: r.thang, so: Number(r.so) })),
      saoTheoDiaDiem: saoDiem.map((r) => ({ ten: r.ten, tb: Number(r.tb), so: Number(r.so) })),
    });
  } catch (e) { next(e); }
});

export default router;
