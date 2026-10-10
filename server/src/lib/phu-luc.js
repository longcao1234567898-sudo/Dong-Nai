/**
 * CẤU HÌNH CÁC BẢNG PHỤ LỤC THỐNG KÊ — khai MỘT LẦN, dùng ở mọi nơi.
 *
 * Mỗi bảng khai tên cột, kiểu dữ liệu, ràng buộc. Máy chủ dùng để kiểm tra dữ
 * liệu nhập tay và nhập Excel; giao diện dùng để vẽ biểu mẫu; tệp xuất Word,
 * Excel dùng để dựng bảng đúng mẫu phụ lục. Thêm một cột chỉ sửa ở đây (và
 * thêm cột tương ứng trong database/du_lich_dong_nai.sql).
 *
 * Kiểu ô:
 *   chu     chữ, cắt theo max ký tự
 *   so      số không âm, có phần lẻ (vốn tỷ đồng, diện tích ha)
 *   nguyen  số nguyên không âm (lượt khách, số người)
 *   chon    chọn một trong danh sách
 *   ngay    ngày (YYYY-MM-DD)
 *   nam     năm
 *   co      có / không
 *   tinh    máy tự tính, không nhập (ví dụ tổng = quốc tế + nội địa)
 *
 * Hai loại bảng:
 *   theoKy: true   số liệu của một kỳ báo cáo (khách, ...). Kỳ đã khoá hoặc
 *                  xã đã chốt thì không sửa được.
 *   theoKy: false  danh mục sống (dự án, resort, ...): thêm, sửa bất cứ lúc
 *                  nào, mọi thay đổi đều ghi lịch sử.
 */
import { sanitizeText, stripDiacritics } from './security.js';

export const LOAI_XA = { xa: 'Xã', phuong: 'Phường', 'dac-khu': 'Đặc khu' };
export const tenXa = (x) => (x ? `${LOAI_XA[x.loai] || ''} ${x.ten}`.trim() : '');

/** Bỏ dấu, chữ thường, chỉ giữ chữ và số — để so khớp tên cột, tên xã. */
export const chuanHoa = (s) => stripDiacritics(String(s ?? '')).toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Tách "Phường Trấn Biên" thành { loai: 'phuong', ten: 'Trấn Biên' }. */
export function tachTenXa(s) {
  const t = sanitizeText(String(s || ''), 100).replace(/\s+/g, ' ');
  const m = /^(xã|xa|phường|phuong|đặc khu|dac khu)\s+(.+)$/i.exec(t);
  if (!m) return null;
  const dau = chuanHoa(m[1]);
  return { loai: dau === 'xa' ? 'xa' : dau === 'phuong' ? 'phuong' : 'dac-khu', ten: m[2].trim().slice(0, 80) };
}

export const TRANG_THAI_DU_AN = [
  ['hoat-dong', 'Đã đi vào hoạt động'], ['dang-xay-dung', 'Đang triển khai xây dựng'], ['chua-trien-khai', 'Chưa triển khai'],
  ['cham-trien-khai', 'Chậm triển khai'], ['tam-ngung', 'Đang tạm ngưng'], ['thu-hoi', 'Có chủ trương thu hồi'],
];
export const KET_QUA_VU_VIEC = [['da-xu-ly', 'Đã xử lý ổn định'], ['dang-xu-ly', 'Đang xử lý'], ['phuc-tap', 'Diễn biến phức tạp']];
export const TINH_TRANG_VAN_BAN = [['da-ban-hanh', 'Đã ban hành'], ['dang-trinh', 'Đang trình ký']];
export const LOAI_VI_PHAM = [['hinh-su', 'Hình sự'], ['xuat-nhap-canh', 'Xuất nhập cảnh, cư trú (kể cả quá hạn tạm trú)'],
  ['trat-tu', 'Trật tự, an toàn xã hội (xử phạt hành chính)'], ['khac', 'Khác']];
