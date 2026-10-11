/**
 * KIỂM THỬ CỔNG XÁC MINH — ô Turnstile chỉ ở cổng vào trang du khách, vé 1 giờ gắn mã thiết bị;
 * các đường gửi của du khách kiểm vé, đăng nhập cán bộ không cần vé.
 * Không cần MySQL, không gọi Cloudflare thật (fetch tới Cloudflare được giả lập).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import { datBienMoiTruongHopLe } from './helpers-test.js';

datBienMoiTruongHopLe();
process.env.TURNSTILE_SECRET_KEY = 'khoa-bi-mat-thu';
const { pool } = await import('../src/db.js');
const { capVe, kiemVe, HAN_VE_MS } = await import('../src/lib/turnstile.js');
const congKhai = (await import('../src/routes/cong-khai.js')).default;
const authRouter = (await import('../src/routes/auth.js')).default;

/* Cloudflare giả: mã "dung" là qua, còn lại là trượt. */
const fetchThat = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://challenges.cloudflare.com/')) {
    return new Response(JSON.stringify({ success: new URLSearchParams(init.body).get('response') === 'dung' }), { headers: { 'Content-Type': 'application/json' } });
  }
  return fetchThat(url, init);
};

const HASH = bcrypt.hashSync('Tuong-Binh#2026Hiep', 4);
let soLanSai = 0;
pool.query = async (sql, params = []) => {
  if (/FROM staff WHERE username = \?/i.test(sql)) {
    return [[{ id: 2, full_name: 'Hùng', username: 'hung.nv', password_hash: HASH, role: 'admin', is_active: 1, failed_attempts: soLanSai,
      locked_until: null, totp_bat: 0, totp_bi_mat: null, totp_buoc_cuoi: null }]];
  }
  if (/SELECT id FROM dia_diem WHERE id = \? AND hien = 1/i.test(sql)) return [[{ id: 'ho-tri-an' }]];
  return [{ affectedRows: 1, insertId: 1 }];
};

const app = express(); app.set('trust proxy', 1); app.use(express.json());
app.use('/api/cong-khai', congKhai); app.use('/api/auth', authRouter);
let may, goc;
before(async () => { may = app.listen(0); await new Promise((r) => may.once('listening', r)); goc = `http://127.0.0.1:${may.address().port}`; });
after(() => { may.close(); globalThis.fetch = fetchThat; });

const MAY = '0123456789abcdef0123456789abcdef';
const MAY_KHAC = 'fedcba9876543210fedcba9876543210';
const gui = (duong, body, ve, may = MAY) => fetch(goc + duong, { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Ma-Thiet-Bi': may, ...(ve ? { 'X-Xac-Minh': ve } : {}) },
  body: JSON.stringify(body) });
const DANH_GIA = { diaDiemId: 'ho-tri-an', sao: 5 };

test('vé: đúng thiết bị thì nhận; thiết bị khác, sửa một ký tự hay quá 1 giờ thì từ chối', () => {
  const { ve, hetHan } = capVe(MAY, 1_000_000);
  assert.equal(HAN_VE_MS, 60 * 60_000);
  assert.equal(hetHan, 1_000_000 + HAN_VE_MS);
  assert.ok(kiemVe(ve, MAY, { bayGio: 1_000_000 + 59 * 60_000 }));
  assert.ok(kiemVe(ve, MAY.toUpperCase(), { bayGio: 1_000_000 }), 'không phân biệt hoa thường');
  assert.ok(!kiemVe(ve, MAY_KHAC, { bayGio: 1_000_000 }));
  assert.ok(!kiemVe(ve.slice(0, -1) + (ve.endsWith('A') ? 'B' : 'A'), MAY, { bayGio: 1_000_000 }));
  assert.ok(!kiemVe(ve, MAY, { bayGio: 1_000_000 + HAN_VE_MS + 1 }));
  assert.ok(!kiemVe(ve, 'khong-hop-le', { bayGio: 1_000_000 }));
  assert.ok(!kiemVe('', MAY) && !kiemVe('a.b', MAY));
});

test('cổng vào: mã Turnstile đúng đổi được vé cho thiết bị; mã sai hay thiếu mã thiết bị bị từ chối', async () => {
  assert.equal((await gui('/api/cong-khai/xac-minh', { token: 'sai' })).status, 400);
  assert.equal((await gui('/api/cong-khai/xac-minh', { token: 'dung' }, null, 'xyz')).status, 400);
  const dung = await gui('/api/cong-khai/xac-minh', { token: 'dung' });
  assert.equal(dung.status, 200);
  const d = await dung.json();
  assert.match(d.ve, /^[\w-]+\.\d+\.[\w-]+$/);
  assert.ok(d.hetHan > Date.now() && d.hetHan <= Date.now() + HAN_VE_MS);
});

test('gửi đánh giá, phản ánh, báo vi phạm: thiếu vé -> 403 canXacMinh; có vé thì gửi được; vé của máy khác bị từ chối', async () => {
  for (const [duong, body] of [['/api/cong-khai/danh-gia', DANH_GIA], ['/api/cong-khai/phan-anh', { loai: 'gia-ca', noiDung: 'Quán ở bến thuyền bán giá cao gấp đôi niêm yết.' }],
    ['/api/cong-khai/danh-gia/3/bao', { lyDo: 'quang-cao' }]]) {
    const r = await gui(duong, body);
    assert.equal(r.status, 403, duong);
    assert.equal((await r.json()).canXacMinh, true);
  }
  const { ve } = await (await gui('/api/cong-khai/xac-minh', { token: 'dung' })).json();
  const r = await gui('/api/cong-khai/danh-gia', DANH_GIA, ve);
  assert.ok(r.status < 300, await r.text());
  assert.equal((await gui('/api/cong-khai/danh-gia', DANH_GIA, ve, MAY_KHAC)).status, 403);
});

test('đăng nhập cán bộ: không cần vé, kể cả tài khoản đã bị gõ sai nhiều lần', async () => {
  soLanSai = 0;
  const sai = await gui('/api/auth/login', { username: 'hung.nv', password: 'sai-mat-khau' });
  assert.equal(sai.status, 401);
  assert.equal((await sai.json()).canXacMinh, undefined);
  soLanSai = 5;
  const vao = await gui('/api/auth/login', { username: 'hung.nv', password: 'Tuong-Binh#2026Hiep' });
  assert.equal(vao.status, 200);
  assert.ok((await vao.json()).accessToken);
  soLanSai = 0;
});
