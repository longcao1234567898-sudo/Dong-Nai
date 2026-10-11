/** Khối mở đầu: trình chiếu ảnh thật các điểm nổi bật, tiêu đề, ô tìm kiếm, hai lối vào chính. */
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Map as IcBanDo, Route, Pause, Play } from 'lucide-react';
import { useNN } from '../../i18n/NgonNgu';
import { LOAI, giamChuyenDong } from '../../utils/hangSo';
import { anhUrl } from '../../services/api';
import { anhMacDinh, srcSetMacDinh } from '../../utils/anhMacDinh';
import { AnhTuyen } from '../du-lich/GiaoDien';
import type { DiaDiem, LoTrinh } from '../../utils/kieu';

/** Bỏ dấu để tìm "tri an" vẫn ra "Trị An". */
export const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
const CHUYEN_SAU = 7000;   // mỗi ảnh đứng 7 giây

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

/** Thẻ nổi: lộ trình đầu tiên (dữ liệu thật), ảnh lấy từ điểm dừng có ảnh. */
function TheLoTrinhNoi({ lt, diem }: { lt: LoTrinh; diem: DiaDiem[] }) {
  const { t, chon } = useNN();
  return (
    <Link to={`/lo-trinh/${lt.id}`} className="fx-the group relative block w-[19rem] rounded-[20px] bg-[#FFFEFB] text-[#192522] shadow-sh-3" data-nghieng="8">
      <span className="relative block h-36 overflow-hidden rounded-t-[20px] bg-[#EFEBE1]"><AnhTuyen diem={diem} /></span>
      <span className="fx-noi block p-4">
        <span className="text-[13px] font-medium text-[#5B6B66]">{t('loTrinhNoiBat')}</span>
        <b className="mt-0.5 block font-serif text-[22px] font-medium leading-tight">{chon(lt.ten, lt.tenEn)}</b>
        <span className="mt-2 flex flex-wrap gap-x-3 text-[13px] text-[#3E4C48]">{lt.thoiGian && <span>{lt.thoiGian}</span>}<span>{t('soDiemDung', { n: diem.length })}</span></span>
      </span>
    </Link>);
}

