/**
 * VÉ XÁC MINH "KHÔNG PHẢI NGƯỜI MÁY" — lấy một lần ở cổng vào (CongXacMinh.tsx).
 *
 * Máy chủ cấp vé 12 giờ gắn với IP. Mọi lần gửi (đánh giá, phản ánh, báo vi
 * phạm, đăng nhập cán bộ) kèm vé trong đầu X-Xac-Minh. Vé hết hạn hoặc đổi
 * mạng thì máy chủ trả 403 canXacMinh -> boVe() -> cổng kiểm tra hiện lại.
 */
/** Khoá công khai Turnstile (Site Key). Trống = tắt cổng kiểm tra. */
export const SITE_KEY = ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '').trim();
export const captchaEnabled = Boolean(SITE_KEY);
const KHOA = 'dldn_xac_minh';
export const SU_KIEN_CAN_XAC_MINH = 'can-xac-minh';
/** Máy chủ chưa khai khoá bí mật: vé đặc biệt, máy chủ không đọc tới. */
export const VE_TAT = 'tat';

let nho: { ve: string; hetHan: number } | null = null;

export function layVe(): string | null {
  if (!nho) {
    try { nho = JSON.parse(localStorage.getItem(KHOA) || 'null'); } catch { nho = null; }
  }
  /* Còn dưới một phút thì coi như hết: tránh gửi vé vừa kịp hết hạn trên đường đi. */
  return nho && typeof nho.ve === 'string' && nho.hetHan - Date.now() > 60_000 ? nho.ve : null;
}

export function luuVe(ve: string, hetHan: number) {
  nho = { ve, hetHan };
  try { localStorage.setItem(KHOA, JSON.stringify(nho)); } catch { /* chế độ riêng tư: giữ trong bộ nhớ */ }
}

/** Bỏ vé và báo cổng kiểm tra hiện lại. */
export function boVe() {
  nho = null;
  try { localStorage.removeItem(KHOA); } catch { /* bỏ qua */ }
  window.dispatchEvent(new Event(SU_KIEN_CAN_XAC_MINH));
}

export function dauXacMinh(): Record<string, string> {
  const ve = layVe();
  return ve && ve !== VE_TAT ? { 'X-Xac-Minh': ve } : {};
}

/** Máy chủ đòi vé (403 canXacMinh): hiện lại cổng kiểm tra. Trình duyệt chưa có
    site key thì cổng không bao giờ hiện, không ai gửi được — nói rõ cho quản trị. */
export function xuLyCanXacMinh(): string | null {
  if (!captchaEnabled) return 'Máy chủ đã bật kiểm tra chống người máy (TURNSTILE_SECRET_KEY) nhưng trang web chưa khai VITE_TURNSTILE_SITE_KEY. Khai biến này trên Netlify rồi dựng lại.';
  boVe();
  return null;
}