/* Gợi ý khi gõ quốc tịch — để cùng một nước không bị ghi mỗi người một kiểu
   ("Nga", "Liên bang Nga", "LB Nga") làm bảng theo quốc tịch tách thành nhiều dòng. */
export const QUOC_TICH = ['Nga', 'Hàn Quốc', 'Trung Quốc', 'Mỹ', 'Nhật Bản', 'Úc', 'Anh', 'Pháp', 'Đức', 'Canada', 'Ấn Độ', 'Thái Lan',
  'Malaysia', 'Singapore', 'Đài Loan', 'Campuchia', 'Lào', 'Philippines', 'Indonesia', 'Hà Lan', 'Đan Mạch', 'Ý', 'Ukraina', 'Kazakhstan'];

/** Bảng 7: các nhóm cột, nhóm nào đã nhập thì cộng lại phải bằng số lượng của tổ. */
const NHOM_LUC_LUONG = [
  ['Chức vụ', [['cv_pho_truong', 'Phó trưởng CA phụ trách'], ['cv_to_truong', 'Tổ trưởng'], ['cv_to_pho', 'Tổ phó'], ['cv_can_bo', 'Cán bộ']]],
  ['Trình độ', [['td_tien_si', 'Tiến sĩ'], ['td_thac_si', 'Thạc sĩ'], ['td_dai_hoc', 'Đại học'], ['td_cao_dang', 'Cao đẳng'], ['td_trung_cap', 'Trung cấp']]],
  ['Chuyên môn nghiệp vụ', [['cm_an_ninh', 'An ninh'], ['cm_canh_sat', 'Cảnh sát']]],
  ['Độ tuổi', [['tuoi_duoi_30', 'Dưới 30'], ['tuoi_30_40', '30 - 40'], ['tuoi_tren_40', 'Trên 40']]],
];

export const HANG_SAO = [[5, 'Đạt tiêu chuẩn 5 sao'], [4, 'Đạt tiêu chuẩn 4 sao'], [3, 'Đạt tiêu chuẩn 3 sao'],
  [2, 'Đạt tiêu chuẩn 2 sao'], [1, 'Đạt tiêu chuẩn 1 sao'], [0, 'Chưa xếp hạng']];

/*
 * Thuộc tính của một trường:
 *   k, nhan, kieu     tên cột trong cơ sở dữ liệu, nhãn hiện ra, kiểu ô
 *   batBuoc           bỏ trống thì báo lỗi
 *   chinh             hiện ở danh sách trên web (không khai thì lấy 4 cột đầu)
 *   tong              cộng dồn ở dòng "Tổng cộng" khi xuất và thống kê
 *   danhDau           khi xuất, tách thành các cột đánh dấu X như mẫu giấy
 *   khongXuat         không đưa vào tệp xuất (cờ nội bộ)
 *   m2                ô diện tích: ghi "16.305,40m2" thì tự đổi ra ha
 *   dong              số dòng của ô nhập chữ dài
 *   nhom              tiêu đề nhóm cột khi xuất (hai tầng tiêu đề như mẫu giấy)
 *   goiY              danh sách gợi ý khi gõ (vẫn gõ được giá trị khác)
 *
 * Thuộc tính của một bảng (ngoài key, so, ten...):
 *   mat               thông tin nhạy cảm: mỗi lần xem, xuất đều ghi nhật ký,
 *                     tệp xuất ghi rõ "có thông tin nhạy cảm"
 *   khoaTrung         nhập Excel: trùng cột này (cùng xã) thì cập nhật, không thêm
 *   locNgay / locDen  xuất theo khoảng ngày: cả hai đầu / chỉ "tính đến ngày"
 *   locNam            xuất "tính đến": chỉ lấy dòng có năm <= năm cuối kỳ
 *   soSanh            khi xuất có kỳ so sánh thì bảng này hiện cả hai kỳ
 *   kemTheoXa         thêm một cột gộp ô theo xã lấy từ bảng khác (tổng quân số)
 *   anXuat            không xuất thành bảng riêng (đã nằm trong bảng khác)
 *   dan               bảng do máy tổng hợp từ bảng khác, không nhập tay
 */