export default function Hero({ ds, loTrinh, onTim, onToiBanDo, onToiLoTrinh }: {
  ds: DiaDiem[]; loTrinh: LoTrinh[]; onTim: (q: string) => void; onToiBanDo: () => void; onToiLoTrinh: () => void;
}) {
  const { t, chon } = useNN();
  /* Ảnh trình chiếu: điểm nổi bật trước, mỗi điểm một ảnh — ảnh cán bộ tải lên, không thì ảnh mặc định. */
  const chieu = useMemo(() => ds.map((p) => {
    const a = p.anh?.[0], m = anhMacDinh(p.id);
    if (a) return { p, src: anhUrl(a.id), srcSet: undefined as string | undefined, tieuDiem: `${a.tieuDiemX ?? 50}% ${a.tieuDiemY ?? 50}%` };
    /* Ảnh mặc định hẹp (dưới 1280px) chỉ dùng cho thẻ: phóng ra cả màn hình sẽ nhoè. */
    if (m && m.rong >= 1280) return { p, src: m.tep, srcSet: srcSetMacDinh(m), tieuDiem: '50% 50%' };
    return null;
  }).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => Number(b.p.noiBat) - Number(a.p.noiBat)).slice(0, 5), [ds]);
  const [i, setI] = useState(0);
  const [dung, setDung] = useState(() => giamChuyenDong());
  useEffect(() => {
    if (dung || chieu.length < 2) return;
    const h = window.setInterval(() => setI((x) => (x + 1) % chieu.length), CHUYEN_SAU);
    return () => window.clearInterval(h);
  }, [dung, chieu.length]);
  const hienTai = chieu.length ? chieu[i % chieu.length] : null;
  const lt0 = loTrinh[0];
  const diemLt0 = lt0 ? lt0.diem.map((d) => ds.find((p) => p.id === d.id)).filter((p): p is DiaDiem => !!p) : [];
  const tre = (ms: number) => ({ '--tre': `${ms}ms` }) as CSSProperties;

  return (
    <section className="relative isolate flex min-h-[max(620px,min(94svh,920px))] flex-col overflow-hidden bg-[#0C2925] text-[#F7F5EF]"
      style={{ marginTop: 'calc(-4rem - env(safe-area-inset-top))' }} aria-labelledby="hero-tieu-de">
      <div className="hero-nen absolute inset-0" aria-hidden="true" />
      {/* Lớp ảnh trôi chậm hơn trang khi cuộn (thị sai); ảnh đang chiếu phóng chậm (Ken Burns). */}
      <div className="hero-troi absolute inset-0" aria-hidden="true">
        {chieu.map((c, k) => (
          <div key={c.p.id} className={`hero-anh absolute inset-0 transition-opacity duration-[1600ms] ease-out ${k === i ? 'dang-chieu opacity-100' : 'opacity-0'}`}>
            <img src={c.src} srcSet={c.srcSet} sizes="100vw" alt="" className="h-full w-full object-cover" style={{ objectPosition: c.tieuDiem, transformOrigin: c.tieuDiem }}
              loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : 'auto'} decoding="async" />
          </div>))}
      </div>
      <div className="hero-man pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="container-page relative z-10 flex flex-1 flex-col justify-end pb-24 pt-36 sm:pb-28">
        <div className="max-w-[46rem]">
          <h1 id="hero-tieu-de" className="tieu-de-lon hero-chu">
            <span className="dong" style={tre(60)}>{t('heroDong1')}</span>
            <span className="dong" style={tre(190)}>{t('heroDong2')}</span>
          </h1>
          {ds.length > 0 && <p className="hero-hien mt-5 max-w-[34rem] text-[17px] leading-relaxed text-[#E4EAE7] sm:text-lg" style={tre(420)}>
            {t('heroDan', { diem: ds.length, tuyen: loTrinh.length })}</p>}
          <div className="hero-hien" style={tre(520)}><TimKiem ds={ds} onTim={onTim} /></div>
          <div className="hero-hien mt-4 flex flex-wrap gap-3" style={tre(620)}>
            <button type="button" onClick={onToiBanDo} className="nut nut-chinh"><IcBanDo className="h-[18px] w-[18px]" />{t('xemBanDo')}</button>
            {loTrinh.length > 0 && <button type="button" onClick={onToiLoTrinh} className="nut nut-coral"><Route className="h-[18px] w-[18px]" />{t('goiYLoTrinh')}</button>}
          </div>
        </div>
      </div>

      {lt0 && <div className="hero-hien absolute bottom-28 right-[max(2rem,calc((100vw_-_1280px)/2_+_2rem))] z-10 hidden xl:block" style={tre(900)}>
        <div className="hero-noi"><TheLoTrinhNoi lt={lt0} diem={diemLt0} /></div>
      </div>}

      {/* Tên điểm trong ảnh đang chiếu + điều khiển: nội dung tự chạy quá 5 giây phải dừng được. */}
      {hienTai && <div className="container-page absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-5">
        <p className="max-w-[70%] text-[13px] leading-snug text-[#F7F5EF]/85" aria-live="polite">
          <Link to={`/dia-diem/${hienTai.p.id}`} className="font-semibold text-[#F7F5EF] underline-offset-2 hover:underline">{t('trongAnh')}: {chon(hienTai.p.ten, hienTai.p.tenEn)}</Link></p>
        {chieu.length > 1 && <div className="flex items-center gap-1">
          {chieu.map((c, k) => (
            <button key={c.p.id} type="button" onClick={() => setI(k)} aria-label={`${t('anhSo', { n: k + 1 })}: ${chon(c.p.ten, c.p.tenEn)}`} aria-current={k === i}
              className="grid h-9 w-7 place-items-center"><span className={`block h-1.5 rounded-full transition-all duration-500 ${k === i ? 'w-5 bg-[#F7F5EF]' : 'w-1.5 bg-[#F7F5EF]/50'}`} /></button>))}
          <button type="button" onClick={() => setDung((d) => !d)} aria-label={dung ? t('chayTiep') : t('tamDung')} title={dung ? t('chayTiep') : t('tamDung')}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-[#F7F5EF]/40 hover:bg-white/10">{dung ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
        </div>}
      </div>}
    </section>);
}
