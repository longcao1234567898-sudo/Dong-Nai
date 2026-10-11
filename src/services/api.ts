/** Gọi máy chủ phía du khách. */
import { API_URL } from './adminService';
import { dauXacMinh, luuVe, VE_TAT, xuLyCanXacMinh } from './xacMinh';
import type { DiaDiem, DanhGia, DanhGiaMoi, ThongKe, DanhGiaGui, LoTrinh, TinTuc, LuuTru } from '../utils/kieu';

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
  /* Không để trang xoay "Đang tải…" mãi khi máy chủ không trả lời (Render ngủ thì
     khởi động mất 30–60 giây; quá 75 giây là máy chủ có vấn đề) — báo lỗi rõ ràng. */
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/cong-khai${path}`, {
      signal: AbortSignal.timeout(75_000),
      ...init, headers: { 'Content-Type': 'application/json', 'X-Ma-Thiet-Bi': maThietBi(), ...dauXacMinh(), ...(init.headers || {}) },
    });
  } catch (e) {
    throw new Error((e as Error).name === 'TimeoutError'
      ? 'Máy chủ chưa trả lời sau hơn một phút. Máy chủ có thể đang khởi động hoặc gặp lỗi — tải lại trang sau ít phút.'
      : 'Không kết nối được máy chủ. Kiểm tra mạng, hoặc máy chủ đang tắt, hoặc chưa cho phép địa chỉ trang này (CORS_ORIGIN).');
  }
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
  if (!res.ok) {
    const loiCauHinh = (data as { canXacMinh?: boolean })?.canXacMinh ? xuLyCanXacMinh() : null;
    const e = new Error(loiCauHinh || (data as { error?: string })?.error || 'Có lỗi xảy ra.') as LoiApi;
    e.trangThai = res.status;
    throw e;
  }
  return data as T;
}
/** Lỗi máy chủ trả về kèm mã trạng thái HTTP (không có = không tới được máy chủ). */
export type LoiApi = Error & { trangThai?: number };
/** Cổng vào: đổi mã Turnstile lấy vé 1 giờ cho thiết bị này. Chờ tối đa 90 giây: máy chủ Render gói miễn phí
    ngủ khi vắng khách, lần gọi đầu phải đợi nó khởi động (thường 30–60 giây). */
export async function doiVeXacMinh(token: string): Promise<void> {
  const d = await goi<{ ve: string | null; hetHan?: number; tat?: boolean }>('/xac-minh',
    { method: 'POST', body: JSON.stringify({ token }), signal: AbortSignal.timeout(90_000) });
  luuVe(d.ve || VE_TAT, d.hetHan || Date.now() + 3_600_000);
}
export const layDiaDiem = async () => { const d = await goi<DiaDiem[]>('/dia-diem'); if (!Array.isArray(d)) throw new Error('Dữ liệu địa điểm sai định dạng.'); return d; };
export const layChiTiet = (id: string) => goi<{ chiTiet: string | null; chiTietEn: string | null }>(`/dia-diem/${encodeURIComponent(id)}/chi-tiet`);
export const layDanhGia = (id: string, sx: string) => goi<DanhGia[]>(`/dia-diem/${encodeURIComponent(id)}/danh-gia?sx=${sx}`);
export const layDanhGiaCuaToi = (id: string) => goi<DanhGiaGui | null>(`/dia-diem/${encodeURIComponent(id)}/cua-toi`);
export const guiDanhGia = (d: DanhGiaGui & { diaDiemId: string }) => goi<{ ok: true }>('/danh-gia', { method: 'POST', body: JSON.stringify(d) });
export const layThongKe = (nam?: string) => goi<ThongKe>(`/thong-ke${nam ? `?nam=${nam}` : ''}`);
export const layLoTrinh = () => goi<LoTrinh[]>('/lo-trinh');
export const layDanhGiaMoiNhat = (gioiHan = 6) => goi<DanhGiaMoi[]>(`/danh-gia/moi-nhat?gioiHan=${gioiHan}`);
export const layTinTuc = () => goi<TinTuc[]>('/tin-tuc');
export const layLuuTru = () => goi<LuuTru[]>('/luu-tru');
export const guiPhanAnh = (d: { loai: string; diaDiemId?: string; noiDung: string; lienHe?: string }) =>
  goi<{ ok: true }>('/phan-anh', { method: 'POST', body: JSON.stringify(d) });
export const baoDanhGia = (id: number, lyDo = 'khac') => goi<{ ok: true }>(`/danh-gia/${id}/bao`, { method: 'POST', body: JSON.stringify({ lyDo }) });
/** Địa chỉ ảnh địa điểm — ảnh nhớ đệm lâu trên trình duyệt. */
export const anhUrl = (id: number) => `${API_URL}/api/cong-khai/anh/${id}`;
