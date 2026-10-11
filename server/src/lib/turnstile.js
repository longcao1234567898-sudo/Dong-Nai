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
   VÉ XÁC MINH — CHỈ TÍCH Ở CỔNG VÀO TRANG DU KHÁCH, MỖI THIẾT BỊ MỖI GIỜ MỘT LẦN

   Du khách qua ô Turnstile khi mở trang. Máy chủ kiểm mã đó với Cloudflare rồi
   cấp một VÉ có chữ ký HMAC, sống 1 giờ, gắn với MÃ THIẾT BỊ (đầu X-Ma-Thiet-Bi,
   mã ngẫu nhiên trình duyệt tự tạo, dùng sẵn cho "mỗi máy một đánh giá").
   Các thao tác GỬI của du khách (đánh giá, phản ánh, báo vi phạm) chỉ kiểm vé.
   Khu cán bộ KHÔNG dùng vé: đăng nhập đã có giới hạn lượt sai theo IP và xác
   thực hai lớp.

   Vì sao gắn mã thiết bị chứ không gắn IP: Render đặt nhiều tầng proxy phía
   trước, địa chỉ máy chủ nhìn thấy có thể đổi giữa hai lần gọi, và điện thoại
   đổi mạng liên tục — vé gắn IP bị từ chối oan ("phiên kiểm tra đã hết hạn").
   Kẻ phá dùng chung một mã thiết bị cho nhiều máy thì vẫn vướng hạn mức theo
   IP ở từng đường gửi và luật mỗi thiết bị một đánh giá mỗi điểm.

   Hết giờ: máy chủ trả 403 kèm canXacMinh, giao diện hiện lại cổng, người dùng
   xong thì bấm gửi lại — chữ đã gõ vẫn giữ nguyên.
   ========================================================================== */
export const HAN_VE_MS = 60 * 60_000;
/* Khoá riêng cho vé, suy từ JWT_SECRET: lộ vé không giúp gì cho việc giả vé đăng nhập và ngược lại. */
const khoaVe = () => crypto.createHash('sha256').update('ve-xac-minh|' + (process.env.JWT_SECRET || '')).digest();
const ky = (s) => crypto.createHmac('sha256', khoaVe()).update(s).digest('base64url');
export const maThietBiHopLe = (m) => /^[a-f0-9-]{20,64}$/i.test(String(m || ''));
const bamMay = (may) => ky('may|' + String(may || '').toLowerCase()).slice(0, 22);

/** Cấp vé cho thiết bị này. Vé dạng "<mã thiết bị băm>.<lúc cấp>.<chữ ký>". */
export function capVe(may, bayGio = Date.now()) {
  const than = `${bamMay(may)}.${bayGio}`;
  return { ve: `${than}.${ky(than)}`, hetHan: bayGio + HAN_VE_MS };
}

/** Vé hợp lệ, đúng thiết bị, chưa quá 1 giờ. */
export function kiemVe(ve, may, { bayGio = Date.now() } = {}) {
  if (!maThietBiHopLe(may)) return false;
  const phan = String(ve || '').split('.');
  if (phan.length !== 3) return false;
  const [h, luc, chuKy] = phan;
  const dung = Buffer.from(ky(`${h}.${luc}`));
  const gui = Buffer.from(chuKy);
  if (dung.length !== gui.length || !crypto.timingSafeEqual(dung, gui)) return false;
  if (h !== bamMay(may)) return false;
  const tuoi = bayGio - Number(luc);
  return Number.isFinite(tuoi) && tuoi >= -60_000 && tuoi <= HAN_VE_MS;
}

export const CAN_XAC_MINH = { error: 'Phiên kiểm tra "không phải người máy" đã hết hạn. Làm lại bước kiểm tra rồi bấm gửi lại.', canXacMinh: true };

/** Chặn đường gửi của du khách khi thiếu vé. Máy chủ chưa khai khoá Turnstile thì cho qua như trước. */
export function canVeXacMinh(req, res, next) {
  if (!turnstileEnabled() || kiemVe(req.get('X-Xac-Minh'), req.get('X-Ma-Thiet-Bi'))) return next();
  res.status(403).json(CAN_XAC_MINH);
}
