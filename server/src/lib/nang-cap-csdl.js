/**
 * TỰ NÂNG CẤP CƠ SỞ DỮ LIỆU KHI KHỞI ĐỘNG.
 *
 * Lỗi đã gặp thật: cập nhật mã lên Render nhưng quên dán lại tệp SQL vào Aiven,
 * máy chủ mới ghi vào cột chưa có -> cán bộ bấm Lưu tin chỉ thấy "Lỗi máy chủ".
 *
 * Nay lúc khởi động, thấy thiếu bảng hoặc cột thì máy chủ tự chạy
 * database/du_lich_dong_nai.sql — đúng tệp cán bộ vẫn dán tay. Tệp viết để chạy lại
 * nhiều lần không mất số liệu (CREATE TABLE IF NOT EXISTS, thêm cột khi chưa có,
 * INSERT IGNORE, chỉ điền chỗ còn trống). Bỏ hai dòng CREATE DATABASE / USE để chạy
 * đúng cơ sở dữ liệu trong DB_NAME. Khoá GET_LOCK để hai máy chủ không chạy cùng lúc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { cauHinhKetNoi } from '../db.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CHO_TEP = [path.join(GOC, 'database/du_lich_dong_nai.sql'), path.join(GOC, 'server/database/du_lich_dong_nai.sql')];

export function docTepSql() {
  const tep = CHO_TEP.find((p) => fs.existsSync(p));
  if (!tep) return null;
  return fs.readFileSync(tep, 'utf8')
    .replace(/^\s*CREATE DATABASE[^;]*;\s*$/gim, '')
    .replace(/^\s*USE\s+[^;]*;\s*$/gim, '');
}

/** Chạy tệp SQL nâng cấp. Trả true nếu chạy xong. */
export async function tuNangCap(lyDo) {
  const sql = docTepSql();
  if (!sql) { console.warn('⚠️  Không thấy database/du_lich_dong_nai.sql để tự nâng cấp — dán tay tệp này vào HeidiSQL.'); return false; }
  let conn;
  try {
    conn = await mysql.createConnection({ ...cauHinhKetNoi(), multipleStatements: true });
    const [[{ duoc }]] = await conn.query("SELECT GET_LOCK('du_lich_nang_cap', 60) AS duoc");
    if (!duoc) { console.warn('⚠️  Máy chủ khác đang nâng cấp cơ sở dữ liệu, bỏ qua.'); return false; }
    console.log(`🔧 Tự nâng cấp cơ sở dữ liệu (thiếu: ${lyDo})…`);
    const bd = Date.now();
    await conn.query(sql);
    await conn.query("SELECT RELEASE_LOCK('du_lich_nang_cap')");
    console.log(`✅ Đã nâng cấp cơ sở dữ liệu sau ${Math.round((Date.now() - bd) / 100) / 10} giây.`);
    return true;
  } catch (e) {
    console.error('❌ Tự nâng cấp cơ sở dữ liệu thất bại:', e.message, '\n   → Dán tay database/du_lich_dong_nai.sql vào HeidiSQL rồi F9.');
    return false;
  } finally { await conn?.end().catch(() => {}); }
}
