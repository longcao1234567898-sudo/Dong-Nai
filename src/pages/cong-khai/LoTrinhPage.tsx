/** Lộ trình du lịch: danh sách, trang từng lộ trình (bản đồ tuyến, từng ngày, chỉ đường) và tự tạo lộ trình. */
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Navigation, Route, ArrowUp, ArrowDown, X, Link2, Plus, Clock } from 'lucide-react';
import BanDo from '../../components/du-lich/BanDo';
import ChiTiet from '../../components/du-lich/ChiTiet';
import { layDiaDiem, layLoTrinh } from '../../services/api';
import { khoangCachKm, duongDanChiDuong } from '../../utils/hangSo';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem } from '../../utils/kieu';

const nutChinh = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white hover:bg-primary-700';
const tongKm = (ds: DiaDiem[]) => Math.round(ds.slice(1).reduce((s, p, i) => s + khoangCachKm(ds[i], p), 0));

function DanhSachDiem({ ds, ngay, onChon }: { ds: DiaDiem[]; ngay?: number[]; onChon: (id: string) => void }) {
  const { t, chon } = useNN();
  return (
    <ol className="space-y-2">{ds.map((p, i) => (<li key={p.id + i}>
      {ngay && (i === 0 || ngay[i] !== ngay[i - 1]) && <p className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-secondary-500">{t('ngay')} {ngay[i]}</p>}
      <button type="button" onClick={() => onChon(p.id)} className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-primary-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-600 text-sm font-extrabold text-white">{i + 1}</span>
        <span className="min-w-0"><b className="block">{chon(p.ten, p.tenEn)}</b><small className="text-xs text-slate-500">{p.diaChi}</small>
          {i > 0 && <small className="block text-xs text-slate-400">↳ ~{Math.round(khoangCachKm(ds[i - 1], p))} km</small>}</span>
      </button></li>))}</ol>);
}

export function LoTrinhDanhSach() {
  const { t, chon } = useNN();
  const { data: lt = [], isLoading } = useQuery({ queryKey: ['lo-trinh'], queryFn: layLoTrinh });
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  return (
    <section className="animate-page container-page py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('loTrinhTieuDe')}</h1><p className="text-sm text-slate-500">{t('loTrinhMoTa')}</p></div>
        <Link to="/tu-tao-lo-trinh" className={nutChinh}><Plus className="h-4 w-4" />{t('tuTaoLoTrinh')}</Link>
      </div>
      {isLoading && <p className="py-10 text-center text-slate-500">{t('dangTai')}</p>}
      <div className="grid gap-4 md:grid-cols-2">{lt.map((l) => { const diem = l.diem.map((d) => ds.find((p) => p.id === d.id)).filter((p): p is DiaDiem => !!p); return (
        <Link key={l.id} to={`/lo-trinh/${l.id}`} className="card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <span className="flex items-center justify-between gap-2"><b className="text-lg">{chon(l.ten, l.tenEn)}</b>{l.thoiGian && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-secondary-500">{l.thoiGian}</span>}</span>
          {chon(l.moTa, l.moTaEn) && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{chon(l.moTa, l.moTaEn)}</p>}
          <p className="mt-3 text-sm text-slate-500">{diem.map((p) => chon(p.ten, p.tenEn)).join(' → ')}</p>
          <p className="mt-2 text-xs text-slate-400">{diem.length} {t('diem')} · ~{tongKm(diem)} km</p>
        </Link>); })}</div>
    </section>);
}

