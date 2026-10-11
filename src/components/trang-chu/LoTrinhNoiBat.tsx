/** Khối "Lộ trình gợi ý": một lộ trình mở lớn kèm đường kể chuyện, các lộ trình còn lại xếp bên cạnh. */
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Map as IcBanDo, ArrowUpRight, Clock, Bus, Plus } from 'lucide-react';
import { AnhTuyen, TieuDeKhoi } from '../du-lich/GiaoDien';
import { useNN } from '../../i18n/NgonNgu';
import { chuyenCanh } from '../../utils/hieuUng';
import type { DiaDiem, LoTrinh } from '../../utils/kieu';

/** Đường kể chuyện: vạch san hô nối các điểm dừng theo thứ tự, ngang trên màn rộng, dọc trên điện thoại. */
function DuongKe({ diem, ngay }: { diem: DiaDiem[]; ngay: number[] }) {
  const { t, chon } = useNN();
  const nhieuNgay = ngay.some((n) => n > 1);
  return (<>
    <ol className="duong-ke relative mt-6 hidden sm:grid" style={{ gridTemplateColumns: `repeat(${diem.length}, minmax(0, 1fr))` }}>
      <span className="duong-ke-vach absolute left-[8px] right-[calc(100%/var(--n)_-_8px)] top-[7px] h-[2px] bg-route" style={{ '--n': diem.length } as CSSProperties} aria-hidden="true" />
      {diem.map((p, i) => (
        <li key={p.id + i} className="relative pr-3">
          <span className={`duong-ke-cham relative block h-4 w-4 border-[3px] border-paper bg-route shadow-sh-1 ${i === diem.length - 1 ? 'rounded-[5px]' : 'rounded-full'}`} style={{ '--i': i } as CSSProperties} />
          {nhieuNgay && (i === 0 || ngay[i] !== ngay[i - 1]) && <span className="mt-2 block text-xs font-semibold text-route">{t('ngay')} {ngay[i]}</span>}
          <span className={`block text-[14px] font-medium leading-snug ${nhieuNgay && (i === 0 || ngay[i] !== ngay[i - 1]) ? 'mt-0.5' : 'mt-2'}`}>{chon(p.ten, p.tenEn)}</span>
        </li>))}
    </ol>
    <ol className="duong-ke doc relative mt-5 space-y-3 sm:hidden">
      <span className="duong-ke-vach absolute bottom-3 left-[7px] top-2 w-[2px] bg-route" aria-hidden="true" />
      {diem.map((p, i) => (
        <li key={p.id + i} className="relative flex items-baseline gap-3">
          <span className={`duong-ke-cham relative top-[3px] block h-4 w-4 shrink-0 border-[3px] border-paper bg-route ${i === diem.length - 1 ? 'rounded-[5px]' : 'rounded-full'}`} style={{ '--i': i } as CSSProperties} />
          <span className="text-[15px] font-medium">{chon(p.ten, p.tenEn)}{nhieuNgay && (i === 0 || ngay[i] !== ngay[i - 1]) && <span className="ml-2 text-xs font-semibold text-route">{t('ngay')} {ngay[i]}</span>}</span>
        </li>))}
    </ol></>);
}

