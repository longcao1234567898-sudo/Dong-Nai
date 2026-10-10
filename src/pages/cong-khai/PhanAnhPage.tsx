/** Gửi phản ánh (nhận mã tra cứu) và tra cứu kết quả xử lý. */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageSquareWarning, Search, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import Turnstile, { captchaEnabled } from '../../components/common/Turnstile';
import { layDiaDiem, guiPhanAnh, traCuuPhanAnh } from '../../services/api';
import { useNN, DS_LOAI_PA } from '../../i18n/NgonNgu';

const o = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900';
const nhan = 'mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200';

export default function PhanAnhPage() {
  const { t, chon, loaiPA, trangThaiPA, ngay } = useNN();
  const [tham] = useSearchParams();
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const [f, setF] = useState({ loai: '', diaDiemId: tham.get('diem') || '', noiDung: '', lienHe: '' });
  const [token, setToken] = useState(''); const [khoaXm, setKhoaXm] = useState(0);
  const [loi, setLoi] = useState(''); const [ma, setMa] = useState('');
  const [maTra, setMaTra] = useState(tham.get('ma') || ''); const [tra, setTra] = useState('');
  const gui = useMutation({ mutationFn: () => guiPhanAnh({ ...f, diaDiemId: f.diaDiemId || undefined, lienHe: f.lienHe || undefined, captchaToken: token || undefined }),
    onSuccess: (r) => { setMa(r.ma); setLoi(''); setF({ loai: '', diaDiemId: '', noiDung: '', lienHe: '' }); },
    onError: (e: Error) => { setLoi(e.message); setToken(''); setKhoaXm((k) => k + 1); } });
  const { data: kq, error: loiTra, isFetching } = useQuery({ queryKey: ['phan-anh', tra], enabled: tra.length === 8, retry: false, queryFn: () => traCuuPhanAnh(tra) });
  const nop = () => {
    if (!f.loai) return setLoi(t('loaiPhanAnh') + '?');
    if (captchaEnabled && !token) return setLoi(t('tichXacMinh'));
    gui.mutate();
  };
  return (
    <section className="animate-page container-page py-8">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold"><MessageSquareWarning className="h-6 w-6" />{t('phanAnhTieuDe')}</h1>
      <p className="max-w-3xl text-sm text-slate-500">{t('phanAnhMoTa')}</p>
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-200"><Phone className="h-4 w-4 shrink-0" />{t('khanCap')}</p>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          {ma ? <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary-600" />
            <p className="mt-2 font-semibold">{t('daGuiPhanAnh')}</p>
            <p className="mt-2 select-all text-3xl font-extrabold tracking-[0.25em] text-primary-700 dark:text-primary-400">{ma}</p>
            <p className="mt-2 text-sm text-slate-500">{t('ghiLaiMa')}</p>
            <button type="button" className="mt-4 text-sm font-semibold text-primary-600" onClick={() => { setMaTra(ma); setTra(ma); setMa(''); }}>{t('traCuu')} →</button>
          </div> : <>
            <fieldset><legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('loaiPhanAnh')}</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{DS_LOAI_PA.map((k) => (
                <button key={k} type="button" aria-pressed={f.loai === k} onClick={() => setF({ ...f, loai: k })}
                  className={`min-h-[36px] rounded-full border px-3 text-sm ${f.loai === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}>{loaiPA(k)}</button>))}</div></fieldset>
            <label className={nhan}>{t('diaDiemLienQuan')}<select className={o} value={f.diaDiemId} onChange={(e) => setF({ ...f, diaDiemId: e.target.value })}>
              <option value="">—</option>{ds.map((p) => <option key={p.id} value={p.id}>{chon(p.ten, p.tenEn)}</option>)}</select></label>
            <label className={nhan}>{t('noiDungPhanAnh')}<textarea className={o} rows={5} maxLength={2000} value={f.noiDung} onChange={(e) => setF({ ...f, noiDung: e.target.value })} /></label>
            <label className={nhan}>{t('lienHe')}<input className={o} maxLength={100} value={f.lienHe} onChange={(e) => setF({ ...f, lienHe: e.target.value })} /></label>
            {captchaEnabled && <div className="mt-3"><Turnstile key={khoaXm} onToken={setToken} /></div>}
            {loi && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{loi}</div>}
            <button type="button" onClick={nop} disabled={gui.isPending} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white hover:bg-primary-700 disabled:opacity-60">
              {gui.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{gui.isPending ? t('dangGui') : t('guiPhanAnh')}</button>
          </>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Search className="h-5 w-5" />{t('traCuu')}</h2>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); setTra(maTra.trim().toUpperCase()); }}>
            <input className={o + ' mt-0 uppercase tracking-widest'} value={maTra} maxLength={8} placeholder="ABCD2345" aria-label={t('nhapMa')} onChange={(e) => setMaTra(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} />
            <button type="submit" className="rounded-xl bg-secondary-500 px-4 font-bold text-white">{t('traCuu')}</button></form>
          {isFetching && <p className="mt-3 text-sm text-slate-500">{t('dangTai')}</p>}
          {loiTra && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{(loiTra as Error).message}</p>}
          {kq && !isFetching && <div className="mt-4 space-y-2 text-sm">
            <p><span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-700">{trangThaiPA(kq.trangThai)}</span> <span className="text-slate-500">{loaiPA(kq.loai)}{kq.diaDiem ? ` · ${kq.diaDiem}` : ''}</span></p>
            <p className="text-xs text-slate-500">{t('guiLuc')}: {ngay(kq.guiLuc)}</p>
            <p className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">{kq.noiDung}</p>
            {kq.phanHoi && <div className="rounded-xl border-l-4 border-primary-600 bg-primary-50 p-3 dark:bg-slate-800"><b className="block text-xs text-primary-700 dark:text-primary-400">{t('traLoiCuaCanBo')} · {ngay(kq.xuLyLuc)}</b>{kq.phanHoi}</div>}
          </div>}
        </div>
      </div>
    </section>);
}
