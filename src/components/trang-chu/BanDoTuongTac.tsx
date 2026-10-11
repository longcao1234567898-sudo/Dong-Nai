/** Khối bản đồ trên mảng rừng đêm: bản đồ thật (OpenStreetMap) + bảng thông tin điểm hoặc lộ trình. */
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Navigation, X, Clock, Bus, Phone, ArrowUpRight } from 'lucide-react';
import BanDo from '../du-lich/BanDo';
import { HienSao, KhungAnh, TieuDeKhoi } from '../du-lich/GiaoDien';
import { useNN } from '../../i18n/NgonNgu';
import { LOAI, VUNG, khoangCachKm, duongDanChiDuong } from '../../utils/hangSo';
import type { DiaDiem, LoTrinh } from '../../utils/kieu';

export type Tab = 'diem' | 'tuyen';
const lamTron = (n: number) => (n < 10 ? Math.max(1, Math.round(n)) : Math.round(n / 5) * 5);

function PanelDiem({ p, onBo }: { p: DiaDiem; onBo: () => void }) {
  const { t, nn, chon } = useNN();
  const sdt = String(p.sdt || '').replace(/[^0-9+]/g, '');
  return (
    <div className="animate-page">
      <div className="relative -mx-5 -mt-5 mb-4 h-40 overflow-hidden rounded-t-[19px] bg-sunken"><KhungAnh p={p} /></div>
      <p className="text-[13px] font-medium text-muted">{nn === 'en' ? LOAI[p.loai]?.en : LOAI[p.loai]?.ten}</p>
      <h3 className="tieu-de-vua mt-0.5">{chon(p.ten, p.tenEn)}</h3>
      <p className="mt-1 text-sm text-muted">{[p.xa, p.vung ? VUNG[p.vung][nn === 'en' ? 'en' : 'ten'] : null].filter(Boolean).join(', ')}</p>
      <p className="mt-2 flex items-center gap-2 text-sm">{p.saoTb !== null && p.soDanhGia > 0
        ? <><HienSao gt={p.saoTb} /><b>{p.saoTb.toLocaleString(nn === 'en' ? 'en' : 'vi', { maximumFractionDigits: 1 })}</b><span className="text-muted">({p.soDanhGia})</span></>
        : <span className="text-muted">{t('chuaCoDanhGia')}</span>}</p>
      {chon(p.moTa, p.moTaEn) && <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-ink-2">{chon(p.moTa, p.moTaEn)}</p>}
      {(p.gioMo || sdt) && <dl className="mt-3 space-y-1 text-sm">
        {p.gioMo && <div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><dd>{p.gioMo}</dd></div>}
        {sdt && <div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><dd><a className="text-action underline-offset-2 hover:underline" href={`tel:${sdt}`}>{p.sdt}</a></dd></div>}
      </dl>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={`/dia-diem/${p.id}`} className="nut nut-chinh">{t('xemChiTiet')}</Link>
        <a className="nut nut-vien" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}>
          <Navigation className="h-4 w-4" />{t('chiDuong')}</a>
        <button type="button" onClick={onBo} className="nut px-3 text-muted hover:text-ink"><X className="h-4 w-4" />{t('boChon')}</button>
      </div>
    </div>);
}

function PanelTuyen({ lt, diem, onBo }: { lt: LoTrinh; diem: DiaDiem[]; onBo: () => void }) {
  const { t, chon } = useNN();
  const km = diem.slice(1).reduce((s, p, i) => s + khoangCachKm(diem[i], p), 0);
  const ngay = lt.diem.map((d) => d.ngay);
  return (
    <div className="animate-page">
      <h3 className="tieu-de-vua">{chon(lt.ten, lt.tenEn)}</h3>
      <ul className="mt-2 space-y-1 text-sm text-ink-2">
        {lt.thoiGian && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted" />{lt.thoiGian}</li>}
        {chon(lt.phuongTien, lt.phuongTienEn) && <li className="flex items-center gap-2"><Bus className="h-4 w-4 text-muted" />{chon(lt.phuongTien, lt.phuongTienEn)}</li>}
        <li>{t('duongChimBay', { km: lamTron(km) })}</li>
      </ul>
      <ol className="relative mt-5 space-y-0">
        {diem.map((p, i) => (
          <li key={p.id + i} className="relative grid grid-cols-[28px_1fr] gap-3 pb-4 last:pb-0">
            {i < diem.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-22px)] w-[2px] bg-route/60" aria-hidden="true" />}
            <span className={`relative z-[1] grid h-7 w-7 place-items-center bg-route text-xs font-bold text-white ${i === diem.length - 1 ? 'rounded-md' : 'rounded-full'}`}>{i + 1}</span>
            <span className="min-w-0">
              {(i === 0 || ngay[i] !== ngay[i - 1]) && ngay.some((n) => n > 1) && <span className="block text-xs font-semibold text-route">{t('ngay')} {ngay[i]}</span>}
              <b className="block text-[15px] font-semibold leading-snug">{chon(p.ten, p.tenEn)}</b>
              <span className="text-[13px] text-muted">{i === 0 ? t('batDau') : `${i === diem.length - 1 ? t('ketThuc') + ', ' : ''}${t('cachDiemTruoc', { km: lamTron(khoangCachKm(diem[i - 1], p)) })}`}</span>
            </span>
          </li>))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={duongDanChiDuong(diem)} target="_blank" rel="noopener noreferrer" className="nut nut-chinh"><Navigation className="h-4 w-4" />{t('moGoogleMaps')}</a>
        <Link to={`/lo-trinh/${lt.id}`} className="nut nut-vien">{t('chiTietLoTrinh')}<ArrowUpRight className="h-4 w-4" /></Link>
        <button type="button" onClick={onBo} className="nut px-3 text-muted hover:text-ink"><X className="h-4 w-4" />{t('boChon')}</button>
      </div>
    </div>);
}

const BanDoTuongTac = forwardRef<HTMLElement, {
  ds: DiaDiem[]; loTrinh: LoTrinh[]; tab: Tab; onTab: (t: Tab) => void;
  chon: string | null; onChon: (id: string | null) => void; tuyen: number | null; onTuyen: (id: number | null) => void;
}>(function BanDoTuongTac({ ds, loTrinh, tab, onTab, chon, onChon, tuyen, onTuyen }, ref) {
  const { t, chon: dich } = useNN();
  const lt = loTrinh.find((l) => l.id === tuyen) || null;
  const diemTuyen = lt ? lt.diem.map((d) => ds.find((p) => p.id === d.id)).filter((p): p is DiaDiem => !!p) : [];
  const p = ds.find((x) => x.id === chon) || null;
  const tam: [number, number] | null = p && !lt ? [p.lat, p.lng] : null;
  return (
    <section ref={ref} id="ban-do" className="nen-toi nen-dong-muc py-20 sm:py-28" style={{ scrollMarginTop: 64 }}>
      <div className="container-page">
        <TieuDeKhoi toi tieuDe={t('banDo')} moTa={t('banDoMoTa2')} />
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="hien-dan khung-nghieng lg:col-span-8">
            <BanDo ds={ds} tuyen={diemTuyen} tam={tam} chon={chon} onChon={(id) => { onTab('diem'); onTuyen(null); onChon(id); }} cao="h-[62svh] min-h-[380px] lg:h-[640px]" />
          </div>
          <div className="hien-dan the flex max-h-[640px] flex-col p-5 text-ink lg:col-span-4" style={{ '--i': 2 } as React.CSSProperties}>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1" role="tablist" aria-label={t('banDo')}>
              {(['diem', 'tuyen'] as Tab[]).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => onTab(k)}
                  className={`min-h-[40px] rounded-[10px] text-sm font-semibold transition-colors ${tab === k ? 'bg-paper text-ink shadow-sh-1' : 'text-muted hover:text-ink'}`}>
                  {k === 'diem' ? t('tabDiemDen') : t('tabLoTrinh')}</button>))}
            </div>
            <div className="-mx-5 -mb-5 min-h-0 flex-1 overflow-y-auto px-5 pb-5" aria-live="polite">
              {tab === 'diem' && (p ? <PanelDiem key={p.id} p={p} onBo={() => onChon(null)} /> : <>
                <p className="mb-2 text-sm text-muted">{t('panelTrong')}</p>
                <ul className="-mx-2">{ds.map((x) => (
                  <li key={x.id}><button type="button" onClick={() => onChon(x.id)} className="flex w-full items-baseline justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-sunken">
                    <span className="font-medium">{dich(x.ten, x.tenEn)}</span><span className="shrink-0 text-[13px] text-muted">{x.xa || ''}</span></button></li>))}</ul></>)}
              {tab === 'tuyen' && (lt ? <PanelTuyen key={lt.id} lt={lt} diem={diemTuyen} onBo={() => onTuyen(null)} /> :
                <ul className="space-y-2">{loTrinh.map((l) => (
                  <li key={l.id}><button type="button" onClick={() => onTuyen(l.id)} className="w-full rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-route/60 hover:bg-sunken">
                    <b className="block font-semibold">{dich(l.ten, l.tenEn)}</b>
                    <span className="text-[13px] text-muted">{[l.thoiGian, t('soDiemDung', { n: l.diem.length })].filter(Boolean).join(', ')}</span></button></li>))}</ul>)}
            </div>
          </div>
        </div>
      </div>
    </section>);
});
export default BanDoTuongTac;
