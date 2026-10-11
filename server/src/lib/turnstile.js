/**
 * CAPTCHA chống bot — Cloudflare Turnstile (miễn phí).
 *
 * VÌ SAO: web public rộng rãi -> bot sẽ spam hàng nghìn ý kiến rác,
 * làm phồng database và tốn tiền hosting.
 *
 * Turnstile không bắt người dân chọn ảnh phiền phức như reCAPTCHA cũ.
 *
 * Lấy khoá: dash.cloudflare.com -> Turnstile -> Add site
 *   - Site Key   -> đặt vào FRONTEND: VITE_TURNSTILE_SITE_KEY
 *   - Secret Key -> đặt vào BACKEND:  TURNSTILE_SECRET_KEY
 *
 * Nếu CHƯA cấu hình khoá -> tự động bỏ qua (hệ thống vẫn chạy bình thường).
 */
import crypto from 'node:crypto';
import { layIpThat } from './helpers.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileEnabled() {
  return Boolean((process.env.TURNSTILE_SECRET_KEY || '').trim());
}

/** Trả về { ok: true } hoặc { ok: false, error: '...' } */
export async function verifyTurnstile(token, ip) {
  if (!turnstileEnabled()) return { ok: true }; // chưa bật -> cho qua

  if (!token) return { ok: false, error: 'Vui lòng hoàn tất bước xác minh "Tôi không phải người máy".' };

  try {
    const form = new URLSearchParams();
    form.append('secret', process.env.TURNSTILE_SECRET_KEY.trim());
    form.append('response', token);
    if (ip) form.append('remoteip', ip);

    const r = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    if (data.success) return { ok: true };
    return { ok: false, error: 'Xác minh chống bot thất bại. Vui lòng tải lại trang và thử lại.' };
  } catch (e) {
    console.warn('Turnstile lỗi mạng, tạm cho qua:', e.message);
    return { ok: true }; // lỗi mạng phía Cloudflare -> không chặn người dân thật
  }
}

/* ==========================================================================
   VÉ XÁC MINH — CHỈ TÍCH MỘT LẦN Ở CỔNG VÀO

   Người xem qua ô Turnstile ngay khi mở trang. Máy chủ kiểm mã đó với
   Cloudflare rồi cấp một VÉ có chữ ký HMAC, sống 12 giờ, gắn với địa chỉ IP
   (dạng băm, IPv6 tính theo dải /64 vì điện thoại hay đổi đuôi địa chỉ).
   Các thao tác GỬI (đánh giá, phản ánh, báo vi phạm, đăng nhập cán bộ) chỉ
   kiểm vé, không bắt tích ô lần nữa.

   Vì sao gắn IP: không có thì một lần giải ô ra một vé dùng được từ hàng
   nghìn máy khác. Gắn IP thì mỗi địa chỉ phải tự qua ô, cộng với hạn mức
   theo IP sẵn có ở từng đường gửi.

   Đổi mạng (wifi sang 4G) hoặc hết 12 giờ: máy chủ trả 403 kèm canXacMinh,
   giao diện hiện lại cổng kiểm tra, người dùng xong thì bấm gửi lại — chữ đã
   gõ vẫn giữ nguyên.
   ========================================================================== */
export const HAN_VE_MS = 12 * 60 * 60_000;
/* Khoá riêng cho vé, suy từ JWT_SECRET: lộ vé không giúp gì cho việc giả vé đăng nhập và ngược lại. */
const khoaVe = () => crypto.createHash('sha256').update('ve-xac-minh|' + (process.env.JWT_SECRET || '')).digest();
const ky = (s) => crypto.createHmac('sha256', khoaVe()).update(s).digest('base64url');

/** IPv4: nguyên địa chỉ. IPv6: 4 nhóm đầu (dải /64 của một thuê bao). */
export function nhomIp(ip = '') {
  const s = String(ip).trim().toLowerCase().replace(/^::ffff:(?=\d+\.)/, '');
  if (!s.includes(':')) return s;
  const [dau, cuoi = ''] = s.split('::');
  const a = dau ? dau.split(':') : [];
  const b = cuoi ? cuoi.split(':') : [];
  const du = s.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a;
  return du.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}
const bamIp = (ip) => ky('ip|' + nhomIp(ip)).slice(0, 22);

/** Cấp vé cho IP này. Vé dạng "<ip băm>.<lúc cấp>.<chữ ký>". */
export function capVe(ip, bayGio = Date.now()) {
  const than = `${bamIp(ip)}.${bayGio}`;
  return { ve: `${than}.${ky(than)}`, hetHan: bayGio + HAN_VE_MS };
}

/** Vé hợp lệ, đúng IP, chưa quá tuổi. toiDaTuoiMs ngắn hơn 12 giờ khi cần vé MỚI qua cổng. */
export function kiemVe(ve, ip, { toiDaTuoiMs = HAN_VE_MS, bayGio = Date.now() } = {}) {
  const phan = String(ve || '').split('.');
  if (phan.length !== 3) return false;
  const [h, luc, chuKy] = phan;
  const dung = Buffer.from(ky(`${h}.${luc}`));
  const gui = Buffer.from(chuKy);
  if (dung.length !== gui.length || !crypto.timingSafeEqual(dung, gui)) return false;
  if (h !== bamIp(ip)) return false;
  const tuoi = bayGio - Number(luc);
  return Number.isFinite(tuoi) && tuoi >= -60_000 && tuoi <= Math.min(toiDaTuoiMs, HAN_VE_MS);
}

export const CAN_XAC_MINH = { error: 'Phiên kiểm tra "không phải người máy" đã hết hạn. Làm lại bước kiểm tra rồi bấm gửi lại.', canXacMinh: true };

/** Chặn đường gửi khi thiếu vé. Máy chủ chưa khai khoá Turnstile thì cho qua như trước. */
export function canVeXacMinh(req, res, next) {
  if (!turnstileEnabled() || kiemVe(req.get('X-Xac-Minh'), layIpThat(req))) return next();
  res.status(403).json(CAN_XAC_MINH);
}
