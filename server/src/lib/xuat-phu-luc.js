/**
 * XUẤT PHỤ LỤC THỐNG KÊ RA EXCEL VÀ WORD — đúng khuôn bản phụ lục giấy.
 *
 * Hai bước tách riêng:
 *   1. dungBang(): từ số liệu dựng "bảng trung gian" — cột, nhóm cột, dòng
 *      theo xã/phường, dòng tổng cộng. Mọi quy tắc trình bày nằm ở đây.
 *   2. xuatExcel() / xuatWord(): chỉ vẽ bảng trung gian ra tệp.
 * Nhờ vậy tệp Excel và tệp Word luôn khớp nhau từng ô.
 *
 * Quy tắc như bản giấy: cột Xã/phường gộp ô theo nhóm, STT đánh lại từ 1 trong
 * mỗi xã (máy đánh, không nhập tay nên không trùng số), cột xếp loại tách
 * thành các ô đánh dấu X. Xã không có dòng nào ghi rõ "Không phát sinh" (đã
 * xác nhận) hoặc "Chưa có số liệu" — không để "0", "Không", ô trống lẫn lộn.
 */
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation,
  VerticalAlign, ShadingType, Header, Footer, PageNumber } from 'docx';
import { hienGiaTri, tenXa } from './phu-luc.js';

const SO = ['so', 'nguyen', 'tinh'];

/**
 * @param bang          cấu hình bảng (lib/phu-luc.js)
 * @param dsXa          xã/phường cần có mặt trong bảng, đã sắp thứ tự
 * @param dong          các dòng đã qua raDong()
 * @param kyDs          [kỳ chính, kỳ so sánh?] — chỉ dùng với bảng theo kỳ
 * @param khongPhatSinh Set các khoá "kyId:xaId" đã xác nhận không phát sinh
 */
