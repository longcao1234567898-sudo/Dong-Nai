/**
 * KIỂM THỬ MÁY CHỦ DU LỊCH ĐỒNG NAI
 *
 * Chạy đường dẫn THẬT qua HTTP, KHÔNG cần MySQL: thay pool.query bằng hàm giả
 * trả lời theo câu SQL — cùng cách bộ kiểm thử của Điểm Chạm An Ninh làm.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { datBienMoiTruongHopLe } from './helpers-test.js';

datBienMoiTruongHopLe();
const { pool } = await import('../src/db.js');
const { signAccessToken } = await import('../src/lib/token.js');
const { requireAuth, xoaDemTrangThai } = await import('../src/middleware/auth.js');
const congKhai = (await import('../src/routes/cong-khai.js')).default;
const quanTri = (await import('../src/routes/quan-tri.js')).default;
const { xoaDemCongKhai } = await import('../src/routes/cong-khai.js');

/* -------- Cơ sở dữ liệu giả -------- */
let goi = [];                 // mọi câu SQL đã chạy, để kiểm tra sau
let trangThai = { 1: 1, 2: 1, 3: 1, 9: 0 };   // staff id -> is_active
pool.query = async (sql, params = []) => {
  goi.push({ sql, params });
  if (/SELECT is_active FROM staff/i.test(sql)) return [[{ is_active: trangThai[params[0]] ?? 0 }]];
  if (/FROM dia_diem d LEFT JOIN danh_gia/i.test(sql)) return [[{ id: 'ho-tri-an', ten: 'Hồ Trị An', loai: 'thien-nhien', mo_ta: 'Hồ', dia_chi: 'Xã La Ngà',
    lat: '11.18', lng: '107.15', sdt: null, web: null, gio_mo: null, noi_bat: 1, so_dg: 2, sao_tb: '4.5', tb_canh_quan: '5', tb_dich_vu: null, tb_ve_sinh: null, tb_gia_ca: null, s5: 1, s4: 1, s3: 0, s2: 0, s1: 0 }]];
  if (/SELECT id FROM dia_diem WHERE id = \? AND hien = 1/i.test(sql)) return [params[0] === 'ho-tri-an' ? [{ id: 'ho-tri-an' }] : []];
  if (/SELECT id FROM dia_diem WHERE id = \?/i.test(sql)) return [[]];
  if (/FROM danh_gia WHERE dia_diem_id = \? AND ma_thiet_bi/i.test(sql)) return [[]];
  if (/FROM staff ORDER BY id/i.test(sql)) return [[{ id: 1, full_name: 'Quản trị', username: 'u1', role: 'admin', is_active: 1, failed_attempts: 0, locked_until: null, last_login: null }]];
  return [{ affectedRows: 1, insertId: 1 }];
};

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/cong-khai', congKhai);
app.use('/api/quan-tri', requireAuth, quanTri);
let may, goc;
before(async () => { may = app.listen(0); await new Promise((r) => may.once('listening', r)); goc = `http://127.0.0.1:${may.address().port}`; });
after(() => may.close());

const ve = (id, role) => signAccessToken({ id, username: 'u' + id, role, full_name: 'Cán bộ ' + id });
const goiApi = (duong, { method = 'GET', body, token, may: maMay } = {}) => fetch(goc + duong, { method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(maMay ? { 'X-Ma-Thiet-Bi': maMay } : {}) },
  body: body ? JSON.stringify(body) : undefined });
const MAY = crypto.randomUUID();

/* ======================= CÔNG KHAI ======================= */
test('danh sách điểm đến trả đúng dạng, số liệu đổi sang kiểu số', async () => {
  xoaDemCongKhai();
  const r = await goiApi('/api/cong-khai/dia-diem'); const ds = await r.json();
  assert.equal(r.status, 200);
  assert.equal(ds[0].id, 'ho-tri-an');
  assert.equal(ds[0].saoTb, 4.5);
  assert.deepEqual(ds[0].phanBo, [1, 1, 0, 0, 0]);
  assert.equal(ds[0].tieuChi.dichVu, null, 'tiêu chí chưa ai chấm phải là null, không phải 0');
});

test('gửi đánh giá thiếu mã thiết bị -> 400', async () => {
  const r = await goiApi('/api/cong-khai/danh-gia', { method: 'POST', body: { diaDiemId: 'ho-tri-an', sao: 5 } });
  assert.equal(r.status, 400);
});

test('gửi đánh giá số sao ngoài 1-5 -> 400', async () => {
  for (const sao of [0, 6, 4.5, 'nam']) {
    const r = await goiApi('/api/cong-khai/danh-gia', { method: 'POST', may: MAY, body: { diaDiemId: 'ho-tri-an', sao } });
    assert.equal(r.status, 400, `sao = ${sao} phải bị chặn`);
  }
});

