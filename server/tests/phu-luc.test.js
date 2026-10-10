/**
 * KIỂM THỬ PHỤ LỤC THỐNG KÊ — đọc số kiểu Việt Nam, kiểm tra dòng, nhập Excel,
 * dựng bảng xuất, và các chốt chặn (kỳ khoá, xã đã chốt). Không cần MySQL.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import { datBienMoiTruongHopLe } from './helpers-test.js';

datBienMoiTruongHopLe();
const { docSo, docNgay, docDong, layBang, tachTenXa, raDong } = await import('../src/lib/phu-luc.js');
const { docTepExcel, taoTepMau } = await import('../src/lib/excel-nhap.js');
const { dungBang, xuatExcel, xuatWord } = await import('../src/lib/xuat-phu-luc.js');
const { pool } = await import('../src/db.js');
const { signAccessToken } = await import('../src/lib/token.js');
const { requireAuth } = await import('../src/middleware/auth.js');
const quanTri = (await import('../src/routes/quan-tri.js')).default;

/* ======================= ĐỌC SỐ ======================= */
test('đọc đúng mọi kiểu ghi số có trong bản phụ lục giấy', () => {
  const dung = { '250.000': 250000, '1.854,4 tỷ đồng': 1854.4, '359.9 tỷ': 359.9, '0,513 tỉ': 0.513, '9450 lượt': 9450,
    '72.952 người': 72952, '40 tỉ': 40, '12.345,67': 12345.67, '1,234,567': 1234567, Không: 0 };
  for (const [vao, ra] of Object.entries(dung)) assert.equal(docSo(vao).gt, ra, vao);
  assert.equal(docSo(359.9).gt, 359.9, 'ô số của Excel giữ nguyên');
  assert.equal(docSo('-').gt, null, 'gạch ngang là bỏ trống');
});

test('chữ giải thích lẫn trong ô số bị chặn, kèm lời hướng dẫn', () => {
  const r = docSo('Tổng mức đầu tư 49 tỷ đồng.');
  assert.ok(r.loi && /cột ghi chú/.test(r.loi));
  assert.ok(docSo('-5').loi, 'số âm bị chặn');
});

test('diện tích ghi m2 tự đổi ra ha', () => {
  assert.equal(docSo('16.305,40m2', { m2: true }).gt, 1.6305);
  assert.equal(docSo('50,47ha', { m2: true }).gt, 50.47);
});

test('đọc ngày nhiều kiểu, chặn ngày không có thật', () => {
  assert.equal(docNgay('27/8/2025').gt, '2025-08-27');
  assert.equal(docNgay(new Date(Date.UTC(2025, 9, 13))).gt, '2025-10-13');
  assert.ok(docNgay('31/2/2025').loi);
  assert.ok(docNgay('2026').loi);
});

test('tách tên xã/phường, bắt buộc ghi rõ loại đơn vị', () => {
  assert.deepEqual(tachTenXa('Phường Trấn Biên'), { loai: 'phuong', ten: 'Trấn Biên' });
  assert.deepEqual(tachTenXa('đặc khu Phú Quý'), { loai: 'dac-khu', ten: 'Phú Quý' });
  assert.equal(tachTenXa('Trấn Biên'), null);
});

/* ======================= KIỂM TRA DÒNG ======================= */
test('bảng khách: thiếu số khách bị chặn; tổng do máy tính, không nhận từ người nhập', () => {
  const b = layBang('khach');
  assert.match(docDong(b, { quoc_te: '10' }).loi, /khách nội địa/);
  const { du } = docDong(b, { quoc_te: '28.200', noi_dia: '112.000', tong: 999 });
  assert.deepEqual(du, { quoc_te: 28200, noi_dia: 112000 });
  assert.equal(raDong(b, { id: 1, xa_phuong_id: 1, ky_id: 2, quoc_te: 28200, noi_dia: 112000 }).tong, 140200);
});

test('bảng khách: số lẻ trong ô số nguyên bị chặn', () => {
  assert.match(docDong(layBang('khach'), { quoc_te: '1,5', noi_dia: 1 }).loi, /số nguyên/);
});

test('ô chọn nhận cả mã, cả nhãn, cả cách ghi tắt', () => {
  const b = layBang('luu-tru');
  assert.equal(docDong(b, { ten: 'A', hang_sao: '5 sao' }).du.hang_sao, 5);
  assert.equal(docDong(b, { ten: 'A', hang_sao: 'Chưa xếp hạng' }).du.hang_sao, 0);
  assert.equal(docDong(b, { ten: 'A' }).du.hang_sao, 0, 'bỏ trống thì lấy mặc định');
  assert.match(docDong(b, { ten: 'A', hang_sao: '7 sao' }).loi, /không có trong danh sách/);
  assert.equal(docDong(layBang('du-an'), { ten: 'A', trang_thai: 'thu hồi' }).du.trang_thai, 'thu-hoi');
});