export function LoTrinhChiTiet() {
  const { id } = useParams();
  const { t, chon } = useNN();
  const { data: lt = [], isLoading } = useQuery({ queryKey: ['lo-trinh'], queryFn: layLoTrinh });
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const [xem, setXem] = useState<string | null>(null);
  const l = lt.find((x) => x.id === Number(id));
  const cap = (l?.diem || []).map((d) => ({ d, p: ds.find((p) => p.id === d.id) })).filter((x): x is { d: typeof x.d; p: DiaDiem } => !!x.p);
  const diem = cap.map((x) => x.p);
  if (isLoading) return <p className="py-20 text-center text-slate-500">{t('dangTai')}</p>;
  if (!l) return <section className="container-page py-16 text-center"><p>{t('khongCoLoTrinh')}</p><Link className="text-primary-600" to="/lo-trinh">{t('tatCaLoTrinh')}</Link></section>;
  const pXem = ds.find((p) => p.id === xem);
  return (
    <section className="animate-page container-page py-8">
      <Link to="/lo-trinh" className="text-sm font-semibold text-primary-600">← {t('tatCaLoTrinh')}</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{chon(l.ten, l.tenEn)}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">{l.thoiGian && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{l.thoiGian}</span>}<span>{diem.length} {t('diem')}</span></p>
      {chon(l.moTa, l.moTaEn) && <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{chon(l.moTa, l.moTaEn)}</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <BanDo ds={diem} tuyen={diem} onChon={setXem} thap />
        <div>
          <DanhSachDiem ds={diem} ngay={cap.map((x) => x.d.ngay)} onChon={setXem} />
          <p className="mt-3 text-xs text-slate-500">{t('quangDuong', { km: tongKm(diem) })}</p>
          <a href={duongDanChiDuong(diem)} target="_blank" rel="noopener noreferrer" className={nutChinh + ' mt-3'}><Navigation className="h-4 w-4" />{t('moGoogleMaps')}</a>
        </div>
      </div>
      {pXem && <ChiTiet p={pXem} onDong={() => setXem(null)} />}
    </section>);
}

/* Tự tạo lộ trình: thứ tự điểm nằm ngay trên đường dẫn (?d=a,b,c), gửi đường dẫn là người nhận thấy đúng lộ trình — không cần tài khoản, không lưu gì trên máy chủ. */
export function TuTaoLoTrinh() {
  const { t, chon } = useNN();
  const [tham, datTham] = useSearchParams();
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const [xem, setXem] = useState<string | null>(null);
  const ids = useMemo(() => (tham.get('d') || '').split(',').filter(Boolean).slice(0, 20), [tham]);
  const diem = ids.map((i) => ds.find((p) => p.id === i)).filter((p): p is DiaDiem => !!p);
  const dat = (moi: string[]) => datTham(moi.length ? { d: moi.join(',') } : {}, { replace: true });
  const them = (i: string) => { if (i && !ids.includes(i)) dat([...ids, i]); };
  const doiCho = (i: number, j: number) => { const m = [...ids]; [m[i], m[j]] = [m[j], m[i]]; dat(m); };
  const chep = async () => { try { await navigator.clipboard.writeText(window.location.href); toast.success(t('daChep')); } catch { toast(window.location.href); } };
  const pXem = ds.find((p) => p.id === xem);
  const nutNho = 'grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800';
  return (
    <section className="animate-page container-page py-8">
      <Link to="/lo-trinh" className="text-sm font-semibold text-primary-600">← {t('tatCaLoTrinh')}</Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold"><Route className="h-6 w-6" />{t('tuTaoLoTrinh')}</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">{t('tuTaoMoTa')}</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* Bấm ghim trên bản đồ: chưa có trong lộ trình thì thêm, có rồi thì mở chi tiết. */}
        <BanDo ds={ds} tuyen={diem} onChon={(i) => (ids.includes(i) ? setXem(i) : them(i))} thap />
        <div>
          <label className="block text-sm font-semibold">{t('themDiem')}
            <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" value="" onChange={(e) => them(e.target.value)}>
              <option value="">{t('chonDiaDiem')}</option>{ds.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{chon(p.ten, p.tenEn)}</option>)}</select></label>
          {!diem.length ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50">{t('chuaChonDiem')}</p> : (
            <ol className="mt-4 space-y-2">{diem.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-600 text-sm font-extrabold text-white">{i + 1}</span>
                <button type="button" onClick={() => setXem(p.id)} className="min-w-0 flex-1 text-left"><b className="block truncate text-sm">{chon(p.ten, p.tenEn)}</b>
                  {i > 0 && <small className="text-xs text-slate-400">~{Math.round(khoangCachKm(diem[i - 1], p))} km</small>}</button>
                <button type="button" className={nutNho} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label={t('len')}><ArrowUp className="h-4 w-4" /></button>
                <button type="button" className={nutNho} disabled={i === diem.length - 1} onClick={() => doiCho(i, i + 1)} aria-label={t('xuong')}><ArrowDown className="h-4 w-4" /></button>
                <button type="button" className={nutNho} onClick={() => dat(ids.filter((x) => x !== p.id))} aria-label={t('bo')}><X className="h-4 w-4" /></button>
              </li>))}</ol>)}
          {diem.length > 1 && <><p className="mt-3 text-xs text-slate-500">{t('quangDuong', { km: tongKm(diem) })}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={duongDanChiDuong(diem)} target="_blank" rel="noopener noreferrer" className={nutChinh}><Navigation className="h-4 w-4" />{t('moGoogleMaps')}</a>
              <button type="button" onClick={chep} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-200 px-4 font-bold dark:border-slate-700"><Link2 className="h-4 w-4" />{t('chepDuongDan')}</button>
            </div></>}
        </div>
      </div>
      {pXem && <ChiTiet p={pXem} onDong={() => setXem(null)} />}
    </section>);
}
