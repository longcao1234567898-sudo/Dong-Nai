import type { Loai, TieuChi } from './kieu';

export const LOAI: Record<Loai, { ten: string; mau: string }> = {
  'thien-nhien': { ten: 'Thiên nhiên – sinh thái', mau: '#1B5E20' },
  'di-tich':     { ten: 'Di tích – văn hoá',       mau: '#1E3A5F' },
  'vui-choi':    { ten: 'Vui chơi – nghỉ dưỡng',   mau: '#d97706' },
  'luu-tru':     { ten: 'Lưu trú',                 mau: '#7c3aed' },
  'am-thuc':     { ten: 'Ẩm thực',                 mau: '#be123c' },
  'dac-san':     { ten: 'Làng nghề – đặc sản',     mau: '#0891b2' },
};
export const TIEU_CHI: [keyof TieuChi, string][] = [['canhQuan', 'Cảnh quan'], ['dichVu', 'Dịch vụ'], ['veSinh', 'Vệ sinh'], ['giaCa', 'Giá cả']];
export const DI_CUNG: Record<string, string> = { 'gia-dinh': 'Gia đình', 'ban-be': 'Bạn bè', 'cap-doi': 'Cặp đôi', 'mot-minh': 'Một mình' };

/* Lịch trình gợi ý — biên soạn sẵn theo cụm điểm gần nhau. */
export const LICH_TRINH = [
  { ten: 'Một ngày di sản bên sông', tg: '1 ngày', mo: 'Văn miếu, núi đá Bửu Long và cù lao Phố — gọn trong một ngày quanh khu Biên Hoà cũ.',
    ids: ['van-mieu-tran-bien', 'khu-du-lich-buu-long', 'cu-lao-pho', 'den-tho-nguyen-huu-canh'] },
  { ten: 'Rừng và hồ cuối tuần', tg: '2 ngày 1 đêm', mo: 'Ngắm hoàng hôn trên hồ Trị An, tắm suối, rồi vào rừng Cát Tiên xem chim.',
    ids: ['ho-tri-an', 'khu-du-lich-suoi-mo', 'vuon-quoc-gia-cat-tien'] },
  { ten: 'Về miền đất đỏ phía bắc', tg: '2 ngày', mo: 'Núi Bà Rá, sóc Bom Bo và thác Đắk Mai giữa rừng Bù Gia Mập.',
    ids: ['nui-ba-ra', 'soc-bom-bo', 'thac-dak-mai', 'vuon-quoc-gia-bu-gia-map'] },
];

export const so = (n: number | null | undefined) => Number(n || 0).toLocaleString('vi-VN');
export const saoChu = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
export const webAnToan = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : '');
export const giamChuyenDong = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
