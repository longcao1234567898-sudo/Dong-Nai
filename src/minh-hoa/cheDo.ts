/**
 * Chế độ dữ liệu minh hoạ — CHỈ để trình diễn bố cục và chụp ảnh nghiệm thu.
 * Bật khi chạy máy phát triển (npm run dev) và đường dẫn có ?minh-hoa=1.
 * Bản build production: import.meta.env.DEV là false nên nhánh nạp dữ liệu bị
 * loại hẳn, tệp duLieuMinhHoa.ts không có trong gói. Không bao giờ ghi vào cơ sở dữ liệu.
 */
import type { DanhGiaMoi, TieuChi } from '../utils/kieu';

export interface DuLieuMinhHoa { danhGia: (DanhGiaMoi & { tieuChi: TieuChi })[] }
export const cheDoMinhHoa = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('minh-hoa');
export const napMinhHoa: () => Promise<DuLieuMinhHoa | null> = import.meta.env.DEV
  ? () => (cheDoMinhHoa ? import('./duLieuMinhHoa').then((m) => m.default) : Promise.resolve(null))
  : () => Promise.resolve(null);
