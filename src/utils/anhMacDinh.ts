/**
 * Ảnh mặc định của địa điểm: ảnh chụp thật, giấy phép tự do (Wikimedia Commons),
 * tải bằng scripts/tai-anh-dia-diem.mjs về public/anh/dia-diem/. Danh sách và
 * thông tin tác giả, giấy phép nằm ở src/du-lieu/anh-dia-diem.json (do script ghi).
 *
 * Thứ tự ưu tiên khi hiện ảnh một điểm: ảnh cán bộ tải lên > ảnh mặc định > khung chờ.
 *
 * Phía người dân KHÔNG hiện tác giả, giấy phép (theo yêu cầu). Vì vậy chỉ được dùng ảnh
 * CC0 hoặc phạm vi công cộng — loại không bắt buộc ghi tác giả; script tải ảnh tự lọc.
 * Ảnh CC BY / CC BY-SA thì bắt buộc ghi công công khai, KHÔNG được đưa vào đây.
 * Nguồn từng ảnh vẫn lưu lại, cán bộ xem ở Quản trị → Nguồn ảnh.
 */
import duLieu from '../du-lieu/anh-dia-diem.json';

export interface AnhMacDinh {
  tep: string; nho: string; rong: number; cao: number; rongNho?: number;
  tacGia: string; giayPhep: string; linkGiayPhep: string | null; nguon: string; moTa: string | null;
}
export const ANH_MAC_DINH = duLieu as Record<string, AnhMacDinh[]>;
export const anhMacDinh = (id: string): AnhMacDinh | null => ANH_MAC_DINH[id]?.[0] || null;
/* Ảnh nhỏ (thẻ) và ảnh lớn (đầu trang): trình duyệt tự chọn theo bề rộng khung. */
export const srcSetMacDinh = (m: AnhMacDinh) => `${m.nho} ${m.rongNho || 960}w, ${m.tep} ${m.rong}w`;
