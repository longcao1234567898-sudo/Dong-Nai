/**
 * GIẢI MÃ BẢN SAO LƯU — mở tệp .sql.mahoa do scripts-sao-luu.js tạo ra.
 *
 * Dùng:  cd server && node scripts-giai-ma-sao-luu.js sao-luu/<tệp>.sql.mahoa
 * Khoá lấy từ KHOA_SAO_LUU trong server/.env. Ra tệp .sql cùng thư mục, nạp
 * lại bằng HeidiSQL (File > Run SQL file...). Xong việc nên xoá tệp .sql đó.
 */
import 'dotenv/config';
import fs from 'node:fs';
import { giaiMa } from './src/lib/ma-hoa-sao-luu.js';

const tep = process.argv[2];
if (!tep || !tep.endsWith('.mahoa')) { console.error('\n❌ Dùng: node scripts-giai-ma-sao-luu.js sao-luu/<tệp>.sql.mahoa\n'); process.exit(1); }
if (!process.env.KHOA_SAO_LUU) { console.error('\n❌ Chưa khai KHOA_SAO_LUU trong server/.env.\n'); process.exit(1); }
try {
  const ra = tep.replace(/\.mahoa$/, '');
  fs.writeFileSync(ra, giaiMa(fs.readFileSync(tep), process.env.KHOA_SAO_LUU));
  console.log(`\n✅ Đã giải mã: ${ra}\n   Nạp xong nhớ xoá tệp này — nó là bản chữ thường.\n`);
} catch (e) { console.error(`\n❌ ${e.message}\n`); process.exit(1); }