export const BANG = [
  {
    key: 'khach', so: 1, ten: 'Hiện trạng khách du lịch', bangDb: 'bc_khach', theoKy: true, motDongMoiXa: true, soSanh: true,
    tieuDeXuat: 'Bảng thống kê hiện trạng khách du lịch đến thành phố Đồng Nai',
    moTa: 'Mỗi xã/phường một dòng cho mỗi kỳ. Tổng số khách do máy tự cộng, không nhập tay.',
    truong: [
      { k: 'tong', nhan: 'Tổng số khách', kieu: 'tinh', cong: ['quoc_te', 'noi_dia'], tong: true },
      { k: 'quoc_te', nhan: 'Khách quốc tế', kieu: 'nguyen', batBuoc: true, tong: true },
      { k: 'noi_dia', nhan: 'Khách nội địa', kieu: 'nguyen', batBuoc: true, tong: true },
    ],
  },
  {
    key: 'du-an', so: 2, ten: 'Dự án đầu tư du lịch', bangDb: 'bc_du_an', theoKy: false, khoaTrung: 'ten',
    tieuDeXuat: 'Bảng thống kê dự án đầu tư du lịch tại thành phố Đồng Nai',
    moTa: 'Danh mục dự án, cập nhật khi có thay đổi. Vốn ghi bằng số, đơn vị tỷ đồng.',
    truong: [
      { k: 'ten', nhan: 'Dự án', kieu: 'chu', max: 255, batBuoc: true, chinh: true },
      { k: 'dia_chi', nhan: 'Địa chỉ', kieu: 'chu', max: 255 },
      { k: 'nha_dau_tu', nhan: 'Nhà đầu tư', kieu: 'chu', max: 255 },
      { k: 'quoc_gia', nhan: 'Quốc gia', kieu: 'chu', max: 60, chinh: true },
      { k: 'von_ty', nhan: 'Số vốn đầu tư (tỷ đồng)', kieu: 'so', chinh: true, tong: true },
      { k: 'dien_tich_ha', nhan: 'Diện tích (ha)', kieu: 'so', m2: true, tong: true },
      { k: 'trang_thai', nhan: 'Tình trạng', kieu: 'chon', chon: TRANG_THAI_DU_AN, chinh: true },
      { k: 'ghi_chu', nhan: 'Chú thích', kieu: 'chu', max: 500, dong: 2 },
    ],
  },
  {
    key: 'luu-tru', so: 3, ten: 'Resort, khu nghỉ dưỡng', bangDb: 'bc_luu_tru', theoKy: false, khoaTrung: 'ten',
    tieuDeXuat: 'Bảng thống kê số lượng resort, khu nghỉ dưỡng trên địa bàn thành phố Đồng Nai',
    moTa: 'Danh mục cơ sở. Chỉ tên, địa chỉ, hạng sao của cơ sở được đánh dấu "hiện cho người dân" mới lên trang công khai.',
    truong: [
      { k: 'ten', nhan: 'Tên resort, khu nghỉ dưỡng', kieu: 'chu', max: 255, batBuoc: true, chinh: true },
      { k: 'dia_chi', nhan: 'Địa chỉ', kieu: 'chu', max: 255, chinh: true },
      { k: 'chu_co_so', nhan: 'Họ và tên chủ cơ sở', kieu: 'chu', max: 120 },
      { k: 'hang_sao', nhan: 'Xếp loại tiêu chuẩn', kieu: 'chon', chon: HANG_SAO, macDinh: 0, danhDau: true, chinh: true },
      { k: 'cong_khai', nhan: 'Hiện cho người dân (tên, địa chỉ, hạng sao)', kieu: 'co', khongXuat: true },
    ],
  },
  {
    key: 'vu-viec', so: 4, ten: 'Vụ việc phức tạp về an ninh, trật tự', bangDb: 'bc_vu_viec', theoKy: false, mat: true, khoaTrung: 'ten', locNam: 'nam',
    tieuDeXuat: 'Thống kê vụ việc, đối tượng phức tạp về an ninh, trật tự liên quan lĩnh vực du lịch trên địa bàn thành phố Đồng Nai',
    moTa: 'Danh mục vụ việc, vụ án. Thông tin nhạy cảm: mỗi lần xem, xuất đều ghi nhật ký.',
    truong: [
      { k: 'ten', nhan: 'Tên vụ việc, vụ án', kieu: 'chu', max: 255, batBuoc: true, chinh: true },
      { k: 'nam', nhan: 'Năm phát sinh', kieu: 'nam', chinh: true },
      { k: 'dien_bien', nhan: 'Tóm tắt diễn biến chính', kieu: 'chu', max: 5000, dong: 4 },
      { k: 'huong_xu_ly', nhan: 'Tóm tắt hướng xử lý và kết quả xử lý', kieu: 'chu', max: 5000, dong: 3 },
      { k: 'ket_qua', nhan: 'Kết quả giải quyết', kieu: 'chon', chon: KET_QUA_VU_VIEC, danhDau: true, chinh: true },
      { k: 'ghi_chu', nhan: 'Ghi chú', kieu: 'chu', max: 500 },
    ],
  },
  {
    key: 'phoi-hop', so: 5, ten: 'Văn bản phối hợp lực lượng', bangDb: 'bc_phoi_hop', theoKy: false, khoaTrung: 'ten_van_ban', locDen: 'ngay_ban_hanh',
    tieuDeXuat: 'Công tác phối hợp lực lượng trong đảm bảo an ninh, trật tự trên lĩnh vực du lịch tại thành phố Đồng Nai',
    moTa: 'Quyết định, kế hoạch, quy chế phối hợp. Văn bản đang trình ký cũng ghi vào, chọn tình trạng "Đang trình ký".',
    truong: [
      { k: 'ten_van_ban', nhan: 'Tên văn bản phối hợp', kieu: 'chu', max: 500, batBuoc: true, chinh: true, dong: 2 },
      { k: 'ngay_ban_hanh', nhan: 'Ngày ban hành', kieu: 'ngay', chinh: true },
      { k: 'tinh_trang', nhan: 'Tình trạng', kieu: 'chon', chon: TINH_TRANG_VAN_BAN, chinh: true },
      { k: 'cac_ben', nhan: 'Các bên tham gia', kieu: 'chu', max: 2000, dong: 2 },
      { k: 'noi_dung', nhan: 'Nội dung phối hợp chính', kieu: 'chu', max: 3000, dong: 3 },
    ],
  },
  {
    key: 'van-dong', so: 6, ten: 'Vận động quần chúng, phong trào toàn dân', bangDb: 'bc_van_dong', theoKy: true, khoaTrung: 'ten_mo_hinh',
    tieuDeXuat: 'Công tác vận động quần chúng, xây dựng phong trào toàn dân bảo vệ an ninh Tổ quốc trên lĩnh vực du lịch tại thành phố Đồng Nai',
    moTa: 'Mỗi mô hình hoặc đợt vận động một dòng, trong kỳ.',
    truong: [
      { k: 'so_luot', nhan: 'Số lượt', kieu: 'nguyen', tong: true, chinh: true, nhom: 'Vận động quần chúng' },
      { k: 'so_nguoi', nhan: 'Số người tham gia', kieu: 'nguyen', tong: true, chinh: true, nhom: 'Vận động quần chúng' },
      { k: 'so_luong', nhan: 'Số lượng mô hình', kieu: 'nguyen', tong: true, chinh: true, nhom: 'Mô hình phong trào toàn dân bảo vệ ANTQ' },
      { k: 'ten_mo_hinh', nhan: 'Tên mô hình tiêu biểu', kieu: 'chu', max: 255, batBuoc: true, chinh: true, nhom: 'Mô hình phong trào toàn dân bảo vệ ANTQ' },
    ],
  },
  {
    key: 'luc-luong', so: 7, ten: 'Đội ngũ cán bộ công an xã/phường', bangDb: 'bc_luc_luong', theoKy: true, mat: true, khoaTrung: 'ten_to',
    kemTheoXa: { nhan: 'Tổng quân số', bang: 'quan-so', truong: 'tong_quan_so' },
    tieuDeXuat: 'Thống kê đội ngũ cán bộ công tác tại công an xã, phường có hoạt động du lịch tại thành phố Đồng Nai',
    moTa: 'Mỗi tổ một dòng. Nhóm chức vụ, trình độ, chuyên môn, độ tuổi: nhóm nào đã nhập thì cộng lại phải bằng số lượng của tổ. Tổng quân số của xã nhập ở bảng 7a.',
    truong: [
      { k: 'ten_to', nhan: 'Tên tổ', kieu: 'chu', max: 120, batBuoc: true, chinh: true },
      { k: 'so_luong', nhan: 'Số lượng', kieu: 'nguyen', batBuoc: true, tong: true, chinh: true },
      ...NHOM_LUC_LUONG.flatMap(([nhom, ds]) => ds.map(([k, nhan]) => ({ k, nhan, kieu: 'nguyen', tong: true, nhom }))),
    ],
    kiemTra(du) {
      for (const [nhom, ds] of NHOM_LUC_LUONG) {
        const da = ds.filter(([k]) => du[k] !== null && du[k] !== undefined);
        const cong = da.reduce((a, [k]) => a + du[k], 0);
        if (da.length && cong !== du.so_luong) return `${nhom} cộng lại được ${cong}, khác số lượng của tổ (${du.so_luong}). Kiểm tra lại, hoặc bỏ trống cả nhóm nếu chưa có số liệu.`;
      }
      return null;
    },
  },
  {
    key: 'quan-so', so: '7a', ten: 'Tổng quân số công an xã/phường', bangDb: 'bc_quan_so', theoKy: true, motDongMoiXa: true, mat: true, anXuat: true,
    moTa: 'Một số cho mỗi xã/phường mỗi kỳ. Khi xuất, số này nằm ở cột "Tổng quân số" của bảng 7.',
    truong: [{ k: 'tong_quan_so', nhan: 'Tổng quân số', kieu: 'nguyen', batBuoc: true, tong: true, chinh: true }],
  },
  {
    key: 'dan-cu', so: 8, ten: 'Dân cư, dân tộc, tôn giáo', bangDb: 'bc_dan_cu', theoKy: true, motDongMoiXa: true, mat: true,
    tieuDeXuat: 'Tình hình dân cư, dân tộc, tôn giáo tại địa bàn thành phố Đồng Nai',
    moTa: 'Mỗi xã/phường một dòng mỗi kỳ.',
    truong: [
      { k: 'so_to_thon', nhan: 'Số tổ, thôn, ấp', kieu: 'nguyen', tong: true },
      { k: 'dan_so', nhan: 'Tổng dân số', kieu: 'nguyen', tong: true, chinh: true },
      { k: 'so_dan_toc', nhan: 'Số dân tộc', kieu: 'nguyen', chinh: true },
      { k: 'co_so_ton_giao', nhan: 'Số cơ sở tôn giáo', kieu: 'nguyen', tong: true, chinh: true },
      { k: 'chuc_sac', nhan: 'Số chức sắc tôn giáo', kieu: 'nguyen', tong: true },
      { k: 'tin_do', nhan: 'Số tín đồ tôn giáo', kieu: 'nguyen', tong: true, chinh: true },
      { k: 'ghi_chu', nhan: 'Ghi chú', kieu: 'chu', max: 500 },
    ],
  },
  {
    key: 'vi-pham', so: 9, ten: 'Vi phạm pháp luật của khách nước ngoài', bangDb: 'bc_vi_pham', theoKy: false, mat: true, locNgay: 'ngay',
    tieuDeXuat: 'Thống kê vi phạm pháp luật của khách nước ngoài du lịch trên địa bàn thành phố Đồng Nai',
    moTa: 'Mỗi vụ một dòng, ghi rõ quốc tịch — bảng 10 (theo quốc tịch) máy tự tổng hợp từ đây, không phải nhập lại.',
    truong: [
      { k: 'ngay', nhan: 'Thời gian', kieu: 'ngay', batBuoc: true, chinh: true },
      { k: 'loai', nhan: 'Loại vi phạm', kieu: 'chon', chon: LOAI_VI_PHAM, batBuoc: true, chinh: true },
      { k: 'quoc_tich', nhan: 'Quốc tịch', kieu: 'chu', max: 60, batBuoc: true, chinh: true, goiY: QUOC_TICH },
      { k: 'so_luot', nhan: 'Số lượt vi phạm', kieu: 'nguyen', macDinh: 1, tong: true, chinh: true },
      { k: 'noi_dung', nhan: 'Nội dung vi phạm', kieu: 'chu', max: 1000, dong: 2 },
    ],
  },
  {
    key: 'vi-pham-quoc-tich', so: 10, ten: 'Vi phạm xuất nhập cảnh theo quốc tịch', theoKy: false, mat: true, dan: true, locNgay: 'ngay',
    tieuDeXuat: 'Thống kê vi phạm pháp luật về xuất, nhập cảnh của khách nước ngoài theo quốc tịch',
    moTa: 'Máy tự tổng hợp từ bảng 9 (loại "Xuất nhập cảnh, cư trú"), theo năm và quốc tịch. Muốn sửa thì sửa ở bảng 9.',
    truong: [
      { k: 'nam', nhan: 'Năm', kieu: 'nam', chinh: true },
      { k: 'quoc_tich', nhan: 'Quốc tịch', kieu: 'chu', chinh: true },
      { k: 'so_vi_pham', nhan: 'Số vi phạm', kieu: 'nguyen', tong: true, chinh: true },
    ],
    /* tu, den: "YYYY-MM-DD" hoặc trống. Gộp theo quốc tịch dùng đối chiếu
       không phân biệt hoa thường, có dấu — "Nga" và "nga" là một dòng. */
    async tinh(pool, { tu, den } = {}) {
      const dk = ["xoa_luc IS NULL", "loai = 'xuat-nhap-canh'"], ts = [];
      if (tu) { dk.push('ngay >= ?'); ts.push(tu); }
      if (den) { dk.push('ngay <= ?'); ts.push(den); }
      const [rows] = await pool.query(
        `SELECT xa_phuong_id, YEAR(ngay) AS nam, MIN(TRIM(quoc_tich)) AS quoc_tich, SUM(so_luot) AS so_vi_pham
           FROM bc_vi_pham WHERE ${dk.join(' AND ')} GROUP BY xa_phuong_id, YEAR(ngay), TRIM(quoc_tich)
          ORDER BY xa_phuong_id, nam, so_vi_pham DESC`, ts);
      return rows.map((r, i) => ({ id: i + 1, xa_phuong_id: r.xa_phuong_id, nam: Number(r.nam), quoc_tich: r.quoc_tich, so_vi_pham: Number(r.so_vi_pham), nguoi_sua: null, updated_at: null, xoa_luc: null }));
    },
  },
];