test('đánh giá địa điểm không tồn tại hoặc đang ẩn -> 404', async () => {
  const r = await goiApi('/api/cong-khai/danh-gia', { method: 'POST', may: MAY, body: { diaDiemId: 'khong-co', sao: 4 } });
  assert.equal(r.status, 404);
});

test('đánh giá hợp lệ: ghi đè theo thiết bị, và KHÔNG lưu mã thiết bị thô', async () => {
  goi = [];
  const r = await goiApi('/api/cong-khai/danh-gia', { method: 'POST', may: MAY,
    body: { diaDiemId: 'ho-tri-an', sao: 5, tieuChi: { canhQuan: 5, dichVu: 9 }, diCung: 'ban-be', thoiDiem: '2026-08', nhanXet: '<b>Đẹp</b>', ten: 'Lan' } });
  assert.equal(r.status, 201);
  const ghi = goi.find((g) => /INSERT INTO danh_gia/i.test(g.sql));
  assert.ok(/ON DUPLICATE KEY UPDATE/i.test(ghi.sql), 'gửi lại phải sửa bài cũ, không tạo bài mới');
  assert.ok(!ghi.params.includes(MAY), 'mã thiết bị thô không được lưu');
  assert.match(ghi.params[1], /^[a-f0-9]{64}$/, 'chỉ lưu bản băm');
  assert.equal(ghi.params[5], null, 'tiêu chí 9 sao không hợp lệ phải thành null');
});

test('tra đánh giá của mình gửi bản băm chứ không gửi mã thô', async () => {
  goi = [];
  await goiApi('/api/cong-khai/dia-diem/ho-tri-an/cua-toi', { may: MAY });
  const tra = goi.find((g) => /ma_thiet_bi = \?/i.test(g.sql));
  assert.ok(tra && !tra.params.includes(MAY));
});

/* ======================= QUẢN TRỊ ======================= */
test('không có vé đăng nhập -> 401', async () => {
  const r = await goiApi('/api/quan-tri/tong-quan');
  assert.equal(r.status, 401);
});

test('tài khoản đã khoá dùng vé còn hạn -> 401 ngay', async () => {
  xoaDemTrangThai();
  const r = await goiApi('/api/quan-tri/tong-quan', { token: ve(9, 'admin') });
  assert.equal(r.status, 401);
});

test('cán bộ (handler) không được thêm địa điểm -> 403', async () => {
  xoaDemTrangThai();
  const r = await goiApi('/api/quan-tri/dia-diem', { method: 'POST', token: ve(3, 'handler'), body: { ten: 'X', loai: 'di-tich', lat: 11, lng: 107 } });
  assert.equal(r.status, 403);
});

test('đảo ngược vĩ độ và kinh độ -> 400 kèm lời nhắc', async () => {
  const r = await goiApi('/api/quan-tri/dia-diem', { method: 'POST', token: ve(2, 'manager'), body: { ten: 'Thử', loai: 'di-tich', lat: 106.8, lng: 10.96 } });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /đảo ngược/);
});

test('chỉ huy thêm địa điểm hợp lệ -> 201, mã sinh từ tên không dấu', async () => {
  const r = await goiApi('/api/quan-tri/dia-diem', { method: 'POST', token: ve(2, 'manager'), body: { ten: 'Làng bưởi Tân Triều', loai: 'dac-san', lat: 10.95, lng: 106.88 } });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).id, 'lang-buoi-tan-trieu');
});

test('nhập lượt khách sai định dạng tháng -> 400', async () => {
  const r = await goiApi('/api/quan-tri/luot-khach', { method: 'PUT', token: ve(3, 'handler'), body: { diaDiemId: 'ho-tri-an', thang: '08/2026', noiDia: 10 } });
  assert.equal(r.status, 400);
});

test('chỉ quản trị viên xem được danh sách cán bộ', async () => {
  assert.equal((await goiApi('/api/quan-tri/can-bo', { token: ve(2, 'manager') })).status, 403);
  assert.equal((await goiApi('/api/quan-tri/can-bo', { token: ve(1, 'admin') })).status, 200);
});

test('không tự khoá được tài khoản của chính mình', async () => {
  const r = await goiApi('/api/quan-tri/can-bo/1', { method: 'PATCH', token: ve(1, 'admin'), body: { hoatDong: false } });
  assert.equal(r.status, 400);
});

test('khoá tài khoản khác thì thu hồi luôn mọi phiên của người đó', async () => {
  goi = [];
  const r = await goiApi('/api/quan-tri/can-bo/2', { method: 'PATCH', token: ve(1, 'admin'), body: { hoatDong: false } });
  assert.equal(r.status, 200);
  assert.ok(goi.some((g) => /DELETE FROM refresh_tokens WHERE staff_id/i.test(g.sql) && g.params[0] === 2));
});
