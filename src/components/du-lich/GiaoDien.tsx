/** Mảnh giao diện dùng chung phía người dân: sao, khung ảnh, tiêu đề khối. */
import { useId, type ReactNode } from 'react';
import { Leaf, Landmark, Tent, BedDouble, UtensilsCrossed, Gift } from 'lucide-react';
import { anhUrl } from '../../services/api';
import { anhMacDinh } from '../../utils/anhMacDinh';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem, Loai } from '../../utils/kieu';

export const IC_LOAI: Record<Loai, typeof Leaf> = { 'thien-nhien': Leaf, 'di-tich': Landmark, 'vui-choi': Tent, 'luu-tru': BedDouble, 'am-thuc': UtensilsCrossed, 'dac-san': Gift };
const SAO = 'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z';

/** Sao điểm, tô được phần lẻ (4,6 sao). Ruột vàng, viền nâu đậm để đủ tương phản trên nền sáng. */
export function HienSao({ gt, co = 16 }: { gt: number; co?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className="inline-flex shrink-0 gap-[2px] align-[-0.15em]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => { const f = Math.min(Math.max(gt - i, 0), 1); return (
        <svg key={i} width={co} height={co} viewBox="0 0 24 24">
          <defs><linearGradient id={id + i}><stop offset={f} style={{ stopColor: 'rgb(var(--c-gold))' }} /><stop offset={f} style={{ stopColor: 'rgb(var(--c-gold) / 0)' }} /></linearGradient></defs>
          <path d={SAO} fill={`url(#${id + i})`} style={{ stroke: 'rgb(var(--c-star))' }} strokeWidth={1.5} strokeLinejoin="round" />
        </svg>); })}
    </span>);
}

/** Ảnh của điểm: ảnh cán bộ tải lên; chưa có thì ảnh mặc định (ảnh thật, CC0 hoặc phạm vi
 *  công cộng — không bắt buộc ghi tác giả, xem utils/anhMacDinh.ts); chưa có cả hai thì khung
 *  chờ. Khung cha phải có position: relative và overflow: hidden. */
export function KhungAnh({ p, sizes = '(min-width: 1024px) 50vw, 100vw', uuTien = false }: { p: DiaDiem; sizes?: string; uuTien?: boolean }) {
  const { t, chon } = useNN();
  const a = p.anh?.[0];
  if (a) return <img src={anhUrl(a.id)} alt={a.chuThich || chon(p.ten, p.tenEn)} loading={uuTien ? 'eager' : 'lazy'} decoding="async"
    width={a.rong || undefined} height={a.cao || undefined} className="fx-anh-troi absolute inset-0 h-full w-full object-cover" />;
  const m = anhMacDinh(p.id);
  if (m) return <img src={m.nho} srcSet={`${m.nho} 800w, ${m.tep} ${m.rong}w`} sizes={sizes} alt={chon(p.ten, p.tenEn)} width={m.rong} height={m.cao}
    loading={uuTien ? 'eager' : 'lazy'} decoding="async" className="fx-anh-troi absolute inset-0 h-full w-full object-cover" />;
  const Ic = IC_LOAI[p.loai] || Leaf;
  return <span className="anh-cho"><Ic className="h-7 w-7" strokeWidth={1.5} /><span className="text-xs font-medium">{t('chuaCoAnh')}</span></span>;
}

export function TieuDeKhoi({ tieuDe, moTa, phai, toi = false }: { tieuDe: string; moTa: string; phai?: ReactNode; toi?: boolean }) {
  return (
    <div className="hien-dan mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-10">
      <div className="max-w-2xl"><h2 className="tieu-de-muc">{tieuDe}</h2>
        <p className={`mt-3 text-[17px] leading-relaxed ${toi ? 'text-[#B9C7C1]' : 'text-muted'}`}>{moTa}</p></div>
      {phai}
    </div>);
}

/** Đầu trang con: tiêu đề serif trên nền đường đồng mức, có lối quay lại và nút phụ bên phải. */
export function DauTrang({ tieuDe, moTa, phai, quayLai, children }: { tieuDe: ReactNode; moTa?: ReactNode; phai?: ReactNode; quayLai?: ReactNode; children?: ReactNode }) {
  return (
    <header className="nen-dong-muc border-b border-line/60 pb-10 pt-12 sm:pb-14 sm:pt-16">
      <div className="container-page">
        {quayLai && <div className="mb-4 text-sm font-semibold">{quayLai}</div>}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-3xl"><h1 className="tieu-de-muc">{tieuDe}</h1>
            {moTa && <p className="mt-3 text-[17px] leading-relaxed text-muted">{moTa}</p>}</div>
          {phai}
        </div>
        {children}
      </div>
    </header>);
}

/** Điểm có ảnh để hiện (ảnh cán bộ tải lên hoặc ảnh mặc định). */
export const coAnh = (p: DiaDiem) => !!p.anh?.length || !!anhMacDinh(p.id);
/** Ảnh của một lộ trình: ảnh điểm dừng đầu tiên có ảnh. */
export function AnhTuyen({ diem, sizes }: { diem: DiaDiem[]; sizes?: string }) {
  const p = diem.find(coAnh) || diem[0];
  return p ? <KhungAnh p={p} sizes={sizes} /> : <span className="anh-cho" />;
}
