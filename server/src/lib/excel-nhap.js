/**
 * NHẬP EXCEL — đọc tệp xã/phường điền theo mẫu, và tạo tệp mẫu để tải về.
 *
 * Không bắt cột phải đúng thứ tự: máy tìm dòng tiêu đề trong 10 dòng đầu rồi
 * khớp từng cột theo TÊN (bỏ dấu, bỏ hoa thường), nên tệp tự soạn, thêm cột
 * STT hay đảo cột vẫn đọc được. Cột không nhận ra thì bỏ qua và báo lại.
 */
import ExcelJS from 'exceljs';
import { chuanHoa, tenXa } from './phu-luc.js';

export class LoiNhap extends Error {}

const NHAN_XA = ['xaphuong', 'xa', 'phuong', 'xaphuongdackhu', 'donvi', 'diaban'];
const TOI_DA_DONG = 2000;

/** Giá trị thô của một ô Excel: số, chữ, ngày, hoặc null. */
function giaTriO(o) {
  const v = o?.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.trim() || null;
  if (v.richText) return v.richText.map((x) => x.text).join('').trim() || null;
  if ('result' in v) return v.result ?? null;                     // ô công thức: lấy kết quả
  if (v.text !== undefined) return String(v.text).trim() || null; // ô có liên kết
  if (v.error) return null;
  return String(o.text ?? '').trim() || null;
}

/** Cột nào ứng với trường nào: khớp nhãn, mã cột, hoặc nhãn bắt đầu giống nhau. */
function khopCot(bang, tieuDe) {
  const c = chuanHoa(tieuDe);
  if (!c) return null;
  if (NHAN_XA.includes(c)) return '__xa';
  const ds = bang.truong.filter((t) => t.kieu !== 'tinh');
  return (ds.find((t) => chuanHoa(t.nhan) === c || chuanHoa(t.k) === c)
    || ds.find((t) => c.length >= 4 && (chuanHoa(t.nhan).startsWith(c) || c.startsWith(chuanHoa(t.nhan)))))?.k || null;
}

/**
 * Đọc tệp .xlsx. Trả { dong: [{ so, xa, vao }], cotBoQua: [...] }.
 *   so   số dòng trong Excel (để báo lỗi đúng dòng người dùng thấy)
 *   xa   chữ ở cột xã/phường (có thể trống)
 *   vao  giá trị thô theo mã trường
 */
export async function docTepExcel(buf, bang) {
  if (!buf?.length) throw new LoiNhap('Chưa chọn tệp.');
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new LoiNhap('Tệp không phải Excel .xlsx. Mở tệp bằng Excel, chọn Lưu thành → Excel Workbook (.xlsx) rồi tải lại.');
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buf); } catch { throw new LoiNhap('Không đọc được tệp Excel. Tệp có thể bị hỏng hoặc đặt mật khẩu.'); }

  const ws = wb.worksheets.find((w) => w.state === 'visible' && !/huongdan|danhmuc/.test(chuanHoa(w.name))) || wb.worksheets[0];
  if (!ws) throw new LoiNhap('Tệp không có trang tính nào.');

  /* Dòng tiêu đề: dòng đầu tiên trong 10 dòng khớp được nhiều cột nhất (ít nhất 1). */
  let dongTieuDe = 0, cot = {};
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const thu = {};
    ws.getRow(r).eachCell((o, c) => { const k = khopCot(bang, giaTriO(o)); if (k && !Object.values(thu).includes(k)) thu[c] = k; });
    if (Object.keys(thu).length > Object.keys(cot).length) { cot = thu; dongTieuDe = r; }
  }
  const coTruong = Object.values(cot).filter((k) => k !== '__xa');
  if (!coTruong.length) {
    throw new LoiNhap(`Không tìm thấy dòng tiêu đề. Dòng tiêu đề cần có tên cột như: ${bang.truong.filter((t) => t.kieu !== 'tinh').map((t) => t.nhan).join(', ')}. Tải tệp mẫu để xem.`);
  }
  const cotBoQua = [];
  ws.getRow(dongTieuDe).eachCell((o, c) => { const v = giaTriO(o); if (v && !cot[c] && !/^(stt|tt|sothutu)$/.test(chuanHoa(v))) cotBoQua.push(String(v)); });

  const dong = [];
  for (let r = dongTieuDe + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const vao = {}; let xa = null, coGi = false;
    for (const [c, k] of Object.entries(cot)) {
      const v = giaTriO(row.getCell(Number(c)));
      if (v !== null && v !== '') coGi = true;
      if (k === '__xa') xa = v === null ? null : String(v); else vao[k] = v;
    }
    if (!coGi) continue;
    if (dong.length >= TOI_DA_DONG) throw new LoiNhap(`Tệp có hơn ${TOI_DA_DONG} dòng. Chia nhỏ tệp rồi nhập từng phần.`);
    dong.push({ so: r, xa, vao });
  }
  return { dong, cotBoQua };
}

