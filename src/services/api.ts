/** Gọi máy chủ phía du khách. */
import { API_URL } from './adminService';
import type { DiaDiem, DanhGia, ThongKe, DanhGiaGui, LoTrinh, TinTuc, LuuTru } from '../utils/kieu';

/* Mã thiết bị ngẫu nhiên lưu trong trình duyệt: mỗi thiết bị một đánh giá cho
   mỗi điểm, gửi lại là sửa bài cũ. Máy chủ chỉ lưu bản băm của mã này. */
export function maThietBi(): string {
  try {
    let m = localStorage.getItem('dldn_thiet_bi');
    if (!m) { m = crypto.randomUUID(); localStorage.setItem('dldn_thiet_bi', m); }
    return m;
  } catch { return crypto.randomUUID(); }
}
async function goi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/cong-khai${path}`, {
    ...init, headers: { 'Content-Type': 'application/json', 'X-Ma-Thiet-Bi': maThietBi(), ...(init.headers || {}) },
  });
  /* ⚠️ PHẢI KIỂM ĐÚNG LÀ JSON TRƯỚC KHI ĐỌC.
     Lỗi đã xảy ra thật: Netlify thiếu VITE_API_URL nên giao diện gọi nhầm
     /api/... trên chính Netlify. Netlify trả về trang index.html với mã 200,
     mã đọc trang đó thành dữ liệu rỗng rồi gọi .filter -> sập, trắng trang.
     Nay gặp phản hồi không phải JSON thì báo lỗi rõ ràng. */
  if (!(res.headers.get('content-type') || '').includes('application/json')) {
    throw new Error(API_URL ? 'Máy chủ trả về sai định dạng. Kiểm tra máy chủ trên Render có đang chạy không.'
      : 'Chưa cấu hình địa chỉ máy chủ. Khai VITE_API_URL trên Netlify rồi dựng lại.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error((data as { error?: string })?.error || 'Có lỗi xảy ra.') as Error & { canCaptcha?: boolean };
    e.canCaptcha = Boolean((data as { canCaptcha?: boolean })?.canCaptcha); throw e; }
  return data as T;
}
export const layDiaDiem = async () => { const d = await goi<DiaDiem[]>('/dia-diem'); if (!Array.isArray(d)) throw new Error('Dữ liệu địa điểm sai định dạng.'); return d; };
export const layDanhGia = (id: string, sx: string) => goi<DanhGia[]>(`/dia-diem/${encodeURIComponent(id)}/danh-gia?sx=${sx}`);
export const layDanhGiaCuaToi = (id: string) => goi<DanhGiaGui | null>(`/dia-diem/${encodeURIComponent(id)}/cua-toi`);
export const guiDanhGia = (d: DanhGiaGui & { diaDiemId: string; captchaToken?: string }) => goi<{ ok: true }>('/danh-gia', { method: 'POST', body: JSON.stringify(d) });
export const layThongKe = (nam?: string) => goi<ThongKe>(`/thong-ke${nam ? `?nam=${nam}` : ''}`);
export const layLoTrinh = () => goi<LoTrinh[]>('/lo-trinh');
export const layTinTuc = () => goi<TinTuc[]>('/tin-tuc');
export const layLuuTru = () => goi<LuuTru[]>('/luu-tru');
export const guiPhanAnh = (d: { loai: string; diaDiemId?: string; noiDung: string; lienHe?: string; captchaToken?: string }) =>
  goi<{ ok: true }>('/phan-anh', { method: 'POST', body: JSON.stringify(d) });
export const baoDanhGia = (id: number, lyDo = 'khac') => goi<{ ok: true }>(`/danh-gia/${id}/bao`, { method: 'POST', body: JSON.stringify({ lyDo }) });
/** Địa chỉ ảnh địa điểm — ảnh nhớ đệm lâu trên trình duyệt. */
export const anhUrl = (id: number) => `${API_URL}/api/cong-khai/anh/${id}`;
