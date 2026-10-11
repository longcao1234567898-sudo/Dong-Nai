/**
 * Chụp ảnh địa hình minh hoạ khi người xem vào thẳng một trang con (không qua
 * trang chủ, nơi cảnh 3D chụp sẵn). Dựng cảnh ẩn ngoài màn hình, chụp đủ thì
 * gỡ ra. Đã có đủ ảnh trong phiên thì không làm gì. Máy không có WebGL: bỏ qua.
 */
import { lazy, Suspense, useState } from 'react';
import { coAnhCanh, useAnhCanh } from './anhCanh';
import type { YeuCauChup } from './Canh3D';

const Canh3D = lazy(() => import('./Canh3D'));
const coWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

export default function ChupDiaHinh({ chup }: { chup: YeuCauChup }) {
  const [webgl] = useState(coWebGL);
  const [loi, setLoi] = useState(false);
  const khoa = [...chup.diem.map((d) => 'diem:' + d.id), ...chup.tuyen.filter((t) => t.diem.length > 1).map((t) => 'tuyen:' + t.id)];
  /* Đọc một khoá để vẽ lại khi kho ảnh đổi; điều kiện thật là "còn khoá nào chưa có". */
  useAnhCanh(khoa[khoa.length - 1] || '');
  const thieu = khoa.some((k) => !coAnhCanh(k));
  if (!webgl || loi || !thieu || !khoa.length) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 h-[440px] w-[680px] opacity-0">
      <Suspense fallback={null}><Canh3D cheDo="chup" chup={chup} onLoi={() => setLoi(true)} /></Suspense>
    </div>);
}
