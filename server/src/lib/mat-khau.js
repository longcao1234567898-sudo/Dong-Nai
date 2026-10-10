/**
 * KIỂM ĐỘ MẠNH MẬT KHẨU — dùng chung cho lệnh tạo tài khoản và trang tự đổi
 * mật khẩu, để hai nơi không bao giờ đòi hai chuẩn khác nhau.
 *
 * Tối thiểu 12 ký tự, đủ bốn loại ký tự: 12 ký tự trộn bốn loại cho số tổ hợp
 * lớn gấp hàng tỉ tỉ lần mật khẩu 6 chữ thường, dò không nổi trong đời người.
 *
 * @returns chuỗi mô tả lỗi, hoặc null nếu mật khẩu đạt.
 */
export function kiemMatKhau(mk, tenDangNhap) {
  mk = String(mk ?? '');
  const thieu = [];
  if (mk.length < 12) thieu.push(`dài ít nhất 12 ký tự (hiện ${mk.length})`);
  if (!/[a-z]/.test(mk)) thieu.push('có chữ thường');
  if (!/[A-Z]/.test(mk)) thieu.push('có chữ HOA');
  if (!/[0-9]/.test(mk)) thieu.push('có chữ số');
  if (!/[^A-Za-z0-9]/.test(mk)) thieu.push('có ký tự đặc biệt như @ # ! $');
  if (thieu.length) return 'Mật khẩu cần: ' + thieu.join(', ') + '.';
  if (mk.length > 128) return 'Mật khẩu dài quá 128 ký tự.';

  /* Chứa chính tên đăng nhập thì kẻ dò đoán được ngay phần đó — tên đăng nhập
     không phải bí mật, nó hiện trong nhật ký và danh sách cán bộ. */
  if (tenDangNhap && mk.toLowerCase().includes(String(tenDangNhap).toLowerCase())) {
    return 'Mật khẩu không được chứa tên đăng nhập.';
  }
  /* Những mật khẩu "đủ điều kiện" nhưng ai cũng nghĩ ra đầu tiên. */
  const QUEN_THUOC = ['matkhau', 'password', 'congan', 'admin', '123456', 'qwerty', 'abc123', 'dongnai', 'dulich'];
  const trung = QUEN_THUOC.find((x) => mk.toLowerCase().includes(x));
  if (trung) return `Mật khẩu chứa cụm quá quen thuộc "${trung}", dễ bị đoán. Chọn cụm khác.`;
  return null;
}
