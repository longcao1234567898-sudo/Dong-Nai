/**
 * DỮ LIỆU MINH HOẠ — KHÔNG PHẢI ĐÁNH GIÁ THẬT. Chỉ nạp ở máy phát triển với
 * ?minh-hoa=1 (xem cheDo.ts). Tên hiển thị cố ý là "Khách minh hoạ N" để
 * không ai nhầm là người thật. Độ dài nhận xét trải từ trống tới đúng 500 ký tự
 * để kiểm tra bố cục; có dấu chồng tiếng Việt và vài bài tiếng Anh.
 */
import type { DuLieuMinhHoa } from './cheDo';

export const MINH_HOA_SENTINEL = 'MINH_HOA_SENTINEL';
const DIEM: Record<string, [string, string]> = {
  'ho-tri-an': ['Hồ Trị An', 'Tri An Lake'], 'vuon-quoc-gia-cat-tien': ['Vườn quốc gia Cát Tiên', 'Cat Tien National Park'],
  'van-mieu-tran-bien': ['Văn miếu Trấn Biên', 'Tran Bien Temple of Literature'], 'thac-dak-mai': ['Thác Đắk Mai', 'Dak Mai Waterfall'],
  'khu-du-lich-buu-long': ['Khu du lịch Bửu Long', 'Buu Long Tourist Area'], 'cu-lao-pho': ['Cù lao Phố', 'Pho Islet'],
};
const DAI = 'Ở đây buổi sáng sương còn phủ mặt hồ, thuyền ra tới giữa hồ thì mặt trời vừa lên. Chúng tôi đi từ Biên Hoà lúc năm giờ, tới nơi khoảng bảy giờ, kịp ăn sáng ở bến rồi thuê thuyền đi vòng quanh mấy đảo nhỏ. Giá thuê thuyền niêm yết rõ, người lái thuyền kể nhiều chuyện về nghề cá lồng. Ước gì có thêm chỗ ngồi có mái che ở bến vì trưa khá nắng. Nhà vệ sinh sạch nhưng hơi xa bến. Lần sau sẽ ở lại một đêm để xem hoàng hôn, nghe nói đẹp hơn cả buổi sáng. Rất nên đi cùng gia đình có trẻ nhỏ, nhớ mang mũ.'.slice(0, 500);
type B = [string, number, string | null, string | null, string | null, string | null, [number, number, number, number]];
const BAI: B[] = [
  ['ho-tri-an', 5, 'Hoàng hôn trên hồ rất đẹp, thuyền đi êm.', 'Khách minh hoạ 1', 'gia-dinh', '2026-08', [5, 4, 4, 4]],
  ['ho-tri-an', 5, DAI, 'Khách minh hoạ 2', 'gia-dinh', '2026-07', [5, 5, 4, 5]],
  ['ho-tri-an', 4, 'Cảnh đẹp, giá thuyền hợp lý. Đường vào hơi bụi.', null, 'ban-be', '2026-06', [5, 4, 3, 4]],
  ['ho-tri-an', 4, null, 'Khách minh hoạ 3', null, '2026-05', [4, 4, 4, 4]],
  ['ho-tri-an', 5, 'Sunrise over the lake was the highlight of our trip.', 'Khách minh hoạ 4', 'cap-doi', '2026-04', [5, 4, 5, 4]],
  ['ho-tri-an', 3, 'Cuối tuần quá đông, chờ thuyền gần một tiếng.', 'Khách minh hoạ có tên hiển thị rất dài 40', 'ban-be', '2026-03', [4, 2, 3, 3]],
  ['ho-tri-an', 5, 'Ước gì ở lại thêm một ngày.', null, 'mot-minh', '2026-02', [5, 5, 5, 5]],
  ['vuon-quoc-gia-cat-tien', 5, 'Đi bộ trong rừng buổi sớm nghe chim hót, hướng dẫn viên rất am hiểu. Nên đặt chỗ trước vào mùa khô.', 'Khách minh hoạ 5', 'ban-be', '2026-01', [5, 5, 4, 4]],
  ['vuon-quoc-gia-cat-tien', 4, 'Rất đẹp nhưng muỗi nhiều, nhớ mang thuốc chống muỗi.', 'Khách minh hoạ 6', 'gia-dinh', '2025-12', [5, 4, 3, 4]],
  ['vuon-quoc-gia-cat-tien', 5, 'Great guided night safari, we saw deer and a slow loris.', null, 'cap-doi', '2025-12', [5, 5, 4, 4]],
  ['vuon-quoc-gia-cat-tien', 4, null, 'Khách minh hoạ 7', null, '2025-11', [4, 4, 4, 3]],
  ['vuon-quoc-gia-cat-tien', 2, 'Phòng nghỉ trong vườn cũ, nước nóng chập chờn.', 'Khách minh hoạ 8', 'mot-minh', '2025-11', [4, 2, 2, 3]],
  ['van-mieu-tran-bien', 5, 'Kiến trúc trang nghiêm, sạch sẽ. Hợp để đưa con đi xin chữ đầu năm.', 'Khách minh hoạ 9', 'gia-dinh', '2026-02', [5, 4, 5, 5]],
  ['van-mieu-tran-bien', 4, 'Yên tĩnh, có chỗ gửi xe rộng.', null, 'mot-minh', '2026-03', [4, 4, 5, 5]],
  ['van-mieu-tran-bien', 4, DAI.slice(0, 260), 'Khách minh hoạ có tên hiển thị rất dài 40', 'ban-be', '2026-01', [4, 4, 4, 5]],
  ['van-mieu-tran-bien', 3, null, 'Khách minh hoạ 10', null, '2025-12', [3, 3, 4, 4]],
  ['thac-dak-mai', 5, 'Đường vào thác Đắk Mai hơi khó đi mùa mưa, nhưng thác rất hùng vĩ.', 'Khách minh hoạ 11', 'ban-be', '2026-09', [5, 3, 4, 4]],
  ['thac-dak-mai', 4, 'Worth the drive. Ask the commune police about border-area rules first.', 'Khách minh hoạ 12', 'ban-be', '2026-08', [5, 3, 4, 4]],
  ['thac-dak-mai', 5, DAI, 'Khách minh hoạ có tên hiển thị rất dài 40', 'gia-dinh', '2026-06', [5, 4, 4, 5]],
  ['thac-dak-mai', 4, 'Nước trong, mát. Nên đi sáng sớm.', null, 'cap-doi', '2026-05', [5, 4, 4, 4]],
  ['khu-du-lich-buu-long', 4, 'Gần trung tâm, đi nửa ngày là vừa.', 'Khách minh hoạ 13', 'gia-dinh', '2026-04', [4, 4, 4, 3]],
  ['khu-du-lich-buu-long', 1, 'Cuối tuần gửi xe bị thu giá cao hơn bảng giá.', 'Khách minh hoạ 14', 'ban-be', '2026-03', [3, 1, 3, 1]],
  ['khu-du-lich-buu-long', 3, null, null, null, '2026-02', [3, 3, 3, 3]],
  ['cu-lao-pho', 4, 'Đi xe đạp quanh cù lao, ghé chùa Đại Giác rất thú vị.', 'Khách minh hoạ 15', 'mot-minh', '2026-07', [4, 4, 4, 5]],
];
const duLieu: DuLieuMinhHoa = {
  danhGia: BAI.map(([id, sao, nhanXet, ten, diCung, thoiDiem, [canhQuan, dichVu, veSinh, giaCa]], i) => ({
    id: -(i + 1), diaDiemId: id, tenDiem: DIEM[id][0], tenDiemEn: DIEM[id][1], sao, nhanXet: nhanXet || '', ten, diCung, thoiDiem,
    luc: new Date(Date.UTC(2026, 8, 30 - i)).toISOString(), minhHoa: true, tieuChi: { canhQuan, dichVu, veSinh, giaCa },
  })),
};
export default duLieu;
