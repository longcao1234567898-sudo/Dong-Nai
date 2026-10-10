/**
 * HAI NGÔN NGỮ CHO TRANG NGƯỜI DÂN — tiếng Việt và tiếng Anh.
 *
 * Khu cán bộ chỉ tiếng Việt. Trang công khai có nút đổi ngôn ngữ ở đầu trang;
 * lựa chọn nhớ trên trình duyệt. Nội dung do cán bộ nhập (tên, giới thiệu địa
 * điểm, lộ trình, tin tức) có ô tiếng Anh riêng — ô đó trống thì hiện tiếng Việt.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type NN = 'vi' | 'en';

const TU: Record<string, [string, string]> = {
  // ---------- chung
  tenTrang: ['Du lịch Đồng Nai', 'Visit Dong Nai'],
  thanhPho: ['Thành phố Đồng Nai', 'Dong Nai City'],
  khamPha: ['Khám phá', 'Explore'],
  loTrinh: ['Lộ trình', 'Itineraries'],
  luuTru: ['Lưu trú', 'Where to stay'],
  phanAnh: ['Phản ánh', 'Report'],
  thongKe: ['Thống kê', 'Statistics'],
  tinTuc: ['Tin tức, sự kiện', 'News & events'],
  khachQuocTe: ['Hướng dẫn cho khách nước ngoài', 'Guide for foreign visitors'],
  quanTri: ['Quản trị', 'Admin'],
  doiGiaoDien: ['Chuyển giao diện sáng tối', 'Toggle dark mode'],
  doiNgonNgu: ['Switch to English', 'Chuyển sang tiếng Việt'],
  dangTai: ['Đang tải…', 'Loading…'],
  chuaTaiDuoc: ['Chưa tải được dữ liệu', 'Could not load data'],
  dong: ['Đóng', 'Close'],
  chiDuong: ['Chỉ đường', 'Directions'],
  danhGia: ['đánh giá', 'reviews'],
  chuaCoDanhGia: ['Chưa có đánh giá', 'No reviews yet'],
  ngay: ['Ngày', 'Day'],
  chanTrang: ['Du lịch Đồng Nai — thông tin do cán bộ cập nhật. Bản đồ © người đóng góp OpenStreetMap.', 'Visit Dong Nai — information maintained by local officials. Map © OpenStreetMap contributors.'],
  choCanBo: ['Dành cho cán bộ được cấp tài khoản', 'Staff login'],
  soCanBiet: ['Số điện thoại cần biết', 'Useful phone numbers'],
  // ---------- trang chủ
  heroTieuDe: ['DU LỊCH ĐỒNG NAI', 'VISIT DONG NAI'],
  heroMoTa: ['Rừng nguyên sinh, hồ lớn, thác nước và những di tích bên dòng sông Đồng Nai — tra cứu, chỉ đường và xem đánh giá của du khách.',
    'Primary forests, great lakes, waterfalls and heritage sites along the Dong Nai River — find places, get directions and read visitor reviews.'],
  khamPhaBanDo: ['Khám phá bản đồ', 'Explore the map'],
  diemDen: ['điểm đến', 'destinations'],
  xemThongKe: ['Xem thống kê', 'See statistics'],
  luotKhachVaDanhGia: ['Lượt khách và đánh giá', 'Visitors and reviews'],
  saoTrungBinh: ['sao trung bình', 'average rating'],
  danhGiaCuaDuKhach: ['đánh giá của du khách', 'visitor reviews'],
  luotKhachNam: ['lượt khách năm {nam}', 'visits in {nam}'],
  noiBat: ['Điểm đến nổi bật', 'Featured destinations'],
  noiBatMoTa: ['Những nơi được giới thiệu nhiều nhất.', 'The most recommended places.'],
  chuDe: ['Khám phá theo chủ đề', 'Explore by theme'],
  chuDeMoTa: ['Chọn một chủ đề, bản đồ bên dưới sẽ lọc theo.', 'Pick a theme and the map below will filter.'],
  banDo: ['Bản đồ điểm đến', 'Destination map'],
  banDoMoTa: ['Bấm vào một điểm để xem chi tiết và đánh giá. Điểm có vòng sáng là điểm nổi bật.', 'Tap a pin for details and reviews. Glowing pins are featured places.'],
  tatCa: ['Tất cả', 'All'],
  timDiaDiem: ['Tìm theo tên hoặc địa chỉ', 'Search by name or address'],
  khongKhop: ['Không có địa điểm nào khớp. Thử bỏ bớt bộ lọc.', 'No places match. Try removing a filter.'],
  goiYLoTrinh: ['Gợi ý lộ trình', 'Suggested itineraries'],
  goiYLoTrinhMoTa: ['Bấm vào một lộ trình để xem tuyến đi trên bản đồ, quãng đường và chỉ đường.', 'Open an itinerary to see the route, distances and directions.'],
  tuTaoLoTrinh: ['Tự tạo lộ trình', 'Plan your own trip'],
  xepHang: ['Được du khách chấm cao nhất', 'Top rated by visitors'],
  xepHangMoTa: ['Xếp theo số sao trung bình, chỉ tính các điểm đã có đánh giá.', 'Ranked by average stars, rated places only.'],
  chuaXepHang: ['Chưa có đánh giá nào để xếp hạng. Hãy là người đầu tiên đánh giá một điểm đến.', 'No ratings yet. Be the first to review a place.'],
  // ---------- chi tiết địa điểm
  vietDanhGia: ['Viết đánh giá', 'Write a review'],
  dongFormDanhGia: ['Đóng form đánh giá', 'Close review form'],
  duKhachNoiGi: ['Du khách nói gì', 'What visitors say'],
  moiNhat: ['Mới nhất', 'Newest'], saoCao: ['Sao cao', 'Highest'], saoThap: ['Sao thấp', 'Lowest'],
  dangTaiDanhGia: ['Đang tải đánh giá…', 'Loading reviews…'],
  chuaCoDanhGiaNao: ['Chưa có đánh giá nào. Bạn có thể là người đầu tiên.', 'No reviews yet. Be the first.'],
  xemTrangRieng: ['Xem trang riêng', 'Open full page'],
  guiPhanAnhDiemNay: ['Phản ánh về điểm này', 'Report a problem here'],
  baoViPham: ['Báo vi phạm', 'Report'],
  daBao: ['Đã báo — cảm ơn bạn', 'Reported — thank you'],
  duKhach: ['Du khách', 'Visitor'],
  danhGiaChung: ['Đánh giá chung', 'Overall rating'],
  suaDanhGia: ['Sửa đánh giá của bạn', 'Edit your review'],
  chamTieuChi: ['Chấm thêm từng tiêu chí (không bắt buộc)', 'Rate each aspect (optional)'],
  diCungAi: ['Bạn đi cùng ai', 'Who did you travel with'],
  diVaoThang: ['Đi vào tháng', 'Month of visit'],
  tenHienThi: ['Tên hiển thị', 'Display name'],
  khongBatBuoc: ['Không bắt buộc', 'Optional'],
  nhanXet: ['Nhận xét', 'Comment'],
  nhanXetGoiY: ['Cảnh quan, dịch vụ, đường đi…', 'Scenery, service, access…'],
  guiDanhGia: ['Gửi đánh giá', 'Submit review'],
  dangGui: ['Đang gửi…', 'Sending…'],
  daGuiDanhGia: ['Đã gửi đánh giá. Cảm ơn bạn đã chia sẻ.', 'Review sent. Thank you for sharing.'],
  chonSao: ['Chọn số sao đánh giá chung trước khi gửi.', 'Choose an overall star rating first.'],
  tichXacMinh: ['Vui lòng tích ô "Tôi không phải là người máy".', 'Please tick "I am not a robot".'],
  sao: ['sao', 'stars'],
  // ---------- lộ trình
  loTrinhTieuDe: ['Lộ trình du lịch', 'Travel itineraries'],
  loTrinhMoTa: ['Lộ trình do cán bộ du lịch gợi ý. Mở từng lộ trình để xem bản đồ tuyến đi, từng ngày và chỉ đường.', 'Itineraries suggested by local tourism officials. Open one for its route map, day-by-day plan and directions.'],
  diem: ['điểm', 'stops'],
  quangDuong: ['Khoảng {km} km đường chim bay giữa các điểm — đường đi thực tế dài hơn.', 'About {km} km in a straight line between stops — actual roads are longer.'],
  moGoogleMaps: ['Mở chỉ đường cả tuyến trên Google Maps', 'Open the full route in Google Maps'],
  khongCoLoTrinh: ['Không tìm thấy lộ trình này.', 'Itinerary not found.'],
  tatCaLoTrinh: ['Tất cả lộ trình', 'All itineraries'],
  tuTaoMoTa: ['Chọn các điểm muốn đi theo thứ tự, xem tuyến trên bản đồ, rồi mở chỉ đường hoặc gửi đường dẫn cho bạn đồng hành.', 'Pick the places you want in order, see the route on the map, then open directions or share the link with your companions.'],
  themDiem: ['Thêm điểm vào lộ trình', 'Add a stop'],
  chonDiaDiem: ['— Chọn địa điểm —', '— Choose a place —'],
  chuaChonDiem: ['Chưa chọn điểm nào. Chọn ở ô trên hoặc bấm vào điểm trên bản đồ.', 'No stops yet. Choose above or tap a pin on the map.'],
  len: ['Lên', 'Up'], xuong: ['Xuống', 'Down'], bo: ['Bỏ', 'Remove'],
  chepDuongDan: ['Chép đường dẫn chia sẻ', 'Copy share link'],
  daChep: ['Đã chép đường dẫn.', 'Link copied.'],
  // ---------- lưu trú
  luuTruTieuDe: ['Resort, khu nghỉ dưỡng', 'Resorts and retreats'],
  luuTruMoTa: ['Danh sách cơ sở lưu trú do cán bộ xác nhận, kèm hạng sao đã được công nhận.', 'Accommodation verified by local officials, with their official star rating.'],
  chuaXepHangSao: ['Chưa xếp hạng sao', 'Not yet star-rated'],
  khongCoLuuTru: ['Chưa có cơ sở nào được công bố.', 'No listings published yet.'],
  luuYTamTru: ['Khách nước ngoài: nơi lưu trú có trách nhiệm khai báo tạm trú cho bạn — nhớ xuất trình hộ chiếu khi nhận phòng.', 'Foreign visitors: your accommodation must register your temporary residence — show your passport at check-in.'],
  // ---------- phản ánh
  phanAnhTieuDe: ['Gửi phản ánh', 'Report a problem'],
  phanAnhMoTa: ['Gặp chặt chém, mất an ninh, mất vệ sinh, nguy hiểm…? Gửi cho cán bộ địa phương. Bạn nhận một mã để tra cứu kết quả xử lý.', 'Overcharging, theft, dirty facilities, danger…? Tell local officials. You will get a code to track how it is handled.'],
  khanCap: ['Đang gặp nguy hiểm? Gọi ngay 113 (công an), 114 (cứu hộ), 115 (cấp cứu).', 'In danger now? Call 113 (police), 114 (rescue) or 115 (ambulance).'],
  loaiPhanAnh: ['Loại phản ánh', 'Type of problem'],
  diaDiemLienQuan: ['Địa điểm liên quan (nếu có)', 'Related place (if any)'],
  noiDungPhanAnh: ['Nội dung: chuyện gì, ở đâu, lúc nào', 'What happened, where and when'],
  lienHe: ['Số điện thoại hoặc email để cán bộ liên hệ lại (không bắt buộc, không công khai)', 'Phone or email so officials can contact you (optional, never published)'],
  guiPhanAnh: ['Gửi phản ánh', 'Send report'],
  daGuiPhanAnh: ['Đã gửi. Mã tra cứu của bạn:', 'Sent. Your tracking code:'],
  ghiLaiMa: ['Ghi lại mã này để tra cứu kết quả xử lý.', 'Keep this code to check the outcome.'],
  traCuu: ['Tra cứu kết quả', 'Check status'],
  nhapMa: ['Nhập mã tra cứu 8 ký tự', 'Enter your 8-character code'],
  traLoiCuaCanBo: ['Trả lời của cán bộ', 'Officials’ reply'],
  guiLuc: ['Gửi lúc', 'Sent'],
  // ---------- tin tức, thống kê
  tinTucMoTa: ['Cảnh báo, sự kiện và thông báo từ cán bộ du lịch thành phố.', 'Alerts, events and notices from city tourism officials.'],
  khongCoTin: ['Hiện chưa có tin nào.', 'No news at the moment.'],
  canhBao: ['Cảnh báo', 'Alert'], suKien: ['Sự kiện', 'Event'], thongBao: ['Thông báo', 'Notice'],
  tu: ['Từ', 'From'], den: ['đến', 'to'],
  khachTheoXa: ['Khách du lịch theo xã/phường', 'Visitors by commune/ward'],
  khachTheoXaMoTa: ['Kỳ {ky} — chỉ gồm số liệu các xã/phường đã chốt báo cáo.', 'Period: {ky} — only communes/wards that have finalised their report.'],
  trongNuoc: ['Trong nước', 'Domestic'], quocTe: ['Quốc tế', 'International'],
};

const LOAI_PA: Record<string, [string, string]> = {
  'gia-ca': ['Chặt chém, nâng giá', 'Overcharging'], 'an-ninh': ['Mất an ninh, trộm cắp, lừa đảo', 'Theft, scams, public order'],
  've-sinh': ['Vệ sinh, môi trường', 'Cleanliness, environment'], 'dich-vu': ['Thái độ, chất lượng dịch vụ', 'Service quality'],
  'an-toan': ['Nguy hiểm, mất an toàn', 'Safety hazard'], khac: ['Khác', 'Other'],
};
const TRANG_THAI_PA: Record<string, [string, string]> = {
  moi: ['Đã nhận, chờ xử lý', 'Received, awaiting action'], 'dang-xu-ly': ['Đang xử lý', 'In progress'],
  'da-xu-ly': ['Đã xử lý', 'Resolved'], 'khong-xu-ly': ['Không thuộc phạm vi xử lý', 'Outside our remit'],
};

interface Ctx { nn: NN; doi: () => void; t: (k: string, bien?: Record<string, string | number>) => string;
  chon: (vi: string | null | undefined, en: string | null | undefined) => string; loaiPA: (k: string) => string; trangThaiPA: (k: string) => string;
  ngay: (d: string | Date | null | undefined) => string }
const NgonNguCtx = createContext<Ctx | null>(null);

export function NgonNguProvider({ children }: { children: ReactNode }) {
  const [nn, setNn] = useState<NN>(() => { try { return localStorage.getItem('dldn_nn') === 'en' ? 'en' : 'vi'; } catch { return 'vi'; } });
  useEffect(() => { document.documentElement.lang = nn; try { localStorage.setItem('dldn_nn', nn); } catch { /* bỏ qua */ } }, [nn]);
  const t = useCallback((k: string, bien?: Record<string, string | number>) => {
    let s = TU[k]?.[nn === 'en' ? 1 : 0] ?? k;
    if (bien) for (const [a, b] of Object.entries(bien)) s = s.replace(`{${a}}`, String(b));
    return s;
  }, [nn]);
  const gia = {
    nn, t, doi: () => setNn((x) => (x === 'vi' ? 'en' : 'vi')),
    /* Nội dung cán bộ nhập: có bản tiếng Anh thì dùng, không thì tiếng Việt. */
    chon: (vi: string | null | undefined, en: string | null | undefined) => (nn === 'en' && en ? en : vi || ''),
    loaiPA: (k: string) => LOAI_PA[k]?.[nn === 'en' ? 1 : 0] ?? k,
    trangThaiPA: (k: string) => TRANG_THAI_PA[k]?.[nn === 'en' ? 1 : 0] ?? k,
    ngay: (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString(nn === 'en' ? 'en-GB' : 'vi-VN') : ''),
  };
  return <NgonNguCtx.Provider value={gia}>{children}</NgonNguCtx.Provider>;
}

export function useNN() {
  const c = useContext(NgonNguCtx);
  if (!c) throw new Error('useNN phải nằm trong NgonNguProvider');
  return c;
}
export const DS_LOAI_PA = Object.keys(LOAI_PA);
