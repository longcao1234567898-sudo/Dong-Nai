/**
 * Băng chuyền tin nổi bật ở đầu trang Tin tức: tự lướt mỗi 6 giây, mỗi tin là
 * một đường dẫn sang trang riêng của tin. Rê chuột, bấm vào trong băng hoặc
 * chuyển tab thì dừng; có nút tạm dừng (nội dung tự chạy quá 5 giây phải dừng
 * được), chấm chọn tin, nút trước/sau, vuốt trên điện thoại. Bật "giảm chuyển
 * động" thì không tự lướt.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play, ArrowRight } from 'lucide-react';
import { anhTinUrl } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';
import { giamChuyenDong } from '../../utils/hangSo';
import type { TinTuc } from '../../utils/kieu';

const CHUYEN_SAU = 6000;

export default function BangTinNoiBat({ ds }: { ds: TinTuc[] }) {
  const { t, chon, ngay } = useNN();
  const [i, setI] = useState(0);
  const [dung, setDung] = useState(() => giamChuyenDong());
  const [tamNghi, setTamNghi] = useState(false);   // rê chuột / đang thao tác trong băng
  const keo = useRef<number | null>(null);
  const n = ds.length;
  const di = (b: number) => setI((x) => (x + b + n) % n);

  useEffect(() => {
    if (dung || tamNghi || n < 2) return;
    const h = window.setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % n); }, CHUYEN_SAU);
    return () => window.clearInterval(h);
  }, [dung, tamNghi, n]);
  if (!n) return null;
  const x = ds[i % n];
  const NHAN: Record<string, string> = { 'canh-bao': t('canhBao'), 'su-kien': t('suKien'), 'thong-bao': t('thongBao') };

  return (
    <section aria-roledescription="carousel" aria-label={t('tinNoiBat')} className="nen-toi relative overflow-hidden rounded-[24px] shadow-sh-3"
      onMouseEnter={() => setTamNghi(true)} onMouseLeave={() => setTamNghi(false)}
      onFocus={() => setTamNghi(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTamNghi(false); }}
      onPointerDown={(e) => { keo.current = e.clientX; }}
      onPointerUp={(e) => { if (keo.current !== null && Math.abs(e.clientX - keo.current) > 50) di(e.clientX < keo.current ? 1 : -1); keo.current = null; }}>
      {/* Mọi ảnh bìa xếp chồng, ảnh đang hiện mờ dần vào. */}
      <div className="absolute inset-0" aria-hidden="true">
        {ds.map((tin, k) => tin.anh?.[0] && (
          <img key={tin.id} src={anhTinUrl(tin.anh[0].id)} alt="" loading={k === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${k === i % n ? 'opacity-100' : 'opacity-0'}`} />))}
        <div className="absolute inset-0 bg-gradient-to-t from-[#081A17] via-[#081A17]/70 to-[#081A17]/10 md:bg-gradient-to-r md:from-[#081A17]/95 md:via-[#081A17]/60 md:to-transparent" />
      </div>

      <div className="relative flex min-h-[380px] flex-col justify-end p-6 sm:min-h-[420px] sm:p-10 md:max-w-[62%]" aria-live={dung || tamNghi ? 'polite' : 'off'}>
        <p className="text-[13px] font-semibold text-[#F7F5EF]/80">
          {t('tinNoiBat')}{NHAN[x.loai] ? `, ${NHAN[x.loai].toLowerCase()}` : ''}{x.tuNgay ? `, ${ngay(x.tuNgay)}` : ''}</p>
        <h2 className="mt-2 font-serif text-[clamp(1.6rem,3.6vw,2.6rem)] font-medium leading-[1.12] text-[#F7F5EF]">
          <Link to={`/tin-tuc/${x.id}`} className="underline-offset-4 hover:underline">{chon(x.tieuDe, x.tieuDeEn)}</Link></h2>
        {chon(x.noiDung, x.noiDungEn) && <p className="mt-3 line-clamp-3 max-w-[56ch] text-[16px] leading-relaxed text-[#F7F5EF]/85">{chon(x.noiDung, x.noiDungEn)}</p>}
        <Link to={`/tin-tuc/${x.id}`} className="nut nut-chinh mt-5 w-fit">{t('docTin')}<ArrowRight className="h-4 w-4" /></Link>
      </div>

      {n > 1 && <div className="relative flex items-center justify-between gap-3 px-6 pb-5 sm:px-10">
        <div className="flex items-center gap-1.5">
          {ds.map((tin, k) => <button key={tin.id} type="button" onClick={() => setI(k)} aria-label={`${t('tinSo', { n: k + 1 })}: ${chon(tin.tieuDe, tin.tieuDeEn)}`}
            aria-current={k === i % n} className="grid h-8 w-8 place-items-center">
            <span className={`block h-1.5 rounded-full transition-all ${k === i % n ? 'w-6 bg-[#F17C5B]' : 'w-1.5 bg-[#F7F5EF]/50'}`} /></button>)}
        </div>
        <div className="flex gap-1.5 text-[#F7F5EF]">
          <button type="button" onClick={() => di(-1)} aria-label={t('tinTruoc')} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => setDung((d) => !d)} aria-label={dung ? t('chayTiep') : t('tamDung')} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            {dung ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
          <button type="button" onClick={() => di(1)} aria-label={t('tinSau')} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>}
    </section>);
}
