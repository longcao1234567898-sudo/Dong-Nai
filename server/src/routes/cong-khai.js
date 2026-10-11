/**
 * ĐƯỜNG DẪN CÔNG KHAI — du khách xem điểm đến, đánh giá, thống kê.
 *
 * ⚠️ Đánh giá là chỗ dễ bị phá nhất (chấm 1 sao hàng loạt, quảng cáo). Ba lớp:
 *    1. Mỗi thiết bị chỉ MỘT đánh giá cho mỗi điểm — gửi lại là sửa bài cũ.
 *    2. Giới hạn 10 lần gửi mỗi giờ trên một địa chỉ IP.
 *    3. Vé xác minh: du khách qua ô Turnstile ở cổng vào (POST /xac-minh), mỗi thiết bị
 *       mỗi giờ một lần; mọi đường GỬI đòi vé đó (khi máy chủ đã khai khoá Cloudflare).
 *    Mã thiết bị và IP chỉ lưu dạng băm có HASH_PEPPER, không lưu bản thô.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { layIpThat, generateTrackingCode } from '../lib/helpers.js';
import { sanitizeText, containsProfanity } from '../lib/security.js';
import { verifyTurnstile, turnstileEnabled, capVe, canVeXacMinh, maThietBiHopLe } from '../lib/turnstile.js';

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
      `SELECT d.id, d.ten, d.ten_en, d.loai, d.mo_ta, d.mo_ta_en, d.dia_chi, d.lat, d.lng, d.sdt, d.web, d.gio_mo, d.noi_bat, d.vung, x.ten AS xa,
              COUNT(g.id) AS so_dg, AVG(g.sao) AS sao_tb,
              AVG(g.canh_quan) AS tb_canh_quan, AVG(g.dich_vu) AS tb_dich_vu, AVG(g.ve_sinh) AS tb_ve_sinh, AVG(g.gia_ca) AS tb_gia_ca,
              SUM(g.sao = 5) AS s5, SUM(g.sao = 4) AS s4, SUM(g.sao = 3) AS s3, SUM(g.sao = 2) AS s2, SUM(g.sao = 1) AS s1
         FROM dia_diem d LEFT JOIN danh_gia g ON g.dia_diem_id = d.id AND g.bi_an = 0 LEFT JOIN xa_phuong x ON x.id = d.xa_phuong_id
        WHERE d.hien = 1
        GROUP BY d.id
        ORDER BY d.noi_bat DESC, d.ten`
    );
    const so = (v) => (v === null ? null : Number(v));
    /* Danh sách ảnh (chỉ mã và kích thước, không kèm dữ liệu ảnh) — ảnh tải riêng qua /anh/:id. */
    const [anh] = await pool.query('SELECT id, dia_diem_id, rong, cao, chu_thich, tieu_diem_x, tieu_diem_y FROM anh_dia_diem ORDER BY dia_diem_id, thu_tu, id');
    /* Điểm quan sát 360° (chỉ thông tin, ảnh tải riêng qua /quan-sat/:id/anh). Bảng chưa có
       (chưa chạy lại tệp SQL) thì coi như chưa có điểm nào, không làm hỏng cả danh sách. */
    const [qs] = await pool.query('SELECT id, dia_diem_id, ten, ten_en, goc_ngang, huong_dau FROM diem_quan_sat ORDER BY dia_diem_id, thu_tu, id')
      .catch((e) => { if (e.code === 'ER_NO_SUCH_TABLE') return [[]]; throw e; });
    dem = { luc: Date.now(), du: rows.map((r) => ({
      id: r.id, ten: r.ten, tenEn: r.ten_en, loai: r.loai, moTa: r.mo_ta, moTaEn: r.mo_ta_en, diaChi: r.dia_chi, lat: Number(r.lat), lng: Number(r.lng),
      anh: anh.filter((a) => a.dia_diem_id === r.id).map((a) => ({ id: a.id, rong: a.rong, cao: a.cao, chuThich: a.chu_thich, tieuDiemX: a.tieu_diem_x ?? 50, tieuDiemY: a.tieu_diem_y ?? 50 })),
      quanSat: qs.filter((q) => q.dia_diem_id === r.id).map((q) => ({ id: q.id, ten: q.ten, tenEn: q.ten_en, gocNgang: q.goc_ngang, huongDau: q.huong_dau })),
      sdt: r.sdt, web: r.web, gioMo: r.gio_mo, noiBat: !!r.noi_bat, vung: r.vung ?? null, xa: r.xa ?? null,
      soDanhGia: Number(r.so_dg), saoTb: so(r.sao_tb),
      tieuChi: { canhQuan: so(r.tb_canh_quan), dichVu: so(r.tb_dich_vu), veSinh: so(r.tb_ve_sinh), giaCa: so(r.tb_gia_ca) },
      phanBo: [5, 4, 3, 2, 1].map((n) => Number(r['s' + n] || 0)),
    })) };
    res.json(dem.du);
  } catch (e) { next(e); }
});

