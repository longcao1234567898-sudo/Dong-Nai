import { useEffect } from 'react';
/** Các khối có lớp .hien-dan hiện dần khi cuộn tới. */
export function useHienDan(phuThuoc: unknown[] = []) {
  useEffect(() => {
    const ds = document.querySelectorAll('.hien-dan:not(.da-hien)');
    if (!('IntersectionObserver' in window)) { ds.forEach((e) => e.classList.add('da-hien')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('da-hien'); io.unobserve(e.target); } }), { threshold: 0.1 });
    ds.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, phuThuoc);
}
