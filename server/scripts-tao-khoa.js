/**
 * Tạo hai khoá bí mật cho máy chủ — chạy MỘT LẦN khi cài đặt:
 *   node scripts-tao-khoa.js
 * JWT_SECRET  ký vé đăng nhập cán bộ. Đổi thì mọi cán bộ bị đăng xuất.
 * HASH_PEPPER băm mã thiết bị và IP của du khách. Đổi thì hệ thống không còn
 *             nhận ra đánh giá cũ của cùng một thiết bị — mỗi máy gửi lại được thêm một bài.
 */
import crypto from 'node:crypto';
const k = () => crypto.randomBytes(48).toString('hex');
console.log('\nChép hai dòng dưới vào server/.env và mục Environment trên Render:\n');
console.log('JWT_SECRET=' + k());
console.log('HASH_PEPPER=' + k());
console.log('\nCất bản sao ở nơi an toàn. Không gửi qua mạng xã hội, không đưa lên GitHub.\n');