/** Tạo tệp mẫu: trang "Nhập liệu" có danh sách chọn, trang "Hướng dẫn", trang danh mục ẩn. */
export async function taoTepMau(bang, xaPhuong, ky) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Du lịch Đồng Nai';
  const ws = wb.addWorksheet('Nhập liệu', { views: [{ state: 'frozen', ySplit: 1 }] });
  const dm = wb.addWorksheet('Danh mục', { state: 'veryHidden' });
  const truong = bang.truong.filter((t) => t.kieu !== 'tinh');

  ws.columns = [{ header: 'Xã/phường', key: '__xa', width: 26 },
    ...truong.map((t) => ({ header: t.nhan, key: t.k, width: t.kieu === 'chu' ? Math.min(48, Math.max(18, (t.max || 60) / 4)) : 20 }))];
  const tieuDe = ws.getRow(1);
  tieuDe.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  tieuDe.alignment = { vertical: 'middle', wrapText: true };
  tieuDe.height = 32;
  tieuDe.eachCell((o) => { o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } }; });

  /* Danh sách chọn đặt ở trang ẩn rồi tham chiếu tới: ghi thẳng vào công thức
     thì Excel giới hạn 255 ký tự, danh sách xã/phường dài hơn thế. */
  const cotDm = [['__xa', xaPhuong.filter((x) => x.hien).map(tenXa)],
    ...truong.filter((t) => t.kieu === 'chon').map((t) => [t.k, t.chon.map(([, n]) => n)]),
    ...truong.filter((t) => t.kieu === 'co').map((t) => [t.k, ['Có', 'Không']])];
  cotDm.forEach(([k, ds], i) => {
    const chu = String.fromCharCode(65 + i);
    ds.forEach((v, j) => { dm.getCell(`${chu}${j + 1}`).value = v; });
    const so = ws.columns.findIndex((c) => c.key === k) + 1;
    if (!ds.length || !so) return;
    for (let r = 2; r <= 500; r++) {
      ws.getCell(r, so).dataValidation = { type: 'list', allowBlank: true, formulae: [`'Danh mục'!$${chu}$1:$${chu}$${ds.length}`],
        showErrorMessage: k !== '__xa', errorTitle: 'Không có trong danh sách', error: 'Chọn một giá trị trong danh sách.' };
    }
  });

  const hd = wb.addWorksheet('Hướng dẫn');
  hd.getColumn(1).width = 30; hd.getColumn(2).width = 90;
  const ghi = (a, b) => { const r = hd.addRow([a, b]); r.alignment = { wrapText: true, vertical: 'top' }; r.getCell(1).font = { bold: true }; };
  hd.addRow([`Bảng ${bang.so}: ${bang.ten}`]).font = { bold: true, size: 14 };
  hd.addRow([bang.moTa]);
  hd.addRow([]);
  ghi('Cách nhập', 'Mỗi dòng ở trang "Nhập liệu" là một dòng của bảng. Giữ nguyên dòng tiêu đề. Có thể thêm cột STT, máy tự bỏ qua.');
  ghi('Xã/phường', 'Ghi đủ "Xã ...", "Phường ..." như danh sách chọn. Bỏ trống thì lấy xã/phường đang chọn trên web lúc tải tệp lên.');
  if (bang.theoKy) ghi('Kỳ báo cáo', `Không ghi trong tệp. Chọn kỳ trên web trước khi tải tệp lên${ky ? ` (đang chọn: ${ky.ten})` : ''}.`);
  if (bang.motDongMoiXa) ghi('Ghi đè', 'Mỗi xã/phường chỉ một dòng mỗi kỳ. Nhập lại thì số mới thay số cũ, số cũ vẫn lưu trong lịch sử.');
  if (bang.khoaTrung) ghi('Cập nhật', 'Dòng trùng tên với dòng đã có của cùng xã/phường thì được CẬP NHẬT, không thêm trùng. Muốn sửa số liệu cũ, tải lại tệp đã sửa là xong.');
  for (const t of truong) {
    const mo = { chu: 'chữ', so: 'số, được có phần lẻ. Ví dụ 1.854,4 hoặc 0,513', nguyen: 'số nguyên. Ví dụ 250.000', nam: 'năm, ví dụ 2026',
      ngay: 'ngày, ví dụ 27/8/2026', co: '"Có" hoặc để trống', chon: 'chọn trong danh sách' }[t.kieu];
    ghi(t.nhan, `${t.batBuoc ? 'BẮT BUỘC. ' : ''}${mo}.${t.kieu === 'chon' ? ' Gồm: ' + t.chon.map(([, n]) => n).join('; ') + '.' : ''}${t.m2 ? ' Ghi m2 thì máy tự đổi ra ha.' : ''}`);
  }
  ghi('Đơn vị', 'Không ghi chữ vào ô số. "Tổng mức đầu tư 49 tỷ đồng" thì ô vốn ghi 49, phần chữ để ở cột chú thích.');
  return Buffer.from(await wb.xlsx.writeBuffer());
}
