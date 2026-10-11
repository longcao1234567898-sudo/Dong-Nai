/**
 * KIỂM THỬ CỔNG XÁC MINH — ô Turnstile chỉ ở cổng vào, các đường gửi kiểm vé.
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
const { capVe, kiemVe, nhomIp, HAN_VE_MS } = await import('../src/lib/turnstile.js');
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

const gui = (duong, body, ve) => fetch(goc + duong, { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Ma-Thiet-Bi': '0123456789abcdef0123456789abcdef', ...(ve ? { 'X-Xac-Minh': ve } : {}) },
  body: JSON.stringify(body) });
const DANH_GIA = { diaDiemId: 'ho-tri-an', sao: 5 };

test('vé: đúng IP thì nhận, khác IP, sửa một ký tự hay quá 12 giờ thì từ chối', () => {
  const { ve, hetHan } = capVe('203.0.113.7', 1_000_000);
  assert.equal(hetHan, 1_000_000 + HAN_VE_MS);
  assert.ok(kiemVe(ve, '203.0.113.7', { bayGio: 1_000_000 + 60_000 }));
  assert.ok(!kiemVe(ve, '203.0.113.8', { bayGio: 1_000_000 + 60_000 }));
  assert.ok(!kiemVe(ve.slice(0, -1) + (ve.endsWith('A') ? 'B' : 'A'), '203.0.113.7', { bayGio: 1_000_000 }));
  assert.ok(!kiemVe(ve, '203.0.113.7', { bayGio: 1_000_000 + HAN_VE_MS + 1 }));
  assert.ok(!kiemVe(ve, '203.0.113.7', { bayGio: 1_000_000 + 11 * 60_000, toiDaTuoiMs: 10 * 60_000 }), 'cần vé mới thì vé 11 phút tuổi bị từ chối');
  assert.ok(!kiemVe('', '203.0.113.7') && !kiemVe('a.b', '203.0.113.7'));
});

test('vé: IPv6 tính theo dải /64 — điện thoại đổi đuôi địa chỉ không phải kiểm tra lại', () => {
  assert.equal(nhomIp('2001:db8:abcd:12:1:2:3:4'), '2001:db8:abcd:12::/64');
  assert.equal(nhomIp('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(nhomIp('::ffff:198.51.100.4'), '198.51.100.4');
  const { ve } = capVe('2001:db8:abcd:12::aaaa');
  assert.ok(kiemVe(ve, '2001:db8:abcd:12:ffff:1:2:3'));
  assert.ok(!kiemVe(ve, '2001:db8:abcd:13::aaaa'));
});

test('cổng vào: mã Turnstile đúng đổi được vé, mã sai bị từ chối', async () => {
  const sai = await gui('/api/cong-khai/xac-minh', { token: 'sai' });
  assert.equal(sai.status, 400);
  const dung = await gui('/api/cong-khai/xac-minh', { token: 'dung' });
  assert.equal(dung.status, 200);
  const d = await dung.json();
  assert.match(d.ve, /^[\w-]+\.\d+\.[\w-]+$/);
  assert.ok(d.hetHan > Date.now());
});

test('gửi đánh giá, phản ánh, báo vi phạm: thiếu vé -> 403 canXacMinh; có vé thì không cần mã Turnstile nào nữa', async () => {
  for (const [duong, body] of [['/api/cong-khai/danh-gia', DANH_GIA], ['/api/cong-khai/phan-anh', { loai: 'gia-ca', noiDung: 'Quán ở bến thuyền bán giá cao gấp đôi niêm yết.' }],
    ['/api/cong-khai/danh-gia/3/bao', { lyDo: 'quang-cao' }]]) {
    const r = await gui(duong, body);
    assert.equal(r.status, 403, duong);
    assert.equal((await r.json()).canXacMinh, true);
  }
  const { ve } = await (await gui('/api/cong-khai/xac-minh', { token: 'dung' })).json();
  const r = await gui('/api/cong-khai/danh-gia', DANH_GIA, ve);
  assert.ok(r.status < 300, await r.text());
});

test('đăng nhập: thiếu vé -> 403; có vé thì sai mật khẩu báo 401 bình thường, không còn ô xác minh riêng', async () => {
  soLanSai = 0;
  const khongVe = await gui('/api/auth/login', { username: 'hung.nv', password: 'sai-mat-khau' });
  assert.equal(khongVe.status, 403);
  assert.equal((await khongVe.json()).canXacMinh, true);
  const { ve } = await (await gui('/api/cong-khai/xac-minh', { token: 'dung' })).json();
  const sai = await gui('/api/auth/login', { username: 'hung.nv', password: 'sai-mat-khau' }, ve);
  const d = await sai.json();
  assert.equal(sai.status, 401);
  assert.equal(d.canCaptcha, undefined);
});

test('tài khoản đã bị gõ sai 3 lần: vé cũ hơn 10 phút bị đòi qua cổng lại, vé mới thì vào được', async () => {
  soLanSai = 3;
  const cu = capVe('127.0.0.1', Date.now() - 20 * 60_000).ve;
  const r = await gui('/api/auth/login', { username: 'hung.nv', password: 'Tuong-Binh#2026Hiep' }, cu);
  assert.equal(r.status, 403);
  assert.equal((await r.json()).canXacMinh, true);
  const { ve } = await (await gui('/api/cong-khai/xac-minh', { token: 'dung' })).json();
  const vao = await gui('/api/auth/login', { username: 'hung.nv', password: 'Tuong-Binh#2026Hiep' }, ve);
  assert.equal(vao.status, 200);
  assert.ok((await vao.json()).accessToken);
  soLanSai = 0;
});