export default function LoTrinhNoiBat({ ds, loTrinh, onXemBanDo }: { ds: DiaDiem[]; loTrinh: LoTrinh[]; onXemBanDo: (id: number) => void }) {
  const { t, chon } = useNN();
  const [lonId, setLonId] = useState<number | null>(null);
  if (!loTrinh.length) return null;
  const lon = loTrinh.find((l) => l.id === lonId) || loTrinh[0];
  const con = loTrinh.filter((l) => l.id !== lon.id);
  const diemCua = (l: LoTrinh) => l.diem.map((d) => ds.find((p) => p.id === d.id)).filter((p): p is DiaDiem => !!p);
  const dsLon = diemCua(lon);
  return (
    <section id="lo-trinh" className="py-20 sm:py-28" style={{ scrollMarginTop: 72 }}>
      <div className="container-page">
        <TieuDeKhoi tieuDe={t('goiYLoTrinh')} moTa={t('loTrinhMoTa2')}
          phai={<Link to="/tu-tao-lo-trinh" className="nut nut-vien"><Plus className="h-4 w-4" />{t('tuTaoLoTrinh')}</Link>} />
        <div className="grid gap-5 lg:grid-cols-12">
          <article className="hien-dan lg:col-span-8" style={{ viewTransitionName: 'tuyen-lon' } as CSSProperties}>
            <div className="fx-the the relative h-full" data-nghieng="3">
              <div className="relative h-56 overflow-hidden rounded-t-[15px] bg-sunken sm:h-72"><AnhTuyen diem={dsLon} sizes="(min-width: 1024px) 60vw, 100vw" /></div>
              <div className="fx-noi-it p-6 sm:p-8">
                <h3 className="tieu-de-vua">{chon(lon.ten, lon.tenEn)}</h3>
                <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
                  {lon.thoiGian && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted" />{lon.thoiGian}</span>}
                  {chon(lon.phuongTien, lon.phuongTienEn) && <span className="inline-flex items-center gap-1.5"><Bus className="h-4 w-4 text-muted" />{chon(lon.phuongTien, lon.phuongTienEn)}</span>}
                  <span>{t('soDiemDung', { n: dsLon.length })}</span>
                </p>
                <DuongKe key={lon.id} diem={dsLon} ngay={lon.diem.filter((d) => ds.some((p) => p.id === d.id)).map((d) => d.ngay)} />
                {chon(lon.moTa, lon.moTaEn) && <p className="mt-6 max-w-[62ch] text-[16px] leading-relaxed text-ink-2">{chon(lon.moTa, lon.moTaEn)}</p>}
                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" className="nut nut-chinh" onClick={() => onXemBanDo(lon.id)}><IcBanDo className="h-4 w-4" />{t('xemTrenBanDo')}</button>
                  <Link to={`/lo-trinh/${lon.id}`} className="nut nut-vien">{t('chiTietLoTrinh')}<ArrowUpRight className="h-4 w-4" /></Link>
                </div>
              </div>
            </div>
          </article>
          <div className="khong-thanh-cuon -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 lg:col-span-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {con.map((l, i) => (
              <article key={l.id} className="hien-dan w-[80%] shrink-0 snap-start sm:w-[46%] lg:w-auto" style={{ '--i': i + 1, viewTransitionName: 'tuyen-' + l.id } as CSSProperties}>
                <button type="button" onClick={() => chuyenCanh(() => setLonId(l.id))}
                  className="fx-the the group relative block h-full w-full text-left" data-nghieng="7">
                  <span className="relative block h-36 overflow-hidden rounded-t-[15px] bg-sunken"><AnhTuyen diem={diemCua(l)} sizes="(min-width: 1024px) 30vw, 80vw" /></span>
                  <span className="fx-noi-it block p-5">
                    <b className="block text-[19px] font-semibold leading-snug">{chon(l.ten, l.tenEn)}</b>
                    <span className="mt-1 block text-sm text-muted">{[l.thoiGian, t('soDiemDung', { n: diemCua(l).length })].filter(Boolean).join(', ')}</span>
                    <span className="mt-3 flex items-center" aria-hidden="true">{diemCua(l).map((_, k, a) => (
                      <span key={k} className="flex items-center"><span className={`h-2.5 w-2.5 bg-route ${k === a.length - 1 ? 'rounded-[3px]' : 'rounded-full'}`} />{k < a.length - 1 && <span className="h-[2px] w-6 bg-route/50" />}</span>))}</span>
                  </span>
                </button>
              </article>))}
          </div>
        </div>
      </div>
    </section>);
}