export function dungBang(bang, { dsXa, dong, kyDs = [], khongPhatSinh = new Set(), phuDe = '', theoXa = null }) {
  const nhieuKy = bang.theoKy && kyDs.length > 1;
  const truong = bang.truong.filter((t) => !t.khongXuat);
  /* Cột gộp ô theo xã: luôn có "Xã/phường", có thể thêm một cột lấy từ bảng
     khác (theoXa = { nhan, gt: Map xaId -> số }), ví dụ "Tổng quân số" bảng 7. */
  const cot = [{ nhan: 'Xã/phường', rong: 22 }];
  if (theoXa) cot.push({ nhan: theoXa.nhan, rong: 11, so: true });
  const soGop = cot.length;
  if (nhieuKy) cot.push({ nhan: 'Kỳ', rong: 18 });
  else if (!bang.motDongMoiXa) cot.push({ nhan: 'STT', rong: 6, giua: true });
  for (const t of truong) {
    if (t.danhDau) for (const [, n] of t.chon) cot.push({ nhan: n.replace(/^Đạt tiêu chuẩn /, ''), nhom: t.nhan, rong: 9, giua: true });
    else cot.push({ nhan: t.nhan, nhom: t.nhom, rong: SO.includes(t.kieu) ? (t.nhom ? 10 : 15) : t.kieu === 'chu' && (t.max || 0) > 200 ? 34 : 22, so: SO.includes(t.kieu) });
  }
  /* Ô số giữ nguyên kiểu số: Excel cộng, lọc được; Word tự định dạng 250.000. */
  const gt = (t, v) => (SO.includes(t.kieu) ? (v === null || v === undefined || v === '' ? '' : Number(v)) : hienGiaTri(t, v));
  const oCuaDong = (r, dau) => [dau, ...truong.flatMap((t) => (t.danhDau ? t.chon.map(([g]) => (String(r[t.k]) === String(g) ? 'X' : '')) : [gt(t, r[t.k])]))]
    .filter((_, i) => i > 0 || dau !== null);
  const coDau = nhieuKy || !bang.motDongMoiXa;

  const nhom = [];
  for (const x of dsXa) {
    const ds = [];
    const kyCanXet = bang.theoKy ? kyDs : [kyDs[0]];
    for (const ky of kyCanXet) {
      const cua = dong.filter((r) => r.xa_phuong_id === x.id && (!bang.theoKy || r.ky_id === ky?.id));
      if (cua.length) cua.forEach((r, i) => ds.push({ o: oCuaDong(r, coDau ? (nhieuKy ? ky.ten : String(i + 1)) : null) }));
      else ds.push({ dau: nhieuKy ? ky.ten : null, ghiChu: bang.dan ? 'Không có' : ky && khongPhatSinh.has(`${ky.id}:${x.id}`) ? 'Không phát sinh' : 'Chưa có số liệu' });
      if (!bang.theoKy) break;
    }
    nhom.push({ gop: [tenXa(x), ...(theoXa ? [theoXa.gt.has(x.id) ? theoXa.gt.get(x.id) : ''] : [])], dong: ds });
  }

  /* Dòng tổng cộng: mỗi kỳ một dòng — cộng lẫn hai kỳ khác độ dài là vô nghĩa. */
  const tong = [];
  if (truong.some((t) => t.tong)) {
    for (const ky of bang.theoKy ? kyDs : [null]) {
      const cua = dong.filter((r) => dsXa.some((x) => x.id === r.xa_phuong_id) && (!ky || r.ky_id === ky.id));
      const o = truong.flatMap((t) => (t.danhDau ? t.chon.map(([g]) => cua.filter((r) => String(r[t.k]) === String(g)).length || '')
        : [t.tong ? Math.round(cua.reduce((s, r) => s + Number(r[t.k] || 0), 0) * 1e4) / 1e4 : '']));
      const gop = theoXa ? [dsXa.reduce((a, x) => a + Number(theoXa.gt.get(x.id) || 0), 0)] : [];
      tong.push({ nhan: nhieuKy ? `Tổng cộng — ${ky.ten}` : 'Tổng cộng', o: [...gop, ...(coDau ? [''] : []), ...o] });
    }
  }
  return { so: bang.so, tieuDe: bang.tieuDeXuat || bang.ten, phuDe, cot, soGop, nhom, tong };
}

/* ============================================================== EXCEL */
const VIEN = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
function ghiO(o, v) {
  o.value = v;
  if (typeof v === 'number') o.numFmt = Number.isInteger(v) ? '#,##0' : '#,##0.0###';
}
const soVn = (v) => (typeof v === 'number' ? v.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : v);

function veTieuDeCot(ws, cot, r0) {
  const haiTang = cot.some((c) => c.nhom);
  let c = 1;
  while (c <= cot.length) {
    const k = cot[c - 1];
    if (k.nhom) {
      let cuoi = c; while (cuoi < cot.length && cot[cuoi].nhom === k.nhom) cuoi++;
      ws.mergeCells(r0, c, r0, cuoi); ws.getCell(r0, c).value = k.nhom;
      for (let i = c; i <= cuoi; i++) ws.getCell(r0 + 1, i).value = cot[i - 1].nhan;
      c = cuoi + 1;
    } else {
      if (haiTang) ws.mergeCells(r0, c, r0 + 1, c);
      ws.getCell(r0, c).value = k.nhan; c++;
    }
  }
  const soTang = haiTang ? 2 : 1;
  for (let r = r0; r < r0 + soTang; r++) {
    for (let i = 1; i <= cot.length; i++) {
      const o = ws.getCell(r, i);
      o.font = { bold: true }; o.border = VIEN; o.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    }
  }
  return r0 + soTang;
}

