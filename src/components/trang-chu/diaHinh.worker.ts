/** Dựng lưới địa hình ở luồng phụ: trang không khựng trong lúc chữ tiêu đề đang hiện. */
import { xayLuoi, type YeuCauLuoi } from './diaHinh';

const luong = self as unknown as { onmessage: ((e: MessageEvent<YeuCauLuoi>) => void) | null; postMessage: (m: unknown, chuyen: Transferable[]) => void };
luong.onmessage = (e) => {
  const kq = xayLuoi(e.data);
  luong.postMessage(kq, [kq.y.buffer, kq.mau.buffer]);
};
