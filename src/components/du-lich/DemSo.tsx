import { useEffect, useState } from 'react';
import { so, giamChuyenDong } from '../../utils/hangSo';
/** Con số chạy dần từ 0 tới giá trị thật. */
export default function DemSo({ gt }: { gt: number }) {
  const [hien, setHien] = useState(giamChuyenDong() ? gt : 0);
  useEffect(() => {
    if (giamChuyenDong() || !gt) { setHien(gt); return; }
    let id = 0; const bd = performance.now();
    const buoc = (t: number) => { const k = Math.min(1, (t - bd) / 1000); setHien(Math.round(gt * (1 - Math.pow(1 - k, 3)))); if (k < 1) id = requestAnimationFrame(buoc); };
    id = requestAnimationFrame(buoc);
    return () => cancelAnimationFrame(id);
  }, [gt]);
  return <>{so(hien)}</>;
}
