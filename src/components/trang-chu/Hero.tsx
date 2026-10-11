/** Khối mở đầu: cảnh 3D địa hình Đồng Nai, tiêu đề, ô tìm kiếm, hai lối vào chính. */
import { lazy, Suspense, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Map as IcBanDo, Route } from 'lucide-react';
import { useNN } from '../../i18n/NgonNgu';
import { LOAI } from '../../utils/hangSo';
import { useAnhCanh } from './anhCanh';
import type { DiaDiem, LoTrinh } from '../../utils/kieu';
import type { YeuCauChup } from './Canh3D';

const Canh3D = lazy(() => import('./Canh3D'));

function coWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
/** Bỏ dấu để tìm "tri an" vẫn ra "Trị An". */
export const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

function TimKiem({ ds, onTim }: { ds: DiaDiem[]; onTim: (q: string) => void }) {
  const { t, chon, nn } = useNN();
  const di = useNavigate();
  const id = useId();
  const [q, setQ] = useState(''); const [mo, setMo] = useState(false); const [hl, setHl] = useState(-1);
  const goiY = useMemo(() => {
    const k = boDau(q.trim()); if (!k) return [];
    return ds.filter((p) => boDau(`${p.ten} ${p.tenEn || ''} ${p.xa || ''} ${p.diaChi || ''}`).includes(k)).slice(0, 6);
  }, [q, ds]);
  const hienDs = mo && q.trim().length > 0;
  const gui = () => { if (hl >= 0 && goiY[hl]) di(`/dia-diem/${goiY[hl].id}`); else if (q.trim()) { onTim(q.trim()); setMo(false); } };
  return (
    <form role="search" className="relative mt-7 max-w-[36rem]" onSubmit={(e) => { e.preventDefault(); gui(); }}>
      <div className="kinh flex items-center gap-2 rounded-2xl p-1.5 pl-4 shadow-sh-3">
        <Search className="h-5 w-5 shrink-0 text-[#3E4C48]" aria-hidden="true" />
        <input type="search" value={q} placeholder={t('timGoiY')} aria-label={t('timGoiY')}
          role="combobox" aria-autocomplete="list" aria-expanded={hienDs} aria-controls={id + 'ds'}
          aria-activedescendant={hl >= 0 ? `${id}-${hl}` : undefined}
          onChange={(e) => { setQ(e.target.value); setMo(true); setHl(-1); }} onFocus={() => setMo(true)} onBlur={() => setTimeout(() => setMo(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setMo(true); setHl((h) => Math.min(h + 1, goiY.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(h - 1, -1)); }
            else if (e.key === 'Escape') { setMo(false); setHl(-1); }
          }}
          className="min-h-[46px] w-full min-w-0 bg-transparent text-[16px] text-[#192522] outline-none placeholder:text-[#3E4C48]" />
        <button type="submit" className="nut nut-chinh min-h-[46px] rounded-xl px-5">{t('tim')}</button>
      </div>
      {hienDs && <ul id={id + 'ds'} role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-[#FFFEFB] p-1.5 text-[#192522] shadow-sh-3">
        {goiY.map((p, i) => (
          <li key={p.id} id={`${id}-${i}`} role="option" aria-selected={hl === i}>
            <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => di(`/dia-diem/${p.id}`)} onMouseEnter={() => setHl(i)}
              className={`flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2.5 text-left ${hl === i ? 'bg-[#EFEBE1]' : ''}`}>
              <span className="font-semibold">{chon(p.ten, p.tenEn)}</span>
              <span className="shrink-0 text-[13px] text-[#5B6B66]">{p.xa || (nn === 'en' ? LOAI[p.loai]?.en : LOAI[p.loai]?.ten)}</span>
            </button></li>))}
        {!goiY.length && <li className="px-3 py-2.5 text-sm text-[#5B6B66]">{t('khongThayDiem', { q: q.trim() })}</li>}
      </ul>}
    </form>);
}

/** Thẻ nổi trên cảnh: lộ trình đầu tiên (dữ liệu thật), có ảnh tuyến do cảnh 3D chụp. */
function TheLoTrinhNoi({ lt, soDiem }: { lt: LoTrinh; soDiem: number }) {
  const { t, chon } = useNN();
  const anh = useAnhCanh('tuyen:' + lt.id);
  return (
    <Link to={`/lo-trinh/${lt.id}`} className="fx-the group relative block w-[19rem] rounded-[20px] bg-[#FFFEFB] text-[#192522] shadow-sh-3" data-nghieng="8">
      <span className="relative block h-36 overflow-hidden rounded-t-[20px] bg-[#EFEBE1]">
        {anh ? <img src={anh} alt="" className="anh-hien h-full w-full object-cover" /> : <span className="anh-cho" />}
      </span>
      <span className="fx-noi block p-4">
        <span className="text-[13px] font-medium text-[#5B6B66]">{t('loTrinhNoiBat')}</span>
        <b className="mt-0.5 block font-serif text-[22px] font-medium leading-tight">{chon(lt.ten, lt.tenEn)}</b>
        <span className="mt-2 flex flex-wrap gap-x-3 text-[13px] text-[#3E4C48]">{lt.thoiGian && <span>{lt.thoiGian}</span>}<span>{t('soDiemDung', { n: soDiem })}</span></span>
      </span>
    </Link>);
}

export default function Hero({ ds, loTrinh, duLieuXong, onTim, onToiBanDo, onToiLoTrinh }: {
  ds: DiaDiem[]; loTrinh: LoTrinh[]; duLieuXong: boolean; onTim: (q: string) => void; onToiBanDo: () => void; onToiLoTrinh: () => void;
}) {
  const { t, chon } = useNN();
  const di = useNavigate();
  const [webgl] = useState(coWebGL);
  const [sanSang, setSanSang] = useState(false);
  const [loi, setLoi] = useState(false);
  const ghim = useMemo(() => ds.map((p) => ({ id: p.id, ten: chon(p.ten, p.tenEn), lat: p.lat, lng: p.lng, noiBat: p.noiBat })), [ds, chon]);
  const chup = useMemo<YeuCauChup | undefined>(() => (duLieuXong ? {
    diem: ds.filter((p) => !p.anh?.length).map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    tuyen: loTrinh.map((l) => ({ id: l.id, diem: l.diem.map((d) => ds.find((p) => p.id === d.id)).filter((p): p is DiaDiem => !!p).map((p) => ({ lat: p.lat, lng: p.lng })) })),
  } : undefined), [duLieuXong, ds, loTrinh]);
  const lt0 = loTrinh[0];
  const vungChu = useRef<HTMLDivElement>(null);
  const tre = (ms: number) => ({ '--tre': `${ms}ms` }) as CSSProperties;

  return (
    <section className="relative isolate flex min-h-[max(620px,min(94svh,920px))] flex-col overflow-hidden bg-[#0C2925] text-[#F7F5EF]"
      style={{ marginTop: 'calc(-4rem - env(safe-area-inset-top))' }} aria-labelledby="hero-tieu-de">
      <div className="hero-nen absolute inset-0" aria-hidden="true" />
      {webgl && !loi && (
        <div className={`absolute inset-0 transition-opacity duration-[1600ms] ease-out ${sanSang ? 'opacity-100' : 'opacity-0'}`}>
          <Suspense fallback={null}>
            <Canh3D ghim={ghim} chup={chup} vungChu={vungChu} onSanSang={() => setSanSang(true)} onLoi={() => setLoi(true)} onChon={(id) => di(`/dia-diem/${id}`)} />
          </Suspense>
        </div>)}
      <div className="hero-man pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="container-page pointer-events-none relative z-10 flex flex-1 flex-col justify-end pb-16 pt-36 sm:pb-24">
        <div ref={vungChu} className="pointer-events-auto max-w-[46rem]">
          <h1 id="hero-tieu-de" className="tieu-de-lon hero-chu">
            <span className="dong" style={tre(60)}>{t('heroDong1')}</span>
            <span className="dong" style={tre(190)}>{t('heroDong2')}</span>
          </h1>
          {ds.length > 0 && <p className="hero-hien mt-5 max-w-[34rem] text-[17px] leading-relaxed text-[#DCE4E0] sm:text-lg" style={tre(420)}>
            {t('heroDan', { diem: ds.length, tuyen: loTrinh.length })}</p>}
          <div className="hero-hien" style={tre(520)}><TimKiem ds={ds} onTim={onTim} /></div>
          <div className="hero-hien mt-4 flex flex-wrap gap-3" style={tre(620)}>
            <button type="button" onClick={onToiBanDo} className="nut nut-chinh"><IcBanDo className="h-[18px] w-[18px]" />{t('xemBanDo')}</button>
            {loTrinh.length > 0 && <button type="button" onClick={onToiLoTrinh} className="nut nut-coral"><Route className="h-[18px] w-[18px]" />{t('goiYLoTrinh')}</button>}
          </div>
        </div>
      </div>

      {lt0 && <div className="hero-hien pointer-events-none absolute bottom-24 right-[max(2rem,calc((100vw_-_1280px)/2_+_2rem))] z-10 hidden xl:block" style={tre(900)}>
        <div className="hero-noi pointer-events-auto"><TheLoTrinhNoi lt={lt0} soDiem={lt0.diem.length} /></div>
      </div>}
      <p className="pointer-events-none absolute bottom-3 right-4 z-10 max-w-[70%] text-right text-[11.5px] leading-snug text-[#F7F5EF]/70 sm:right-6">{t('diaHinhMinhHoa')}</p>
    </section>);
}
