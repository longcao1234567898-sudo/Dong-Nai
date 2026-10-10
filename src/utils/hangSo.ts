import type { Loai, TieuChi } from './kieu';

export const LOAI: Record<Loai, { ten: string; en: string; mau: string }> = {
  'thien-nhien': { ten: 'Thiên nhiên – sinh thái', en: 'Nature & eco-tourism', mau: '#1B5E20' },
  'di-tich':     { ten: 'Di tích – văn hoá',       en: 'Heritage & culture',   mau: '#1E3A5F' },
  'vui-choi':    { ten: 'Vui chơi – nghỉ dưỡng',   en: 'Leisure & resorts',    mau: '#d97706' },
  'luu-tru':     { ten: 'Lưu trú',                 en: 'Accommodation',        mau: '#7c3aed' },
  'am-thuc':     { ten: 'Ẩm thực',                 en: 'Food',                 mau: '#be123c' },
  'dac-san':     { ten: 'Làng nghề – đặc sản',     en: 'Crafts & specialties', mau: '#0891b2' },
};
export const TIEU_CHI: [keyof TieuChi, string, string][] = [['canhQuan', 'Cảnh quan', 'Scenery'], ['dichVu', 'Dịch vụ', 'Service'], ['veSinh', 'Vệ sinh', 'Cleanliness'], ['giaCa', 'Giá cả', 'Price']];
export const DI_CUNG: Record<string, [string, string]> = { 'gia-dinh': ['Gia đình', 'Family'], 'ban-be': ['Bạn bè', 'Friends'], 'cap-doi': ['Cặp đôi', 'Couple'], 'mot-minh': ['Một mình', 'Solo'] };

/* Lộ trình gợi ý nay nằm trong cơ sở dữ liệu (bảng lich_trinh), cán bộ sửa ở mục Lộ trình. */

/** Khoảng cách đường chim bay giữa hai toạ độ (km) — công thức haversine. */
export function khoangCachKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/** Đường dẫn chỉ đường Google Maps đi qua nhiều điểm theo thứ tự (tối đa 9 điểm dừng giữa đường). */
export function duongDanChiDuong(ds: { lat: number; lng: number }[]) {
  if (!ds.length) return '';
  const toa = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;
  if (ds.length === 1) return `https://www.google.com/maps/dir/?api=1&destination=${toa(ds[0])}`;
  const giua = ds.slice(1, -1).slice(0, 9).map(toa).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${toa(ds[0])}&destination=${toa(ds[ds.length - 1])}${giua ? `&waypoints=${encodeURIComponent(giua)}` : ''}&travelmode=driving`;
}

export const so = (n: number | null | undefined) => Number(n || 0).toLocaleString('vi-VN');
export const saoChu = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
export const webAnToan = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : '');
export const giamChuyenDong = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
