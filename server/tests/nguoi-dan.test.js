/**
 * KIỂM THỬ GIAI ĐOẠN 3 — phía người dân: phản ánh, ảnh, lộ trình, tin tức,
 * báo đánh giá. Không cần MySQL.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'node:crypto';
import { datBienMoiTruongHopLe } from './helpers-test.js';

datBienMoiTruongHopLe();
const { pool } = await import('../src/db.js');
const { signAccessToken } = await import('../src/lib/token.js');
const { requireAuth } = await import('../src/middleware/auth.js');
const congKhai = (await import('../src/routes/cong-khai.js')).default;
const quanTri = (await import('../src/routes/quan-tri.js')).default;
const { _kieuAnh } = await import('../src/routes/noi-dung.js');

let goi = [];
pool.query = async (sql, params = []) => {
  goi.push({ sql, params });
  if (/SELECT is_active FROM staff/i.test(sql)) return [[{ is_active: 1 }]];
  if (/SELECT id, xa_phuong_id FROM dia_diem WHERE id = \? AND hien = 1/i.test(sql)) return [params[0] === 'ho-tri-an' ? [{ id: 'ho-tri-an', xa_phuong_id: 5 }] : []];
  if (/SELECT id FROM danh_gia WHERE id = \? AND bi_an = 0/i.test(sql)) return [[{ id: params[0] }]];
  if (/SELECT id FROM dia_diem WHERE id IN/i.test(sql)) return [[{ id: 'ho-tri-an' }, { id: 'cu-lao-pho' }]];
  if (/SELECT id FROM dia_diem WHERE id = \?/i.test(sql)) return [[{ id: 'ho-tri-an' }]];
  if (/COUNT\(\*\) AS so FROM anh_dia_diem/i.test(sql)) return [[{ so: 0 }]];
  if (/FROM danh_gia g JOIN dia_diem d/i.test(sql)) return [[{ id: 3, dia_diem_id: 'ho-tri-an', ten: 'Hồ Trị An', ten_en: 'Tri An Lake', sao: 5,
    di_cung: 'gia-dinh', thoi_diem: '2026-08', nhan_xet: 'Hoàng hôn trên hồ rất đẹp.', ten_hien_thi: null, updated_at: '2026-09-01 10:00:00' }]];
  return [{ affectedRows: 1, insertId: 7 }];
};
pool.getConnection = async () => ({ query: pool.query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} });

const app = express(); app.set('trust proxy', 1); app.use(express.json());
app.use('/api/cong-khai', congKhai); app.use('/api/quan-tri', requireAuth, quanTri);
let may, goc;
before(async () => { may = app.listen(0); await new Promise((r) => may.once('listening', r)); goc = `http://127.0.0.1:${may.address().port}`; });
after(() => may.close());
const ve = signAccessToken({ id: 1, username: 'u1', role: 'admin', full_name: 'Cán bộ' });
const api = (duong, { method = 'GET', body, raw, kieu, token } = {}) => fetch(goc + duong, { method,
  headers: { 'Content-Type': kieu || 'application/json', 'X-Ma-Thiet-Bi': crypto.randomUUID(), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: raw ?? (body ? JSON.stringify(body) : undefined) });

test('phản ánh: thiếu loại, quá ngắn, từ ngữ thô tục đều bị chặn', async () => {
  assert.equal((await api('/api/cong-khai/phan-anh', { method: 'POST', body: { noiDung: 'Thuê thuyền bị tính giá gấp đôi.' } })).status, 400);
  assert.equal((await api('/api/cong-khai/phan-anh', { method: 'POST', body: { loai: 'gia-ca', noiDung: 'ngắn' } })).status, 400);
  assert.equal((await api('/api/cong-khai/phan-anh', { method: 'POST', body: { loai: 'gia-ca', noiDung: 'đồ chó chủ quán này nâng giá' } })).status, 400);
});

test('phản ánh hợp lệ -> 201, KHÔNG trả mã tra cứu cho người gửi; số hiệu nội bộ vẫn lưu', async () => {
  goi = [];
  const r = await api('/api/cong-khai/phan-anh', { method: 'POST', body: { loai: 'gia-ca', diaDiemId: 'ho-tri-an', noiDung: 'Thuê thuyền bị tính giá gấp đôi bảng giá niêm yết.', lienHe: '0912345678' } });
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { ok: true });
  const ghi = goi.find((g) => /INSERT INTO phan_anh/i.test(g.sql));
  assert.match(ghi.params[0], /^[A-HJ-NP-Z2-9]{8}$/, 'số hiệu nội bộ bỏ các ký tự dễ đọc nhầm 0/O, 1/I/L');
  assert.equal(ghi.params[3], 5, 'xã/phường lấy theo địa điểm');
  assert.ok(!ghi.params.includes('127.0.0.1'), 'không lưu IP thô');
});

test('không còn đường tra cứu phản ánh phía người dân', async () => {
  assert.equal((await api('/api/cong-khai/phan-anh/ABCD2345')).status, 404);
});

test('ảnh: nhận diện bằng byte đầu tệp, không tin Content-Type', () => {
  assert.equal(_kieuAnh(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), 'image/jpeg');
  assert.equal(_kieuAnh(Buffer.from('89504e470d0a1a0a0000000d', 'hex')), 'image/png');
  assert.equal(_kieuAnh(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
  assert.equal(_kieuAnh(Buffer.from('<svg onload=alert(1)></svg>')), null, 'SVG có thể chứa mã chạy — không nhận');
});

test('tải ảnh giả (Content-Type ảnh nhưng nội dung HTML) -> 400', async () => {
  const r = await api('/api/quan-tri/dia-diem/ho-tri-an/anh', { method: 'POST', raw: Buffer.from('<html><script>alert(1)</script></html>'), kieu: 'image/jpeg', token: ve });
  assert.equal(r.status, 400);
});

test('lộ trình cần ít nhất 2 điểm có thật; lưu theo đúng thứ tự gửi lên', async () => {
  assert.equal((await api('/api/quan-tri/lo-trinh', { method: 'POST', token: ve, body: { ten: 'X', diem: [{ id: 'ho-tri-an' }] } })).status, 400);
  const r0 = await api('/api/quan-tri/lo-trinh', { method: 'POST', token: ve, body: { ten: 'X', diem: [{ id: 'ho-tri-an' }, { id: 'khong-co' }] } });
  assert.match((await r0.json()).error, /khong-co/);
  goi = [];
  const r = await api('/api/quan-tri/lo-trinh', { method: 'POST', token: ve, body: { ten: 'Sông nước', diem: [{ id: 'cu-lao-pho', ngay: 1 }, { id: 'ho-tri-an', ngay: 2 }] } });
  assert.equal(r.status, 201);
  const ghi = goi.find((g) => /INSERT INTO lich_trinh_diem/i.test(g.sql));
  assert.deepEqual(ghi.params[0].map((d) => [d[0], d[1], d[2]]), [[1, 'cu-lao-pho', 1], [2, 'ho-tri-an', 2]]);
});

test('tin tức: ngày kết thúc trước ngày bắt đầu -> 400', async () => {
  const r = await api('/api/quan-tri/tin-tuc', { method: 'POST', token: ve, body: { loai: 'canh-bao', tieuDe: 'Mưa lớn', tuNgay: '2026-10-10', denNgay: '2026-10-01' } });
  assert.equal(r.status, 400);
});

test('xử lý xong phản ánh mà không trả lời người gửi -> 400', async () => {
  assert.equal((await api('/api/quan-tri/phan-anh/1', { method: 'PATCH', token: ve, body: { trangThai: 'da-xu-ly' } })).status, 400);
  assert.equal((await api('/api/quan-tri/phan-anh/1', { method: 'PATCH', token: ve, body: { trangThai: 'da-xu-ly', phanHoi: 'Đã yêu cầu hoàn tiền.' } })).status, 200);
});

test('báo đánh giá: lưu bản băm mã thiết bị, không lưu mã thô', async () => {
  goi = [];
  const may = crypto.randomUUID();
  const r = await fetch(goc + '/api/cong-khai/danh-gia/3/bao', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Ma-Thiet-Bi': may }, body: JSON.stringify({ lyDo: 'quang-cao' }) });
  assert.equal(r.status, 200);
  const ghi = goi.find((g) => /INSERT IGNORE INTO bao_danh_gia/i.test(g.sql));
  assert.ok(!ghi.params.includes(may)); assert.match(ghi.params[1], /^[a-f0-9]{64}$/);
});

test('đánh giá mới nhất: chỉ bài chưa ẩn, có nhận xét, của điểm đang hiện; giới hạn tối đa 12', async () => {
  goi = [];
  const r = await api('/api/cong-khai/danh-gia/moi-nhat?gioiHan=999');
  assert.equal(r.status, 200);
  const [x] = await r.json();
  assert.deepEqual(Object.keys(x).sort(), ['diCung', 'diaDiemId', 'id', 'luc', 'nhanXet', 'sao', 'ten', 'tenDiem', 'tenDiemEn', 'thoiDiem'],
    'không trả mã thiết bị hay IP băm');
  const q = goi.find((g) => /FROM danh_gia g JOIN dia_diem d/i.test(g.sql));
  assert.match(q.sql, /g\.bi_an = 0/); assert.match(q.sql, /d\.hien = 1/);
  assert.deepEqual(q.params, [12]);
});

test('lộ trình lưu phương tiện; địa điểm chỉ nhận vùng hợp lệ', async () => {
  goi = [];
  await api('/api/quan-tri/lo-trinh', { method: 'POST', token: ve, body: { ten: 'Sông nước', phuongTien: 'Ô tô hoặc xe máy', diem: [{ id: 'cu-lao-pho' }, { id: 'ho-tri-an' }] } });
  assert.equal(goi.find((g) => /INSERT INTO lich_trinh SET/i.test(g.sql)).params[0].phuong_tien, 'Ô tô hoặc xe máy');
  const sua = async (vung) => { goi = [];
    await api('/api/quan-tri/dia-diem/ho-tri-an', { method: 'PUT', token: ve, body: { ten: 'Hồ Trị An', loai: 'thien-nhien', lat: 11.18, lng: 107.15, vung } });
    return goi.find((g) => /UPDATE dia_diem SET/i.test(g.sql)).params[0].vung; };
  assert.equal(await sua('phia-bac'), 'phia-bac');
  assert.equal(await sua('vung-la'), null);
});