export async function xuatExcel(dsBang, meta) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Du lịch Đồng Nai';
  wb.created = new Date();
  const bia = wb.addWorksheet('Thông tin');
  bia.getColumn(1).width = 24; bia.getColumn(2).width = 80;
  bia.addRow(['PHỤ LỤC THỐNG KÊ DU LỊCH THÀNH PHỐ ĐỒNG NAI']).font = { bold: true, size: 15 };
  bia.addRow([]);
  for (const [a, b] of [['Kỳ báo cáo', meta.kyTen], ['Mức độ', meta.mucDo], ['Người xuất', meta.nguoiXuat], ['Thời điểm xuất', meta.luc],
    ['Gồm', dsBang.map((b) => `Bảng ${b.so}`).join(', ')]]) bia.addRow([a, b]).getCell(1).font = { bold: true };

  for (const b of dsBang) {
    const ws = wb.addWorksheet(`Bảng ${b.so}`, { pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.headerFooter.oddFooter = `&L${meta.mucDo} — xuất bởi ${meta.nguoiXuat} lúc ${meta.luc}&RTrang &P/&N`;
    const n = b.cot.length;
    b.cot.forEach((k, i) => { ws.getColumn(i + 1).width = k.rong; });
    ws.mergeCells(1, 1, 1, n); Object.assign(ws.getCell(1, 1), { value: `${b.so}. ${b.tieuDe}` });
    ws.getCell(1, 1).font = { bold: true, size: 13 }; ws.getCell(1, 1).alignment = { wrapText: true };
    ws.getRow(1).height = 34;
    ws.mergeCells(2, 1, 2, n); ws.getCell(2, 1).value = b.phuDe; ws.getCell(2, 1).font = { italic: true };
    let r = veTieuDeCot(ws, b.cot, 4);
    const k = b.soGop;
    for (const g of b.nhom) {
      const dau = r;
      for (const d of g.dong) {
        if (d.ghiChu) {
          let c = k + 1;
          if (d.dau) { ws.getCell(r, c).value = d.dau; c++; }
          if (c <= n) { ws.mergeCells(r, c, r, n); ws.getCell(r, c).value = d.ghiChu; ws.getCell(r, c).font = { italic: true, color: { argb: 'FF64748B' } }; }
        } else d.o.forEach((v, i) => ghiO(ws.getCell(r, i + 1 + k), v));
        r++;
      }
      g.gop.forEach((v, i) => { if (r - 1 > dau) ws.mergeCells(dau, i + 1, r - 1, i + 1); ghiO(ws.getCell(dau, i + 1), v); });
      for (let i = dau; i < r; i++) {
        for (let c = 1; c <= n; c++) {
          const o = ws.getCell(i, c); o.border = VIEN;
          o.alignment = { vertical: c <= k ? 'middle' : 'top', wrapText: true, horizontal: b.cot[c - 1].so ? 'right' : b.cot[c - 1].giua ? 'center' : 'left' };
        }
      }
    }
    for (const t of b.tong) {
      ws.getCell(r, 1).value = t.nhan;
      t.o.forEach((v, i) => ghiO(ws.getCell(r, i + 2), v));
      for (let c = 1; c <= n; c++) {
        const o = ws.getCell(r, c); o.font = { bold: true }; o.border = VIEN;
        o.alignment = { horizontal: b.cot[c - 1].so ? 'right' : b.cot[c - 1].giua ? 'center' : 'left', wrapText: true };
        o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }
      r++;
    }
    ws.getCell(r + 1, 1).value = `${meta.mucDo} — xuất từ hệ thống Du lịch Đồng Nai bởi ${meta.nguoiXuat} lúc ${meta.luc}.`;
    ws.getCell(r + 1, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ============================================================== WORD */
const PHONG = 'Times New Roman';
const chu = (text, { dam = false, nghieng = false, co = 20 } = {}) =>
  String(soVn(text) ?? '').split('\n').map((dong, i) => new TextRun({ text: dong, bold: dam, italics: nghieng, size: co, font: PHONG, break: i ? 1 : 0 }));
const o = (text, { dam = false, nghieng = false, ngang = 1, doc = 1, giua = false, phai = false, nen = null } = {}) => new TableCell({
  children: [new Paragraph({ alignment: giua ? AlignmentType.CENTER : phai ? AlignmentType.RIGHT : AlignmentType.LEFT, children: chu(text, { dam, nghieng }) })],
  columnSpan: ngang > 1 ? ngang : undefined, rowSpan: doc > 1 ? doc : undefined, verticalAlign: VerticalAlign.CENTER,
  shading: nen ? { type: ShadingType.CLEAR, color: 'auto', fill: nen } : undefined,
  margins: { top: 40, bottom: 40, left: 80, right: 80 },
});

function bangWord(b) {
  const haiTang = b.cot.some((c) => c.nhom);
  const tang1 = [], tang2 = [];
  for (let c = 0; c < b.cot.length;) {
    const k = b.cot[c];
    if (k.nhom) {
      let cuoi = c; while (cuoi + 1 < b.cot.length && b.cot[cuoi + 1].nhom === k.nhom) cuoi++;
      tang1.push(o(k.nhom, { dam: true, giua: true, ngang: cuoi - c + 1, nen: 'E8F5E9' }));
      for (let i = c; i <= cuoi; i++) tang2.push(o(b.cot[i].nhan, { dam: true, giua: true, nen: 'E8F5E9' }));
      c = cuoi + 1;
    } else { tang1.push(o(k.nhan, { dam: true, giua: true, doc: haiTang ? 2 : 1, nen: 'E8F5E9' })); c++; }
  }
  const dong = [new TableRow({ tableHeader: true, children: tang1 })];
  if (haiTang) dong.push(new TableRow({ tableHeader: true, children: tang2 }));
  const n = b.cot.length, k = b.soGop;
  for (const g of b.nhom) {
    g.dong.forEach((d, i) => {
      const cells = i === 0 ? g.gop.map((v, j) => o(v, { doc: g.dong.length, phai: b.cot[j].so })) : [];
      if (d.ghiChu) {
        if (d.dau) cells.push(o(d.dau));
        cells.push(o(d.ghiChu, { nghieng: true, ngang: n - k - (d.dau ? 1 : 0) }));
      } else d.o.forEach((v, j) => cells.push(o(v, { phai: b.cot[j + k].so, giua: b.cot[j + k].giua })));
      dong.push(new TableRow({ cantSplit: true, children: cells }));
    });
  }
  for (const t of b.tong) {
    dong.push(new TableRow({ children: [o(t.nhan, { dam: true, nen: 'F1F5F9' }),
      ...t.o.map((v, j) => o(v, { dam: true, nen: 'F1F5F9', phai: b.cot[j + 1].so, giua: b.cot[j + 1].giua }))] }));
  }
  const tongRong = b.cot.reduce((s, c) => s + c.rong, 0);
  return new Table({ rows: dong, width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: b.cot.map((c) => Math.round((c.rong / tongRong) * 14000)) });
}

export async function xuatWord(dsBang, meta) {
  const noiDung = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: chu('PHỤ LỤC THỐNG KÊ', { dam: true, co: 28 }) }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: chu(`Du lịch thành phố Đồng Nai — ${meta.kyTen}`, { nghieng: true, co: 24 }) }),
  ];
  for (const b of dsBang) {
    noiDung.push(new Paragraph({ spacing: { before: 280, after: 60 }, keepNext: true, children: chu(`${b.so}. ${b.tieuDe}`, { dam: true, co: 24 }) }));
    if (b.phuDe) noiDung.push(new Paragraph({ spacing: { after: 120 }, keepNext: true, children: chu(b.phuDe, { nghieng: true, co: 22 }) }));
    noiDung.push(bangWord(b));
  }
  const doc = new Document({
    creator: 'Du lịch Đồng Nai', title: `Phụ lục thống kê — ${meta.kyTen}`,
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: chu(meta.mucDo, { dam: true, co: 18 }) })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [
        ...chu(`Xuất bởi ${meta.nguoiXuat} lúc ${meta.luc} — trang `, { nghieng: true, co: 16 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, font: PHONG, italics: true })] })] }) },
      children: noiDung,
    }],
  });
  return Packer.toBuffer(doc);
}
