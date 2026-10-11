/**
 * Ảnh mặc định của địa điểm: ảnh chụp thật, giấy phép tự do (Wikimedia Commons),
 * tải bằng scripts/tai-anh-dia-diem.mjs về public/anh/dia-diem/. Danh sách và
 * thông tin tác giả, giấy phép nằm ở src/du-lieu/anh-dia-diem.json (do script ghi).
 *
 * Thứ tự ưu tiên khi hiện ảnh một điểm: ảnh cán bộ tải lên > ảnh mặc định > khung chờ.
 * Giấy phép CC BY / CC BY-SA bắt buộc ghi tác giả: trang /nguon-anh liệt kê đủ,
 * ảnh lớn (đầu trang chủ, trang địa điểm) ghi ngay dưới ảnh.
 */
import duLieu from '../du-lieu/anh-dia-diem.json';

export interface AnhMacDinh {
  tep: string; nho: string; rong: number; cao: number;
  tacGia: string; giayPhep: string; linkGiayPhep: string | null; nguon: string; moTa: string | null;
}
export const ANH_MAC_DINH = duLieu as Record<string, AnhMacDinh[]>;
export const anhMacDinh = (id: string): AnhMacDinh | null => ANH_MAC_DINH[id]?.[0] || null;
/** Dòng ghi công ngắn: "Ảnh: Tên tác giả, CC BY-SA 4.0". */
export const ghiCong = (a: AnhMacDinh, nn: 'vi' | 'en') => `${nn === 'en' ? 'Photo' : 'Ảnh'}: ${a.tacGia}, ${a.giayPhep}`;
