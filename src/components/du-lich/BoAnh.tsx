/**
 * Bộ ảnh của một địa điểm ở trang riêng: lưới ảnh, bấm vào ảnh nào thì mở khung
 * xem lớn — chuyển ảnh bằng nút, phím mũi tên hoặc vuốt trên điện thoại, Esc để đóng.
 * Ảnh cán bộ tải lên (tối đa 20) được ưu tiên; chưa có thì dùng ảnh mặc định của điểm.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Images } from 'lucide-react';
import { anhUrl } from '../../services/api';
import { ANH_MAC_DINH } from '../../utils/anhMacDinh';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem } from '../../utils/kieu';

export interface Tam { lon: string; nho: string; chuThich: string; rong?: number | null; cao?: number | null; vt: string }

export function dsAnh(p: DiaDiem, ten: string): Tam[] {
  if (p.anh?.length) return p.anh.map((a) => ({ lon: anhUrl(a.id), nho: anhUrl(a.id), chuThich: a.chuThich || ten, rong: a.rong, cao: a.cao,
    vt: `${a.tieuDiemX ?? 50}% ${a.tieuDiemY ?? 50}%` }));
  /* Ảnh mặc định: chú thích là tên điểm (mô tả gốc trên Commons bằng tiếng Anh, kèm thông tin tác giả — không hiện cho người dân). */
  return (ANH_MAC_DINH[p.id] || []).map((m) => ({ lon: m.tep, nho: m.nho, chuThich: ten, rong: m.rong, cao: m.cao, vt: '50% 50%' }));
}

export function KhungXem({ ds, dau, onDong }: { ds: Tam[]; dau: number; onDong: () => void }) {
  const { t } = useNN();
  const [i, setI] = useState(dau);
  const dongRef = useRef<HTMLButtonElement>(null);
  const keo = useRef<number | null>(null);
  const di = useCallback((b: number) => setI((x) => (x + b + ds.length) % ds.length), [ds.length]);
  useEffect(() => {
    const truoc = document.activeElement as HTMLElement | null;
    dongRef.current?.focus();
    const cuon = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onDong(); else if (e.key === 'ArrowRight') di(1); else if (e.key === 'ArrowLeft') di(-1); };
    window.addEventListener('keydown', phim);
    return () => { window.removeEventListener('keydown', phim); document.documentElement.style.overflow = cuon; truoc?.focus(); };
  }, [di, onDong]);
  const a = ds[i];
  /* Gắn thẳng vào body: phần tử cha có transform (hiệu ứng hiện dần) làm position: fixed lệch khung. */
  return createPortal(
    <div className="fixed inset-0 z-[2500] flex flex-col bg-[#081A17]/95 text-[#F7F5EF]" role="dialog" aria-modal="true" aria-label={a.chuThich}
      onPointerDown={(e) => { keo.current = e.clientX; }}
      onPointerUp={(e) => { if (keo.current !== null && Math.abs(e.clientX - keo.current) > 50) di(e.clientX < keo.current ? 1 : -1); keo.current = null; }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm tabular-nums text-[#F7F5EF]/75">{i + 1} / {ds.length}</span>
        <button ref={dongRef} type="button" onClick={onDong} aria-label={t('dong')} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        <img key={a.lon} src={a.lon} alt={a.chuThich} className="max-h-full max-w-full select-none object-contain" draggable={false} />
        {ds.length > 1 && <>
          <button type="button" onClick={() => di(-1)} aria-label={t('anhTruoc')} className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/35 hover:bg-black/55 sm:left-4"><ChevronLeft className="h-6 w-6" /></button>
          <button type="button" onClick={() => di(1)} aria-label={t('anhSau')} className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/35 hover:bg-black/55 sm:right-4"><ChevronRight className="h-6 w-6" /></button>
        </>}
      </div>
      <p className="px-4 py-4 text-center text-[15px] text-[#F7F5EF]/85">{a.chuThich}</p>
    </div>, document.body);
}

export default function BoAnh({ p }: { p: DiaDiem }) {
  const { t, chon } = useNN();
  const ten = chon(p.ten, p.tenEn);
  const ds = dsAnh(p, ten);
  const [mo, setMo] = useState<number | null>(null);
  if (ds.length < 2) return null;   // một ảnh thì ảnh lớn đầu trang đã đủ
  const hien = ds.slice(0, 5), con = ds.length - hien.length;
  /* Bố cục theo số ảnh: 2 ảnh chia đôi; 3 ảnh: một lớn, hai nhỏ xếp dọc; từ 4 ảnh: một lớn, bốn nhỏ. */
  const luoi = hien.length === 2 ? 'grid-cols-2' : hien.length === 3 ? 'grid-cols-2 sm:grid-cols-3 sm:grid-rows-2' : 'grid-cols-2 sm:grid-cols-4 sm:grid-rows-2';
  const oDau = hien.length === 2 ? 'aspect-[4/3]' : 'col-span-2 row-span-2 aspect-[4/3] sm:aspect-auto';
  return (
    <section className="mt-8 border-t border-line pt-8" aria-labelledby="bo-anh">
      <h2 id="bo-anh" className="tieu-de-vua flex items-center gap-2 text-[22px]"><Images className="h-5 w-5 text-action" />{t('boAnh')} <small className="font-sans text-sm font-normal text-muted">({ds.length})</small></h2>
      <div className={`mt-4 grid gap-2 ${luoi}`}>
        {hien.map((a, i) => (
          <button key={a.lon} type="button" onClick={() => setMo(i)} aria-label={`${t('xemAnhLon')}: ${a.chuThich}`}
            className={`group relative overflow-hidden rounded-xl bg-sunken ${i === 0 ? oDau : 'aspect-[4/3]'}`}>
            <img src={i === 0 ? a.lon : a.nho} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" style={{ objectPosition: a.vt }} />
            {i === hien.length - 1 && con > 0 && <span className="absolute inset-0 grid place-items-center bg-black/45 text-lg font-semibold text-white">+{con}</span>}
          </button>))}
      </div>
      {mo !== null && <KhungXem ds={ds} dau={mo} onDong={() => setMo(null)} />}
    </section>);
}