/* ======================= NHẬP EXCEL ======================= */
async function tepExcel(dong) {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Sheet1');
  dong.forEach((d) => ws.addRow(d));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('nhập Excel: tìm dòng tiêu đề, khớp cột theo tên dù có STT và cột lạ', async () => {
  const buf = await tepExcel([['Bảng thống kê dự án'], ['STT', 'Xã/ phường', 'Dự án', 'Số vốn đầu tư (Tỷ đồng)', 'Cột lạ'],
    [1, 'Xã An Viễn', 'Khu A', '1.854,4 tỷ đồng', 'x'], [], [2, 'Xã An Viễn', 'Khu B', 49, '']]);
  const { dong, cotBoQua } = await docTepExcel(buf, layBang('du-an'));
  assert.equal(dong.length, 2, 'dòng trống bị bỏ qua');
  assert.equal(dong[0].so, 3, 'báo đúng số dòng người dùng thấy trong Excel');
  assert.equal(dong[0].xa, 'Xã An Viễn');
  assert.equal(dong[0].vao.von_ty, '1.854,4 tỷ đồng');
  assert.deepEqual(cotBoQua, ['Cột lạ']);
});

test('nhập Excel: tệp không phải .xlsx và tệp không có tiêu đề đều báo rõ', async () => {
  await assert.rejects(docTepExcel(Buffer.from('xin chao'), layBang('khach')), /không phải Excel/);
  await assert.rejects(docTepExcel(await tepExcel([['a', 'b'], [1, 2]]), layBang('khach')), /dòng tiêu đề/);
});

test('tệp mẫu đọc ngược lại được bằng chính bộ đọc', async () => {
  const buf = await taoTepMau(layBang('luu-tru'), [{ id: 1, ten: 'Trấn Biên', loai: 'phuong', hien: 1 }], null);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('Nhập liệu');
  ws.addRow(['Phường Trấn Biên', 'Resort X', 'Số 1', 'Nguyễn A', 'Đạt tiêu chuẩn 4 sao', 'Có']);
  const { dong } = await docTepExcel(Buffer.from(await wb.xlsx.writeBuffer()), layBang('luu-tru'));
  assert.equal(dong.length, 1);
  const { du } = docDong(layBang('luu-tru'), dong[0].vao);
  assert.equal(du.hang_sao, 4); assert.equal(du.cong_khai, true);
});

/* ======================= DỰNG BẢNG XUẤT ======================= */
test('xuất: STT máy đánh lại theo từng xã, xã trống ghi rõ trạng thái, hạng sao tách thành ô X', () => {
  const dsXa = [{ id: 1, ten: 'Trấn Biên', loai: 'phuong' }, { id: 2, ten: 'La Ngà', loai: 'xa' }, { id: 3, ten: 'Bom Bo', loai: 'xa' }];
  const dong = [{ id: 7, xa_phuong_id: 1, ten: 'A', hang_sao: 4 }, { id: 9, xa_phuong_id: 1, ten: 'B', hang_sao: 0 }, { id: 8, xa_phuong_id: 2, ten: 'C', hang_sao: 5 }];
  const b = dungBang(layBang('luu-tru'), { dsXa, dong, kyDs: [{ id: 5, ten: 'Kỳ' }], khongPhatSinh: new Set(['5:3']) });
  assert.deepEqual(b.nhom[0].dong.map((d) => d.o[0]), ['1', '2']);
  assert.equal(b.nhom[1].dong[0].o[0], '1');
  assert.equal(b.nhom[2].dong[0].ghiChu, 'Không phát sinh');
  assert.ok(b.cot.some((c) => c.nhom === 'Xếp loại tiêu chuẩn' && c.nhan === '4 sao'));
  assert.ok(!b.cot.some((c) => /Hiện cho người dân/.test(c.nhan)), 'cờ nội bộ không vào tệp xuất');
  const x4 = b.cot.findIndex((c) => c.nhan === '4 sao') - 1;
  assert.equal(b.nhom[0].dong[0].o[x4], 'X');
});

test('xuất bảng khách hai kỳ: mỗi kỳ một dòng tổng, không cộng lẫn hai kỳ', () => {
  const kyDs = [{ id: 2, ten: '6 tháng 2026' }, { id: 1, ten: 'Năm 2025' }];
  const dong = [{ xa_phuong_id: 1, ky_id: 2, quoc_te: 10, noi_dia: 20 }, { xa_phuong_id: 1, ky_id: 1, quoc_te: 100, noi_dia: 200 }];
  const b = dungBang(layBang('khach'), { dsXa: [{ id: 1, ten: 'A', loai: 'xa' }], dong: dong.map((r) => raDong(layBang('khach'), r)), kyDs });
  assert.equal(b.tong.length, 2);
  assert.deepEqual(b.tong[0].o.slice(1, 4), [30, 10, 20]);
  assert.deepEqual(b.tong[1].o.slice(1, 4), [300, 100, 200]);
});

test('tệp Word và Excel dựng được và là tệp nén hợp lệ', async () => {
  const b = dungBang(layBang('du-an'), { dsXa: [{ id: 1, ten: 'A', loai: 'xa' }], dong: [{ xa_phuong_id: 1, ten: 'Dự án\nhai dòng', von_ty: 1854.4 }], kyDs: [{ id: 1, ten: 'K' }] });
  const meta = { kyTen: 'K', nguoiXuat: 'thu', luc: 'nay', mucDo: 'TÀI LIỆU NỘI BỘ' };
  for (const buf of [await xuatExcel([b], meta), await xuatWord([b], meta)]) assert.equal(buf.subarray(0, 2).toString(), 'PK');
});

/* ======================= CHỐT CHẶN QUA HTTP ======================= */
let trangThaiKy = { khoa: 0 }, chot = null, goi = [];
pool.query = async (sql, params = []) => {
  goi.push({ sql, params });
  if (/SELECT is_active FROM staff/i.test(sql)) return [[{ is_active: 1 }]];
  if (/FROM ky_bao_cao WHERE id = \?/i.test(sql)) return [[{ id: 2, ten: '6 tháng đầu năm 2026', tu_ngay: '2026-01-01', den_ngay: '2026-06-30', ...trangThaiKy }]];
  if (/FROM xa_phuong WHERE id = \?/i.test(sql)) return [[{ id: 1, ten: 'Trấn Biên', loai: 'phuong', hien: 1 }]];
  if (/SELECT trang_thai FROM nop_bao_cao/i.test(sql)) return [chot ? [{ trang_thai: chot }] : []];
  if (/SELECT id, xoa_luc FROM bc_khach/i.test(sql)) return [[]];
  if (/COUNT\(\*\) AS so FROM bc_/i.test(sql)) return [[]];
  if (/FROM khong_phat_sinh WHERE ky_id = \? AND xa_phuong_id/i.test(sql)) return [[]];
  return [{ affectedRows: 1, insertId: 41 }];
};
const app = express(); app.use(express.json()); app.use('/api/quan-tri', requireAuth, quanTri);
let may, goc;
before(async () => { may = app.listen(0); await new Promise((r) => may.once('listening', r)); goc = `http://127.0.0.1:${may.address().port}`; });
after(() => may.close());
const ve = signAccessToken({ id: 1, username: 'u1', role: 'handler', full_name: 'Cán bộ' });
const goiApi = (duong, method = 'GET', body) => fetch(goc + '/api/quan-tri/bao-cao' + duong, { method,
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ve }, body: body ? JSON.stringify(body) : undefined });