export const layBang = (key) => BANG.find((b) => b.key === key) || null;

/** Cấu hình gửi cho giao diện: bỏ hàm kiểm tra và tên bảng trong cơ sở dữ liệu. */
export const cauHinhGiaoDien = (b) => {
  const { kiemTra, tinh, bangDb, ...con } = b; // eslint-disable-line no-unused-vars
  return con;
};

/* ============================================================================
   ĐỌC SỐ KIỂU VIỆT NAM

   Bản phụ lục giấy ghi số đủ kiểu: "250.000", "1.854,4 tỷ đồng", "359.9 tỷ",
   "0,513 tỉ", "9450 lượt", "72.952 người", "16.305,40m2". Máy đọc hết về số:
     · có cả chấm và phẩy  -> dấu đứng sau là phần lẻ  (1.854,4 -> 1854.4)
     · chỉ có phẩy         -> phẩy là phần lẻ           (0,513 -> 0.513)
     · chỉ có chấm, đúng nhóm 3 chữ số -> chấm ngăn hàng nghìn (250.000)
       còn lại chấm là phần lẻ                          (359.9 -> 359.9)
   Đơn vị (tỷ, tỉ, đồng, ha, lượt, người) được bỏ đi. Còn chữ khác -> báo lỗi,
   vì "Tổng mức đầu tư 49 tỷ đồng." là lời giải thích, phải để ở cột ghi chú.
   ============================================================================ */
