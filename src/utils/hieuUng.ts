/**
 * Chuyển động dùng chung cho cả trang. Bật một lần ở App:
 *  - batHienDan: khối có lớp .hien-dan đứng dậy từ mặt phẳng nghiêng khi cuộn tới.
 *    Tự theo dõi cả khối thêm vào SAU (dữ liệu tải muộn), không phải gọi lại.
 *  - batNghieng: thẻ .fx-the nghiêng theo chuột, có vệt sáng chạy theo.
 *    Một bộ lắng nghe cho cả trang; chỉ với chuột thật, không với cảm ứng.
 *  - chuyenCanh: đổi bố cục (lọc, đổi chỗ thẻ) bằng View Transitions nếu có.
 */
import { flushSync } from 'react-dom';
import { giamChuyenDong } from './hangSo';

export function batHienDan() {
  if (!('IntersectionObserver' in window)) {
    const hienHet = () => document.querySelectorAll('.hien-dan').forEach((e) => e.classList.add('da-hien'));
    hienHet(); const mo = new MutationObserver(hienHet); mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }
  const io = new IntersectionObserver((ds) => ds.forEach((m) => {
    if (m.isIntersecting) { m.target.classList.add('da-hien'); io.unobserve(m.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  let cho = 0;
  /* Nhớ phần tử đã theo dõi trong bộ nhớ của lần bật này (không ghi lên DOM): tắt rồi bật lại
     (React StrictMode, đổi trang) thì lần sau theo dõi lại từ đầu, không sót khối nào. */
  const daTheo = new WeakSet<Element>();
  const quet = () => { cho = 0; document.querySelectorAll('.hien-dan:not(.da-hien)').forEach((e) => { if (!daTheo.has(e)) { daTheo.add(e); io.observe(e); } }); };
  quet();
  const mo = new MutationObserver(() => { if (!cho) cho = requestAnimationFrame(quet); });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(cho); };
}

export function batNghieng() {
  const chuotThat = window.matchMedia('(hover: hover) and (pointer: fine)');
  let dang: HTMLElement | null = null, cho = 0, x = 0, y = 0;
  const ve = () => {
    cho = 0; if (!dang) return;
    const r = dang.getBoundingClientRect(), tx = (x - r.left) / r.width, ty = (y - r.top) / r.height;
    const max = Number(dang.dataset.nghieng || 6);
    dang.style.setProperty('--ry', `${((tx - 0.5) * 2 * max).toFixed(2)}deg`);
    dang.style.setProperty('--rx', `${((0.5 - ty) * 1.6 * max).toFixed(2)}deg`);
    dang.style.setProperty('--gx', `${(tx * 100).toFixed(1)}%`);
    dang.style.setProperty('--gy', `${(ty * 100).toFixed(1)}%`);
  };
  const tha = () => { if (!dang) return; dang.classList.remove('dang-nghieng'); dang.style.removeProperty('--rx'); dang.style.removeProperty('--ry'); dang = null; };
  const khiDi = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !chuotThat.matches || giamChuyenDong()) return;
    const the = (e.target as Element | null)?.closest?.('.fx-the') as HTMLElement | null;
    if (the !== dang) { tha(); if (the) { dang = the; the.classList.add('dang-nghieng'); } }
    x = e.clientX; y = e.clientY;
    if (dang && !cho) cho = requestAnimationFrame(ve);
  };
  document.addEventListener('pointermove', khiDi, { passive: true });
  document.documentElement.addEventListener('pointerleave', tha);
  window.addEventListener('blur', tha);
  return () => { document.removeEventListener('pointermove', khiDi); document.documentElement.removeEventListener('pointerleave', tha); window.removeEventListener('blur', tha); cancelAnimationFrame(cho); };
}

type CoChuyenCanh = Document & { startViewTransition?: (cb: () => void) => unknown };
export function chuyenCanh(capNhat: () => void) {
  const d = document as CoChuyenCanh;
  if (!d.startViewTransition || giamChuyenDong()) { capNhat(); return; }
  d.startViewTransition(() => flushSync(capNhat));
}