test('nhập số khách hợp lệ -> 201 và ghi lịch sử sửa', async () => {
  trangThaiKy = { khoa: 0 }; chot = null; goi = [];
  const r = await goiApi('/bang/khach', 'POST', { ky_id: 2, xa_phuong_id: 1, quoc_te: '28.200', noi_dia: '112.000' });
  assert.equal(r.status, 201);
  const ghi = goi.find((g) => /INSERT INTO bc_khach/i.test(g.sql));
  assert.equal(ghi.params[0].quoc_te, 28200);
  assert.ok(goi.some((g) => /INSERT INTO lich_su_sua/i.test(g.sql)), 'phải ghi lịch sử');
});

test('kỳ đã khoá -> 409, không ghi gì', async () => {
  trangThaiKy = { khoa: 1 }; chot = null; goi = [];
  const r = await goiApi('/bang/khach', 'POST', { ky_id: 2, xa_phuong_id: 1, quoc_te: 1, noi_dia: 1 });
  assert.equal(r.status, 409);
  assert.match((await r.json()).error, /đã khoá/);
  assert.ok(!goi.some((g) => /INSERT INTO bc_khach/i.test(g.sql)));
});

test('xã đã chốt báo cáo -> 409 cho tới khi mở lại', async () => {
  trangThaiKy = { khoa: 0 }; chot = 'da-chot';
  const r = await goiApi('/bang/khach', 'POST', { ky_id: 2, xa_phuong_id: 1, quoc_te: 1, noi_dia: 1 });
  assert.equal(r.status, 409);
  assert.match((await r.json()).error, /đã chốt/);
});

test('chưa nhập đủ thì chưa chốt được', async () => {
  trangThaiKy = { khoa: 0 }; chot = null;
  const r = await goiApi('/nop/2/1/chot', 'POST');
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /bảng 1/);
});

test('mở lại báo cáo phải ghi lý do', async () => {
  trangThaiKy = { khoa: 0 };
  assert.equal((await goiApi('/nop/2/1/mo-lai', 'POST', { lyDo: '' })).status, 400);
  assert.equal((await goiApi('/nop/2/1/mo-lai', 'POST', { lyDo: 'Xã báo lại số liệu' })).status, 200);
});

test('bảng không tồn tại -> 404; tên bảng không bao giờ lấy từ người gửi vào câu SQL', async () => {
  goi = [];
  assert.equal((await goiApi('/bang/staff')).status, 404);
  assert.equal((await goiApi('/bang/khach%3B%20DROP%20TABLE%20staff')).status, 404);
  assert.ok(!goi.some((g) => /DROP/i.test(g.sql)));
});
