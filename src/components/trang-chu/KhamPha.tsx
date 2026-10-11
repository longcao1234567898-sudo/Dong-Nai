/** Khối "Khám phá điểm đến": lọc theo vùng và loại hình, lưới bento có thứ bậc. */
import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, X } from 'lucide-react';
import { useNN } from '../../i18n/NgonNgu';
import { LOAI, VUNG } from '../../utils/hangSo';
import { chuyenCanh } from '../../utils/hieuUng';
import { HienSao, KhungAnh, TieuDeKhoi } from '../du-lich/GiaoDien';
import { boDau } from './Hero';
import type { DiaDiem, Loai, Vung } from '../../utils/kieu';

/* Mẫu bento lặp mỗi 8 thẻ: 1 thẻ lớn 2×2, 6 thẻ vuông, 1 thẻ ngang. */
const kieuO = (i: number) => (i % 8 === 0 ? 'lon' : i % 8 === 7 ? 'ngang' : 'vua');
const LOP_O = { lon: 'sm:col-span-6 lg:col-span-6 lg:row-span-2', vua: 'sm:col-span-3 lg:col-span-3', ngang: 'sm:col-span-6 lg:col-span-6' };

function TheDiem({ p, kieu, i, onXemBanDo }: { p: DiaDiem; kieu: 'lon' | 'vua' | 'ngang'; i: number; onXemBanDo: (id: string) => void }) {
  const { t, nn, chon } = useNN();
  const khuVuc = p.xa || (p.vung ? VUNG[p.vung][nn === 'en' ? 'en' : 'ten'] : '');
  const sao = p.saoTb !== null && p.soDanhGia > 0
    ? <span className="flex items-center gap-1.5 text-[13px]"><HienSao gt={p.saoTb} co={14} /><b className="font-semibold">{p.saoTb.toLocaleString(nn === 'en' ? 'en' : 'vi', { maximumFractionDigits: 1 })}</b><span className="opacity-75">({p.soDanhGia})</span></span>
    : <span className="text-[13px] opacity-80">{t('chuaCoDanhGia')}</span>;
  return (
    <article className={`hien-dan min-h-[260px] sm:min-h-0 ${LOP_O[kieu]}`} style={{ '--i': i % 8, viewTransitionName: 'dd-' + p.id } as CSSProperties}>
     {/* Lớp ngoài lo phần hiện khi cuộn, lớp trong lo phần nghiêng: hai transform không đè nhau. */}
     <div className="fx-the relative h-full" data-nghieng={kieu === 'lon' ? 4 : 7}>
      <Link to={`/dia-diem/${p.id}`} className="the-anh group" aria-label={chon(p.ten, p.tenEn)}>
        <span className="khung"><KhungAnh p={p} /></span>
        <span className="man" />
        <span className={`fx-noi absolute inset-x-0 bottom-0 block p-5 text-[#F7F5EF] ${kieu === 'lon' ? 'sm:p-7' : ''}`}>
          <span className="text-[13px] font-medium text-[#DCE4E0]">{nn === 'en' ? LOAI[p.loai]?.en : LOAI[p.loai]?.ten}</span>
          <b className={`mt-0.5 block ${kieu === 'lon' ? 'tieu-de-vua' : 'text-[19px] font-semibold leading-snug'}`}>{chon(p.ten, p.tenEn)}</b>
          {kieu === 'lon' && chon(p.moTa, p.moTaEn) && <span className="mt-2 line-clamp-2 block max-w-xl text-[15px] leading-relaxed text-[#DCE4E0]">{chon(p.moTa, p.moTaEn)}</span>}
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">{khuVuc && <span className="text-[13px] text-[#DCE4E0]">{khuVuc}</span>}{sao}</span>
        </span>
      </Link>
      <button type="button" onClick={() => onXemBanDo(p.id)} aria-label={`${t('xemTrenBanDo')}: ${chon(p.ten, p.tenEn)}`} title={t('xemTrenBanDo')}
        className="fx-noi kinh absolute right-3 top-3 z-[4] grid h-10 w-10 place-items-center rounded-full shadow-sh-2 transition-transform hover:scale-105">
        <MapPin className="h-[18px] w-[18px]" /></button>
     </div>
    </article>);
}

export default function KhamPha({ ds, dangTai, tuKhoa, onBoTuKhoa, onXemBanDo }: {
  ds: DiaDiem[]; dangTai: boolean; tuKhoa: string; onBoTuKhoa: () => void; onXemBanDo: (id: string) => void;
}) {
  const { t, nn } = useNN();
  const [vung, setVung] = useState<Vung | null>(null);
  const [loai, setLoai] = useState<Loai | null>(null);
  const [moHet, setMoHet] = useState(false);
  const q = boDau(tuKhoa.trim());
  const khop = (p: DiaDiem, v: Vung | null, l: Loai | null) => (!v || p.vung === v) && (!l || p.loai === l)
    && (!q || boDau(`${p.ten} ${p.tenEn || ''} ${p.xa || ''} ${p.diaChi || ''}`).includes(q));
  const loc = useMemo(() => ds.filter((p) => khop(p, vung, loai)), // eslint-disable-next-line react-hooks/exhaustive-deps
    [ds, vung, loai, q]);
  /* Số trên chip tính theo các bộ lọc còn lại, để không bấm vào một chip rồi ra rỗng. */
  const demVung = (v: Vung) => ds.filter((p) => khop(p, v, loai)).length;
  const demLoai = (l: Loai) => ds.filter((p) => khop(p, vung, l)).length;
  const hien = moHet ? loc : loc.slice(0, 8);
  const ten = (k: { ten: string; en: string }) => (nn === 'en' ? k.en : k.ten);
  const doi = (f: () => void) => chuyenCanh(() => { f(); setMoHet(false); });

  return (
    <section id="kham-pha" className="nen-dong-muc py-20 sm:py-28" style={{ scrollMarginTop: 72 }}>
      <div className="container-page">
        <TieuDeKhoi tieuDe={t('khamPhaTieuDe')} moTa={t('khamPhaMoTa')}
          phai={!dangTai && <p className="text-sm text-muted" aria-live="polite">{t('dangHien', { a: loc.length, b: ds.length })}</p>} />

        <div className="hien-dan mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-[5.5rem] shrink-0 text-sm font-semibold text-ink-2">{t('vung')}</span>
            <div className="khong-thanh-cuon -mr-4 flex gap-2 overflow-x-auto pr-4 sm:mr-0 sm:flex-wrap sm:pr-0" role="group" aria-label={t('vung')}>
              <button type="button" className="chip" aria-pressed={!vung} onClick={() => doi(() => setVung(null))}>{t('tatCa')}</button>
              {(Object.keys(VUNG) as Vung[]).map((v) => { const n = demVung(v); return (
                <button key={v} type="button" className="chip" aria-pressed={vung === v} disabled={!n && vung !== v} onClick={() => doi(() => setVung(vung === v ? null : v))}>
                  {ten(VUNG[v])}<span className="chip-so">{n}</span></button>); })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-[5.5rem] shrink-0 text-sm font-semibold text-ink-2">{t('loaiHinh')}</span>
            <div className="khong-thanh-cuon -mr-4 flex gap-2 overflow-x-auto pr-4 sm:mr-0 sm:flex-wrap sm:pr-0" role="group" aria-label={t('loaiHinh')}>
              {(Object.keys(LOAI) as Loai[]).filter((l) => ds.some((p) => p.loai === l)).map((l) => { const n = demLoai(l); return (
                <button key={l} type="button" className="chip" aria-pressed={loai === l} disabled={!n && loai !== l} onClick={() => doi(() => setLoai(loai === l ? null : l))}>
                  {ten(LOAI[l])}<span className="chip-so">{n}</span></button>); })}
            </div>
          </div>
          {tuKhoa.trim() && <p className="flex items-center gap-2 text-sm"><span>{t('ketQuaCho', { q: tuKhoa.trim() })}</span>
            <button type="button" onClick={onBoTuKhoa} className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 text-action hover:bg-sunken"><X className="h-4 w-4" />{t('boLoc')}</button></p>}
        </div>

        {dangTai ? <div className="grid gap-4 sm:grid-cols-6 lg:auto-rows-[244px] lg:grid-cols-12">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className={`skeleton min-h-[220px] ${LOP_O[kieuO(i)]}`} />)}</div>
        : !loc.length ? <div className="the flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="text-[17px]">{t('locRong')}</p>
            <button type="button" className="nut nut-vien" onClick={() => doi(() => { setVung(null); setLoai(null); onBoTuKhoa(); })}>{t('boLoc')}</button></div>
        : <div className="grid gap-4 sm:grid-cols-6 sm:auto-rows-[236px] lg:auto-rows-[244px] lg:grid-cols-12">
            {hien.map((p, i) => <TheDiem key={p.id} p={p} i={i} kieu={kieuO(i)} onXemBanDo={onXemBanDo} />)}
          </div>}

        {loc.length > 8 && <div className="mt-8 flex justify-center">
          <button type="button" className="nut nut-vien" onClick={() => chuyenCanh(() => setMoHet((x) => !x))}>{moHet ? t('thuGon') : t('xemTatCaDiem', { n: loc.length })}</button></div>}
      </div>
    </section>);
}
