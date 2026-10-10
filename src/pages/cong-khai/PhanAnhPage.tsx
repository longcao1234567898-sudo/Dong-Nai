/** Gửi phản ánh. Không có tra cứu kết quả: người gửi nhận lời cảm ơn; ai để lại số liên hệ thì cán bộ gọi lại khi cần. */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageSquareWarning, Phone, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import Turnstile, { captchaEnabled } from '../../components/common/Turnstile';
import { layDiaDiem, guiPhanAnh } from '../../services/api';
import { useNN, DS_LOAI_PA } from '../../i18n/NgonNgu';

const o = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900';
const nhan = 'mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200';
const TRONG = { loai: '', diaDiemId: '', noiDung: '', lienHe: '' };

export default function PhanAnhPage() {
  const { t, chon, loaiPA } = useNN();
  const [tham] = useSearchParams();
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const [f, setF] = useState({ ...TRONG, diaDiemId: tham.get('diem') || '' });
  const [token, setToken] = useState(''); const [khoaXm, setKhoaXm] = useState(0);
  const [loi, setLoi] = useState(''); const [daGui, setDaGui] = useState(false);
  const gui = useMutation({ mutationFn: () => guiPhanAnh({ ...f, diaDiemId: f.diaDiemId || undefined, lienHe: f.lienHe || undefined, captchaToken: token || undefined }),
    onSuccess: () => { setDaGui(true); setLoi(''); setF(TRONG); },
    onError: (e: Error) => { setLoi(e.message); setToken(''); setKhoaXm((k) => k + 1); } });
  const nop = () => {
    if (!f.loai) return setLoi(t('chonLoaiPhanAnh'));
    if (captchaEnabled && !token) return setLoi(t('tichXacMinh'));
    gui.mutate();
  };
  return (
    <section className="animate-page container-page max-w-3xl py-8">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold"><MessageSquareWarning className="h-6 w-6" />{t('phanAnhTieuDe')}</h1>
      <p className="text-sm text-slate-500">{t('phanAnhMoTa')}</p>
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-200"><Phone className="h-4 w-4 shrink-0" />{t('khanCap')}</p>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {daGui ? <div className="py-4 text-center" role="status">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary-600" />
          <p className="mt-2 text-lg font-bold">{t('daGuiPhanAnh')}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{t('sauKhiGui')}</p>
          <button type="button" className="mt-4 text-sm font-semibold text-primary-600" onClick={() => setDaGui(false)}>{t('guiPhanAnhKhac')}</button>
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
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('baoMatPhanAnh')}</p>
        </>}
      </div>
    </section>);
}
