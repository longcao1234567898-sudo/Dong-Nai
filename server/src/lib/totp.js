/**
 * MÃ XÁC THỰC MỘT LẦN THEO THỜI GIAN (TOTP, RFC 6238) — xác thực hai lớp.
 *
 * Cùng chuẩn với Google Authenticator, Microsoft Authenticator: mã 6 số, đổi
 * mỗi 30 giây, tính từ khoá bí mật chung giữa máy chủ và điện thoại. Tự viết
 * bằng thư viện crypto có sẵn của Node (vài chục dòng) thay vì thêm gói ngoài.
 *
 * Chấp nhận lệch một nhịp (±30 giây) vì đồng hồ điện thoại hay chạy lệch.
 * Mã đã dùng thì không dùng lại được (lưu nhịp cuối cùng đã dùng): kẻ đứng
 * nhìn trộm màn hình chép được mã cũng không đăng nhập lại bằng mã đó.
 */
import crypto from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function maHoaBase32(buf) {
  let bit = 0, gt = 0, ra = '';
  for (const b of buf) {
    gt = (gt << 8) | b; bit += 8;
    while (bit >= 5) { ra += B32[(gt >>> (bit - 5)) & 31]; bit -= 5; }
  }
  if (bit > 0) ra += B32[(gt << (5 - bit)) & 31];
  return ra;
}
export function giaiBase32(s) {
  const sach = String(s).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bit = 0, gt = 0; const ra = [];
  for (const k of sach) {
    gt = (gt << 5) | B32.indexOf(k); bit += 5;
    if (bit >= 8) { ra.push((gt >>> (bit - 8)) & 255); bit -= 8; }
  }
  return Buffer.from(ra);
}

/** Khoá bí mật mới: 20 byte ngẫu nhiên (160 bit, đúng khuyến nghị của RFC 4226). */
export const taoBiMat = () => maHoaBase32(crypto.randomBytes(20));

/** Mã 6 số của một nhịp thời gian. */
export function maCuaBuoc(biMat, buoc) {
  const dem = Buffer.alloc(8);
  dem.writeBigUInt64BE(BigInt(buoc));
  const h = crypto.createHmac('sha1', giaiBase32(biMat)).update(dem).digest();
  const lech = h[h.length - 1] & 15;
  const so = ((h[lech] & 127) << 24) | (h[lech + 1] << 16) | (h[lech + 2] << 8) | h[lech + 3];
  return String(so % 1_000_000).padStart(6, '0');
}

/** Kiểm mã người dùng nhập. Trả { ok, buoc } — lưu buoc để chặn dùng lại. */
export function kiemMa(biMat, ma, { buocCuoi = null, luc = Date.now() } = {}) {
  const m = String(ma ?? '').replace(/\s/g, '');
  if (!biMat || !/^\d{6}$/.test(m)) return { ok: false };
  const hienTai = Math.floor(luc / 30_000);
  for (const d of [0, -1, 1]) {
    const buoc = hienTai + d;
    if (buocCuoi !== null && buocCuoi !== undefined && buoc <= Number(buocCuoi)) continue;
    if (crypto.timingSafeEqual(Buffer.from(maCuaBuoc(biMat, buoc)), Buffer.from(m))) return { ok: true, buoc };
  }
  return { ok: false };
}

/** Đường dẫn để ứng dụng xác thực quét mã QR. */
export const duongDanOtp = (biMat, tenDangNhap) =>
  `otpauth://totp/${encodeURIComponent(`Du lịch Đồng Nai:${tenDangNhap}`)}?secret=${biMat}&issuer=${encodeURIComponent('Du lịch Đồng Nai')}&algorithm=SHA1&digits=6&period=30`;
