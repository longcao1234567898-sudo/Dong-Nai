/** Gọi máy chủ phía du khách. */
import { API_URL } from './adminService';
import type { DiaDiem, DanhGia, ThongKe, DanhGiaGui } from '../utils/kieu';

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error((data as { error?: string })?.error || 'Có lỗi xảy ra.') as Error & { canCaptcha?: boolean };
    e.canCaptcha = Boolean((data as { canCaptcha?: boolean })?.canCaptcha); throw e; }
  return data as T;
}
export const layDiaDiem = () => goi<DiaDiem[]>('/dia-diem');
export const layDanhGia = (id: string, sx: string) => goi<DanhGia[]>(`/dia-diem/${encodeURIComponent(id)}/danh-gia?sx=${sx}`);
export const layDanhGiaCuaToi = (id: string) => goi<DanhGiaGui | null>(`/dia-diem/${encodeURIComponent(id)}/cua-toi`);
export const guiDanhGia = (d: DanhGiaGui & { diaDiemId: string; captchaToken?: string }) => goi<{ ok: true }>('/danh-gia', { method: 'POST', body: JSON.stringify(d) });
export const layThongKe = (nam?: string) => goi<ThongKe>(`/thong-ke${nam ? `?nam=${nam}` : ''}`);
