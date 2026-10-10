/**
 * KIỂM THỬ BẢO MẬT GIAI ĐOẠN 2 — mã 6 số (TOTP), độ mạnh mật khẩu, mã hoá
 * bản sao lưu, đăng nhập hai lớp qua HTTP. Không cần MySQL.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import { datBienMoiTruongHopLe } from './helpers-test.js';

datBienMoiTruongHopLe();
const { maCuaBuoc, maHoaBase32, giaiBase32, kiemMa, taoBiMat } = await import('../src/lib/totp.js');
const { kiemMatKhau } = await import('../src/lib/mat-khau.js');
const { maHoa, giaiMa } = await import('../src/lib/ma-hoa-sao-luu.js');
const { pool } = await import('../src/db.js');
const authRouter = (await import('../src/routes/auth.js')).default;

test('TOTP khớp bộ số kiểm chuẩn RFC 6238 (SHA1, 6 số cuối)', () => {
  const bm = maHoaBase32(Buffer.from('12345678901234567890'));
  assert.equal(giaiBase32(bm).toString(), '12345678901234567890');
  assert.equal(maCuaBuoc(bm, Math.floor(59 / 30)), '287082');
  assert.equal(maCuaBuoc(bm, Math.floor(1111111109 / 30)), '081804');
  assert.equal(maCuaBuoc(bm, Math.floor(1234567890 / 30)), '005924');
  assert.equal(maCuaBuoc(bm, Math.floor(20000000000 / 30)), '353130');
});

test('TOTP: chấp nhận lệch một nhịp, chặn dùng lại mã, chặn mã sai định dạng', () => {
  const bm = taoBiMat(), luc = 1_800_000_000_000, nhip = Math.floor(luc / 30_000);
  assert.equal(kiemMa(bm, maCuaBuoc(bm, nhip - 1), { luc }).ok, true, 'đồng hồ điện thoại chậm 30 giây vẫn qua');
  assert.equal(kiemMa(bm, maCuaBuoc(bm, nhip - 3), { luc }).ok, false, 'mã quá cũ bị chặn');
  const k = kiemMa(bm, maCuaBuoc(bm, nhip), { luc });
  assert.equal(kiemMa(bm, maCuaBuoc(bm, nhip), { luc, buocCuoi: k.buoc }).ok, false, 'mã vừa dùng không dùng lại được');
  for (const sai of ['12345', 'abcdef', '', null]) assert.equal(kiemMa(bm, sai, { luc }).ok, false);
});

test('mật khẩu: đòi đủ 4 loại ký tự, chặn chứa tên đăng nhập và cụm quen thuộc', () => {
  assert.equal(kiemMatKhau('Suoi-Mo#2026-Ta', 'lan.tt'), null);
  assert.match(kiemMatKhau('ngan', 'lan.tt'), /12 ký tự/);
  assert.match(kiemMatKhau('Lan.tt#2026-Abc', 'lan.tt'), /tên đăng nhập/);
  assert.match(kiemMatKhau('Password#2026x', 'lan.tt'), /quen thuộc/);
});

test('bản sao lưu mã hoá: giải đúng khoá ra nguyên văn, sai khoá hay sửa một byte đều báo lỗi', () => {
  const goc = Buffer.from('INSERT INTO bc_vu_viec VALUES (1, \'Vụ việc\');');
  const tep = maHoa(goc, 'Khoa-Sao-Luu-Thu-2026');
  assert.ok(!tep.includes(Buffer.from('bc_vu_viec')), 'không còn chữ thường trong tệp');
  assert.deepEqual(giaiMa(tep, 'Khoa-Sao-Luu-Thu-2026'), goc);
  assert.throws(() => giaiMa(tep, 'khoa-sai-0123456789'), /Sai khoá/);
  const hong = Buffer.from(tep); hong[hong.length - 1] ^= 1;
  assert.throws(() => giaiMa(hong, 'Khoa-Sao-Luu-Thu-2026'), /Sai khoá|hỏng/);
});

/* ---------- Đăng nhập hai lớp qua HTTP ---------- */
const BI_MAT = taoBiMat();
const HASH = bcrypt.hashSync('Tuong-Binh#2026Hiep', 4);
let goi = [];
pool.query = async (sql, params = []) => {
  goi.push({ sql, params });
  if (/FROM staff WHERE username = \?/i.test(sql)) {
    return [[{ id: 2, full_name: 'Hùng', username: 'hung.nv', password_hash: HASH, role: 'admin', is_active: 1, failed_attempts: 0,
      locked_until: null, totp_bat: 1, totp_bi_mat: BI_MAT, totp_buoc_cuoi: null }]];
  }
  return [{ affectedRows: 1, insertId: 1 }];
};
const app = express(); app.set('trust proxy', 1); app.use(express.json()); app.use('/api/auth', authRouter);
let may, goc;
before(async () => { may = app.listen(0); await new Promise((r) => may.once('listening', r)); goc = `http://127.0.0.1:${may.address().port}`; });
after(() => may.close());
const dangNhap = (body) => fetch(goc + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'hung.nv', password: 'Tuong-Binh#2026Hiep', ...body }) });

test('tài khoản bật hai lớp: đúng mật khẩu mà thiếu mã -> hỏi mã, KHÔNG cấp vé', async () => {
  const r = await dangNhap({});
  const d = await r.json();
  assert.equal(r.status, 401); assert.equal(d.canOtp, true); assert.equal(d.accessToken, undefined);
});

test('mã sai -> 401 và tăng bộ đếm sai; mã đúng -> cấp vé và lưu nhịp để chặn dùng lại', async () => {
  goi = [];
  const sai = await dangNhap({ maOtp: '000000' });
  assert.equal(sai.status, 401);
  assert.ok(goi.some((g) => /UPDATE staff SET failed_attempts = \?/i.test(g.sql) && g.params[0] === 1));
  goi = [];
  const dung = await dangNhap({ maOtp: maCuaBuoc(BI_MAT, Math.floor(Date.now() / 30_000)) });
  assert.equal(dung.status, 200);
  assert.ok((await dung.json()).accessToken);
  assert.ok(goi.some((g) => /UPDATE staff SET totp_buoc_cuoi = \?/i.test(g.sql)));
});
