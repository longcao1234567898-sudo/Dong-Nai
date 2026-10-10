/**
 * Gọi máy chủ phía cán bộ — cùng cơ chế với Điểm Chạm An Ninh:
 * access token giữ trong bộ nhớ (mất khi tải lại trang), refresh token nằm
 * trong cookie httpOnly để khôi phục phiên. Gặp 401 thì tự làm mới một lần.
 */
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || '').trim().replace(/\/$/, '');
const hasBackend = Boolean(API_URL) || import.meta.env.DEV;
const laJson = (r: Response) => (r.headers.get('content-type') || '').includes('application/json');
if (!API_URL && !import.meta.env.DEV) console.error('[cấu hình] Thiếu VITE_API_URL — giao diện không gọi được máy chủ. Khai trên Netlify rồi dựng lại.');

export interface StaffInfo {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'handler';
}
export class LoginError extends Error {
  canCaptcha: boolean;
  constructor(message: string, canCaptcha = false) {
    super(message);
    this.canCaptcha = canCaptcha;
  }
}

let accessToken: string | null = null;

export async function login(username: string, password: string, captchaToken?: string): Promise<StaffInfo> {
  if (!hasBackend) throw new Error('Chưa cấu hình máy chủ. Khai VITE_API_URL rồi dựng lại.');
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, captchaToken }), credentials: 'include',
  });
  if (!laJson(res)) throw new LoginError('Chưa kết nối được máy chủ. Kiểm tra cấu hình VITE_API_URL.');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { error?: string; canCaptcha?: boolean };
    throw new LoginError(d?.error || 'Đăng nhập thất bại.', Boolean(d?.canCaptcha));
  }
  accessToken = data.accessToken;
  return data.staff as StaffInfo;
}
export async function restoreSession(): Promise<StaffInfo | null> {
  if (!hasBackend) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok || !laJson(res)) return null;
    const data = await res.json();
    accessToken = data.accessToken;
    return data.staff as StaffInfo;
  } catch { return null; }
}
export async function logout(): Promise<void> {
  try { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { /* bỏ qua */ }
  accessToken = null;
}
export async function adminFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_URL}/api/quan-tri${path}`, {
    ...options, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(options.headers || {}) },
  });
  if (res.status === 401 && retry) {
    const s = await restoreSession();
    if (s) return adminFetch<T>(path, options, false);
    window.dispatchEvent(new Event('phien-het-han'));
  }
  if (!laJson(res)) throw new Error('Máy chủ trả về sai định dạng. Kiểm tra VITE_API_URL và máy chủ trên Render.');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Có lỗi xảy ra.');
  return data as T;
}
/** Tải tệp xuất dữ liệu — cần token nên không dùng thẻ liên kết thường được. */
export async function taiTepXuat(): Promise<void> {
  const du = await adminFetch<unknown>('/xuat');
  const url = URL.createObjectURL(new Blob([JSON.stringify(du, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'du-lieu-du-lich-dong-nai.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