/* Bài giới thiệu chi tiết — tách khỏi danh sách để trang chủ không phải tải mấy chục KB chữ. */
router.get('/dia-diem/:id/chi-tiet', async (req, res, next) => {
  try {
    const [[r]] = await pool.query('SELECT chi_tiet, chi_tiet_en FROM dia_diem WHERE id = ? AND hien = 1', [String(req.params.id)]);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy địa điểm.' });
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ chiTiet: r.chi_tiet ?? null, chiTietEn: r.chi_tiet_en ?? null });
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

/* Đánh giá mới nhất trên mọi điểm đến — khối "Đánh giá của du khách" ở trang chủ.
   Chỉ đánh giá có nhận xét, chưa bị cán bộ ẩn, của điểm đang hiện. */
router.get('/danh-gia/moi-nhat', async (req, res, next) => {
  try {
    const gioiHan = Math.min(Math.max(Number.parseInt(req.query.gioiHan, 10) || 6, 1), 12);
    const [rows] = await pool.query(
      `SELECT g.id, g.dia_diem_id, d.ten, d.ten_en, g.sao, g.di_cung, g.thoi_diem, g.nhan_xet, g.ten_hien_thi, g.updated_at
         FROM danh_gia g JOIN dia_diem d ON d.id = g.dia_diem_id
        WHERE g.bi_an = 0 AND d.hien = 1 AND g.nhan_xet IS NOT NULL AND g.nhan_xet <> ''
        ORDER BY g.updated_at DESC, g.id DESC LIMIT ?`, [gioiHan]);
    res.json(rows.map((r) => ({ id: r.id, diaDiemId: r.dia_diem_id, tenDiem: r.ten, tenDiemEn: r.ten_en, sao: r.sao, diCung: r.di_cung,
      thoiDiem: r.thoi_diem, nhanXet: r.nhan_xet, ten: r.ten_hien_thi, luc: r.updated_at })));
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

router.post('/danh-gia', canVeXacMinh, gioiHanDanhGia, async (req, res, next) => {
  try {
    const b = req.body || {};
    const may = String(req.get('X-Ma-Thiet-Bi') || '');
    if (!/^[a-f0-9-]{20,64}$/i.test(may)) return res.status(400).json({ error: 'Thiếu mã thiết bị. Tải lại trang rồi gửi lại.' });
    const sao = diem(b.sao);
    if (!sao) return res.status(400).json({ error: 'Chọn số sao đánh giá chung từ 1 đến 5.' });
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
    /* Khách theo xã/phường: chỉ lấy số liệu xã đã CHỐT, của kỳ mới nhất có xã chốt. */
    const [[kyChot]] = await pool.query(
      `SELECT k.id, k.ten FROM ky_bao_cao k JOIN nop_bao_cao n ON n.ky_id = k.id AND n.trang_thai = 'da-chot'
        ORDER BY k.tu_ngay DESC, k.den_ngay DESC LIMIT 1`);
    let khachTheoXa = null;
    if (kyChot) {
      const [rows] = await pool.query(
        `SELECT x.ten, x.loai, b.quoc_te, b.noi_dia FROM bc_khach b JOIN nop_bao_cao n ON n.ky_id = b.ky_id AND n.xa_phuong_id = b.xa_phuong_id AND n.trang_thai = 'da-chot'
           JOIN xa_phuong x ON x.id = b.xa_phuong_id WHERE b.ky_id = ? AND b.xoa_luc IS NULL ORDER BY (b.quoc_te + b.noi_dia) DESC`, [kyChot.id]);
      const LOAI = { xa: 'Xã', phuong: 'Phường', 'dac-khu': 'Đặc khu' };
      khachTheoXa = { ky: kyChot.ten, ds: rows.map((r) => ({ xa: `${LOAI[r.loai]} ${r.ten}`, quocTe: Number(r.quoc_te), noiDia: Number(r.noi_dia) })) };
    }
    const n = (v) => (v === null ? null : Number(v));
    res.json({
      khachTheoXa,
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

/* ====================================================================
   GIAI ĐOẠN 3 — ẢNH, LỘ TRÌNH, TIN TỨC, LƯU TRÚ, PHẢN ÁNH, BÁO ĐÁNH GIÁ
   ==================================================================== */

/* Ảnh địa điểm: trả thẳng dữ liệu ảnh, cho trình duyệt nhớ đệm một năm (ảnh
   không bao giờ sửa tại chỗ — đổi ảnh là xoá ảnh cũ, tải ảnh mới có mã mới). */
router.get('/anh/:id', async (req, res, next) => {
  try {
    const [[a]] = await pool.query(
      `SELECT a.du_lieu, a.kieu FROM anh_dia_diem a JOIN dia_diem d ON d.id = a.dia_diem_id WHERE a.id = ? AND d.hien = 1`, [Number(req.params.id) || 0]);
    if (!a) return res.status(404).json({ error: 'Không tìm thấy ảnh.' });
    res.setHeader('Content-Type', a.kieu);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(a.du_lieu);
  } catch (e) { next(e); }
});

/* Ảnh 360° của điểm quan sát — như ảnh địa điểm: không sửa tại chỗ nên nhớ đệm lâu. */
router.get('/quan-sat/:id/anh', async (req, res, next) => {
  try {
    const [[a]] = await pool.query(
      `SELECT q.du_lieu, q.kieu FROM diem_quan_sat q JOIN dia_diem d ON d.id = q.dia_diem_id WHERE q.id = ? AND d.hien = 1`, [Number(req.params.id) || 0]);
    if (!a) return res.status(404).json({ error: 'Không tìm thấy ảnh.' });
    res.setHeader('Content-Type', a.kieu);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(a.du_lieu);
  } catch (e) { next(e); }
});

router.get('/lo-trinh', async (_req, res, next) => {
  try {
    const [lt] = await pool.query('SELECT id, ten, ten_en, thoi_gian, phuong_tien, phuong_tien_en, mo_ta, mo_ta_en FROM lich_trinh WHERE hien = 1 ORDER BY thu_tu, id');
    const [diem] = await pool.query(
      `SELECT ld.lich_trinh_id, ld.dia_diem_id, ld.ngay, ld.ghi_chu FROM lich_trinh_diem ld JOIN dia_diem d ON d.id = ld.dia_diem_id
        WHERE d.hien = 1 ORDER BY ld.lich_trinh_id, ld.thu_tu`);
    res.json(lt.map((t) => ({ id: t.id, ten: t.ten, tenEn: t.ten_en, thoiGian: t.thoi_gian, phuongTien: t.phuong_tien ?? null, phuongTienEn: t.phuong_tien_en ?? null,
      moTa: t.mo_ta, moTaEn: t.mo_ta_en,
      diem: diem.filter((d) => d.lich_trinh_id === t.id).map((d) => ({ id: d.dia_diem_id, ngay: d.ngay, ghiChu: d.ghi_chu })) })));
  } catch (e) { next(e); }
});

/* Tin còn hạn: chưa tới ngày bắt đầu hoặc đã qua ngày kết thúc thì tự thôi hiện. */
/* Tin tức: kèm danh sách ảnh (chỉ mã, cỡ), tin nổi bật, đường dẫn nguồn. Cột/bảng mới
   chưa có (chưa chạy lại tệp SQL) thì vẫn trả tin như cũ. */
const docTinCK = (r, anh) => ({ id: r.id, loai: r.loai, tieuDe: r.tieu_de, tieuDeEn: r.tieu_de_en, noiDung: r.noi_dung, noiDungEn: r.noi_dung_en,
  tuNgay: r.tu_ngay, denNgay: r.den_ngay, diaDiemId: r.dia_diem_id, noiBat: !!r.noi_bat, lienKet: r.lien_ket ?? null,
  anh: anh.filter((a) => a.tin_id === r.id).map((a) => ({ id: a.id, rong: a.rong, cao: a.cao, chuThich: a.chu_thich })) });
const layAnhTin = (ids) => (ids.length
  ? pool.query('SELECT id, tin_id, rong, cao, chu_thich FROM anh_tin WHERE tin_id IN (?) ORDER BY tin_id, thu_tu, id', [ids])
    .then(([r]) => r).catch((e) => { if (e.code === 'ER_NO_SUCH_TABLE') return []; throw e; })
  : Promise.resolve([]));
router.get('/tin-tuc', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tin_tuc
        WHERE hien = 1 AND (tu_ngay IS NULL OR tu_ngay <= CURDATE() OR loai = 'su-kien') AND (den_ngay IS NULL OR den_ngay >= CURDATE())
        ORDER BY FIELD(loai, 'canh-bao', 'su-kien', 'thong-bao', 'lien-he'), thu_tu, tu_ngay, id DESC LIMIT 100`);
    const anh = await layAnhTin(rows.map((r) => r.id));
    res.json(rows.map((r) => docTinCK(r, anh)));
  } catch (e) { next(e); }
});
/* Một tin — đường dẫn riêng để chia sẻ. Tin đã hết hạn vẫn mở được qua đường dẫn (người
   ta đã gửi nhau), giao diện ghi rõ đã kết thúc; tin bị ẩn thì không. */
router.get('/tin-tuc/:id', async (req, res, next) => {
  try {
    const [[r]] = await pool.query('SELECT * FROM tin_tuc WHERE id = ? AND hien = 1 AND loai <> \'lien-he\'', [Number(req.params.id) || 0]);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy tin, hoặc tin đã được gỡ.' });
    res.json(docTinCK(r, await layAnhTin([r.id])));
  } catch (e) { next(e); }
});
router.get('/anh-tin/:id', async (req, res, next) => {
  try {
    const [[a]] = await pool.query('SELECT a.du_lieu, a.kieu FROM anh_tin a JOIN tin_tuc t ON t.id = a.tin_id WHERE a.id = ? AND t.hien = 1', [Number(req.params.id) || 0]);
    if (!a) return res.status(404).json({ error: 'Không tìm thấy ảnh.' });
    res.setHeader('Content-Type', a.kieu);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(a.du_lieu);
  } catch (e) { next(e); }
});

/* Cơ sở lưu trú cán bộ đã cho hiện (bảng 3). Không bao giờ trả tên chủ cơ sở. */
router.get('/luu-tru', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.ten, l.dia_chi, l.hang_sao, x.ten AS xa, x.loai AS loai_xa FROM bc_luu_tru l JOIN xa_phuong x ON x.id = l.xa_phuong_id
        WHERE l.cong_khai = 1 AND l.xoa_luc IS NULL ORDER BY l.hang_sao DESC, l.ten`);
    const LOAI = { xa: 'Xã', phuong: 'Phường', 'dac-khu': 'Đặc khu' };
    res.json(rows.map((r) => ({ id: r.id, ten: r.ten, diaChi: r.dia_chi, hangSao: Number(r.hang_sao), xaPhuong: `${LOAI[r.loai_xa]} ${r.xa}` })));
  } catch (e) { next(e); }
});

/* ---------------- Phản ánh ---------------- */
export const LOAI_PHAN_ANH = ['gia-ca', 'an-ninh', 've-sinh', 'dich-vu', 'an-toan', 'khac'];
const gioiHanPhanAnh = rateLimit({ windowMs: 60 * 60_000, max: 5, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => layIpThat(req), message: { error: 'Bạn đã gửi nhiều phản ánh trong một giờ. Thử lại sau, hoặc gọi số khẩn cấp nếu đang nguy hiểm.' } });

router.post('/phan-anh', canVeXacMinh, gioiHanPhanAnh, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!LOAI_PHAN_ANH.includes(b.loai)) return res.status(400).json({ error: 'Chọn loại phản ánh.' });
    const noiDung = sanitizeText(String(b.noiDung || ''), 2000);
    if (noiDung.length < 15) return res.status(400).json({ error: 'Mô tả cụ thể hơn (ít nhất 15 ký tự): chuyện gì, ở đâu, lúc nào.' });
    if (containsProfanity(noiDung)) return res.status(400).json({ error: 'Nội dung có từ ngữ không phù hợp. Sửa lại giúp cán bộ dễ xử lý.' });
    let diaDiem = null;
    if (b.diaDiemId) {
      [[diaDiem]] = await pool.query('SELECT id, xa_phuong_id FROM dia_diem WHERE id = ? AND hien = 1', [String(b.diaDiemId)]);
      if (!diaDiem) return res.status(400).json({ error: 'Địa điểm không hợp lệ.' });
    }
    const lienHe = sanitizeText(String(b.lienHe || ''), 100) || null;
    /* Phản ánh KHÔNG có tra cứu kết quả phía người dân: người gửi chỉ nhận lời
       cảm ơn. Số hiệu 8 ký tự (cột ma_tra_cuu) chỉ để cán bộ gọi tên, đối chiếu
       phản ánh với nhau trong khu quản trị — không trả ra cho người gửi. */
    for (let lan = 0; lan < 5; lan++) {
      const ma = generateTrackingCode(8);
      try {
        await pool.query(
          `INSERT INTO phan_anh (ma_tra_cuu, loai, dia_diem_id, xa_phuong_id, noi_dung, lien_he, ip_bam) VALUES (?,?,?,?,?,?,?)`,
          [ma, b.loai, diaDiem?.id || null, diaDiem?.xa_phuong_id || null, noiDung, lienHe, bam(layIpThat(req))]);
        return res.status(201).json({ ok: true });
      } catch (e) { if (e.code !== 'ER_DUP_ENTRY') throw e; }
    }
    throw new Error('Không tạo được số hiệu phản ánh.');
  } catch (e) { next(e); }
});

/* ---------------- Cổng vào: đổi mã Turnstile lấy vé 1 giờ cho thiết bị này ---------------- */
const gioiHanXacMinh = rateLimit({ windowMs: 10 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => layIpThat(req),
  message: { error: 'Kiểm tra quá nhiều lần. Đợi vài phút rồi tải lại trang.' } });
router.post('/xac-minh', gioiHanXacMinh, async (req, res, next) => {
  try {
    /* Máy chủ chưa khai khoá bí mật: không kiểm được, báo giao diện cho qua. */
    if (!turnstileEnabled()) return res.json({ ve: null, tat: true });
    const may = req.get('X-Ma-Thiet-Bi');
    if (!maThietBiHopLe(may)) return res.status(400).json({ error: 'Thiếu mã thiết bị. Tải lại trang rồi thử lại.' });
    const kq = await verifyTurnstile(String(req.body?.token || ''), layIpThat(req));
    if (!kq.ok) return res.status(400).json({ error: kq.error });
    res.json(capVe(may));
  } catch (e) { next(e); }
});

/* ---------------- Báo đánh giá sai phạm ---------------- */
const gioiHanBao = rateLimit({ windowMs: 60 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => layIpThat(req),
  message: { error: 'Bạn đã báo nhiều lần trong một giờ.' } });
router.post('/danh-gia/:id/bao', canVeXacMinh, gioiHanBao, async (req, res, next) => {
  try {
    const may = String(req.get('X-Ma-Thiet-Bi') || '');
    if (!/^[a-f0-9-]{20,64}$/i.test(may)) return res.status(400).json({ error: 'Thiếu mã thiết bị. Tải lại trang rồi thử lại.' });
    const lyDo = ['xuc-pham', 'quang-cao', 'sai-su-that', 'khac'].includes(req.body?.lyDo) ? req.body.lyDo : 'khac';
    const [[dg]] = await pool.query('SELECT id FROM danh_gia WHERE id = ? AND bi_an = 0', [Number(req.params.id) || 0]);
    if (!dg) return res.status(404).json({ error: 'Không tìm thấy đánh giá.' });
    await pool.query('INSERT IGNORE INTO bao_danh_gia (danh_gia_id, ma_thiet_bi, ly_do) VALUES (?,?,?)', [dg.id, bam(may), lyDo]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