export function docSo(v, { m2 = false } = {}) {
  if (v === null || v === undefined || v === '') return { gt: null };
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? { gt: v } : { loi: 'phải là số không âm.' };
  const goc = String(v).trim();
  let s = stripDiacritics(goc).toLowerCase();
  if (/^[-–—.]+$/.test(s)) return { gt: null };
  if (s === 'khong' || s === 'khong co') return { gt: 0 };
  const heSo = m2 && /m2|m²/.test(s) ? 1e-4 : 1;
  s = s.replace(/hec ?ta|khach|nguoi|luot|dong|vnd|m2|m²|ty|ti|ha/g, '').replace(/\s+/g, '');
  if (s.startsWith('-')) return { loi: 'phải là số không âm.' };
  if (!/^\d[\d.,]*$/.test(s) || /[.,]$/.test(s)) {
    return { loi: `"${goc.slice(0, 40)}" không phải số. Chỉ ghi số, ví dụ 1.854,4 — lời giải thích để ở cột ghi chú.` };
  }
  const coCham = s.includes('.'), coPhay = s.includes(',');
  if (coCham && coPhay) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (coPhay) s = /^\d{1,3}(,\d{3}){2,}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (coCham && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return { loi: `"${goc.slice(0, 40)}" không đọc được thành số.` };
  if (n > 1e12) return { loi: 'số quá lớn, kiểm tra lại đơn vị.' };
  return { gt: Math.round(n * heSo * 1e4) / 1e4 };
}

/** Đọc ngày: ô ngày của Excel, "2026-08-27", "27/8/2026", "27-08-2026". Trả về "YYYY-MM-DD". */
export function docNgay(v) {
  if (v === null || v === undefined || v === '') return { gt: null };
  let y, m, d;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return { loi: 'ngày không hợp lệ.' };
    /* Excel lưu ngày không kèm giờ; thư viện đọc thành 0 giờ UTC -> lấy theo UTC. */
    [y, m, d] = [v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()];
  } else {
    const s = String(v).trim();
    let k = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (k) [y, m, d] = [Number(k[1]), Number(k[2]), Number(k[3])];
    else if ((k = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) [y, m, d] = [Number(k[3]), Number(k[2]), Number(k[1])];
    else return { loi: `"${s.slice(0, 30)}" không phải ngày. Ghi dạng 27/8/2026.` };
  }
  const t = new Date(Date.UTC(y, m - 1, d));
  if (y < 1975 || y > 2100 || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return { loi: 'ngày không có thật.' };
  return { gt: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

const CO = ['x', 'co', '1', 'true', 'yes', 'dung'];
const KHONG = ['', '0', 'khong', 'false', 'no', 'sai'];

/** Đọc một ô theo kiểu của trường. */
export function docO(t, v) {
  if (v !== null && typeof v === 'object' && !(v instanceof Date)) v = null;   // chặn mảng, đối tượng lạ
  switch (t.kieu) {
    case 'chu': return { gt: sanitizeText(String(v ?? ''), t.max || 255) || null };
    case 'so': return docSo(v, { m2: t.m2 });
    case 'nguyen': {
      const r = docSo(v);
      if (r.loi || r.gt === null) return r;
      return Number.isInteger(r.gt) ? (r.gt <= 2_000_000_000 ? r : { loi: 'số quá lớn.' }) : { loi: 'phải là số nguyên.' };
    }
    case 'nam': {
      if (v === null || v === undefined || v === '') return { gt: null };
      const n = Number(String(v).trim());
      return Number.isInteger(n) && n >= 1975 && n <= 2100 ? { gt: n } : { loi: 'năm không hợp lệ, ghi dạng 2026.' };
    }
    case 'ngay': return docNgay(v);
    case 'co': {
      if (typeof v === 'boolean') return { gt: v };
      const s = chuanHoa(v);
      if (CO.includes(s)) return { gt: true };
      if (KHONG.includes(s)) return { gt: false };
      return { loi: 'ghi "Có" hoặc để trống.' };
    }
    case 'chon': {
      if (v === null || v === undefined || v === '') return { gt: null };
      const s = String(v).trim(), c = chuanHoa(s);
      const tim = t.chon.find(([g]) => String(g) === s) || t.chon.find(([, n]) => chuanHoa(n) === c)
        || (c.length >= 3 ? t.chon.find(([, n]) => chuanHoa(n).includes(c)) : null);
      return tim ? { gt: tim[0] } : { loi: `"${s.slice(0, 40)}" không có trong danh sách: ${t.chon.map(([, n]) => n).join('; ')}.` };
    }
    default: return { gt: null };
  }
}

/** Đọc và kiểm tra một dòng. Trả { loi } hoặc { du } là các cột đã làm sạch. */
export function docDong(bang, vao = {}) {
  const du = {};
  for (const t of bang.truong) {
    if (t.kieu === 'tinh') continue;
    const { gt, loi } = docO(t, vao[t.k]);
    if (loi) return { loi: `${t.nhan}: ${loi}` };
    if ((gt === null || gt === undefined) && t.batBuoc) return { loi: `Chưa nhập ${t.nhan.toLowerCase()}.` };
    du[t.k] = gt ?? (t.macDinh !== undefined ? t.macDinh : t.kieu === 'co' ? false : null);
  }
  const loiRangBuoc = bang.kiemTra?.(du);
  return loiRangBuoc ? { loi: loiRangBuoc } : { du };
}

/** Chuyển một dòng trong cơ sở dữ liệu sang dạng gửi giao diện (số ra số, cờ ra true/false, cột tính). */
export function raDong(bang, r) {
  const o = { id: r.id, xa_phuong_id: r.xa_phuong_id, nguoi_sua: r.nguoi_sua_ten ?? null, updated_at: r.updated_at, xoa_luc: r.xoa_luc ?? null };
  if (bang.theoKy) o.ky_id = r.ky_id;
  for (const t of bang.truong) {
    if (t.kieu === 'tinh') o[t.k] = t.cong.reduce((s, k) => s + Number(r[k] || 0), 0);
    else if (t.kieu === 'so' || t.kieu === 'nguyen') o[t.k] = r[t.k] === null || r[t.k] === undefined ? null : Number(r[t.k]);
    else if (t.kieu === 'co') o[t.k] = !!r[t.k];
    else if (t.kieu === 'chon') o[t.k] = r[t.k] === null || r[t.k] === undefined ? null : (typeof t.chon[0][0] === 'number' ? Number(r[t.k]) : r[t.k]);
    else o[t.k] = r[t.k] ?? null;
  }
  return o;
}

/** Hiển thị một giá trị theo kiểu trường — dùng cho tệp xuất và lịch sử. */
export function hienGiaTri(t, v) {
  if (v === null || v === undefined || v === '') return '';
  switch (t.kieu) {
    case 'so': case 'nguyen': case 'tinh': return Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
    case 'chon': return (t.chon.find(([g]) => String(g) === String(v)) || [, String(v)])[1];
    case 'co': return v ? 'Có' : '';
    case 'ngay': { const [y, m, d] = String(v).split('-'); return `${Number(d)}/${Number(m)}/${y}`; }
    default: return String(v);
  }
}
