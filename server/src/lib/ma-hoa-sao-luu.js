/**
 * MÃ HOÁ BẢN SAO LƯU — AES-256-GCM, khoá dẫn xuất từ mật khẩu bằng scrypt.
 *
 * Bản sao lưu chứa toàn bộ cơ sở dữ liệu, kể cả bảng nhạy cảm (vụ việc an
 * ninh, quân số, tôn giáo) và bản băm mật khẩu cán bộ. Tệp đó thường bị chép
 * ra USB, Google Drive — mất USB là lộ hết nếu để dạng chữ thường.
 *
 * Cấu trúc tệp: "DLDN1" | muối 16 byte | iv 12 byte | thẻ xác thực 16 byte | dữ liệu.
 * GCM vừa mã hoá vừa phát hiện tệp bị sửa: sai mật khẩu hay tệp bị đổi một
 * byte là giải mã báo lỗi, không ra dữ liệu rác.
 */
import crypto from 'node:crypto';

const DAU = Buffer.from('DLDN1');

export function kiemKhoa(khoa) {
  if (!khoa || String(khoa).length < 16) return 'KHOA_SAO_LUU cần ít nhất 16 ký tự. Ghi khoá này ra giấy cất riêng — mất khoá là không mở được bản sao lưu.';
  return null;
}

export function maHoa(du, khoa) {
  const muoi = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const k = crypto.scryptSync(String(khoa), muoi, 32);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ma = Buffer.concat([c.update(du), c.final()]);
  return Buffer.concat([DAU, muoi, iv, c.getAuthTag(), ma]);
}

export function giaiMa(tep, khoa) {
  if (tep.length < 49 || !tep.subarray(0, 5).equals(DAU)) throw new Error('Tệp không phải bản sao lưu đã mã hoá của hệ thống.');
  const muoi = tep.subarray(5, 21), iv = tep.subarray(21, 33), the = tep.subarray(33, 49);
  const g = crypto.createDecipheriv('aes-256-gcm', crypto.scryptSync(String(khoa), muoi, 32), iv);
  g.setAuthTag(the);
  try { return Buffer.concat([g.update(tep.subarray(49)), g.final()]); }
  catch { throw new Error('Sai khoá, hoặc tệp đã bị sửa đổi / hỏng.'); }
}
