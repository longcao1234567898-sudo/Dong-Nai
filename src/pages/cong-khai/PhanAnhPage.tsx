/** Gửi phản ánh. Không có tra cứu kết quả: người gửi nhận lời cảm ơn; ai để lại số liên hệ thì cán bộ gọi lại khi cần. */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Phone, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import Turnstile, { captchaEnabled } from '../../components/common/Turnstile';
import { DauTrang } from '../../components/du-lich/GiaoDien';
import { layDiaDiem, guiPhanAnh } from '../../services/api';
import { useNN, DS_LOAI_PA } from '../../i18n/NgonNgu';

const nhan = 'mt-5 block text-sm font-semibold text-ink-2';
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
    <div className="animate-page">
      <DauTrang tieuDe={t('phanAnhTieuDe')} moTa={t('phanAnhMoTa')}>
        <p className="mt-6 flex w-fit items-center gap-2 rounded-2xl bg-[#FDECEA] px-4 py-3 text-[15px] font-semibold text-[#8A1C12] dark:bg-[#3b1a17] dark:text-[#F6C4BD]"><Phone className="h-4 w-4 shrink-0" />{t('khanCap')}</p>
      </DauTrang>
      <section className="container-page max-w-3xl py-12">
        <div className="hien-dan the p-6 sm:p-8">
          {daGui ? <div className="py-6 text-center" role="status">
            <CheckCircle2 className="mx-auto h-14 w-14 text-action" strokeWidth={1.5} />
            <p className="tieu-de-vua mt-3">{t('daGuiPhanAnh')}</p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">{t('sauKhiGui')}</p>
            <button type="button" className="nut nut-vien mt-6" onClick={() => setDaGui(false)}>{t('guiPhanAnhKhac')}</button>
          </div> : <>
            <fieldset><legend className="text-sm font-semibold text-ink-2">{t('loaiPhanAnh')}</legend>
              <div className="mt-2 flex flex-wrap gap-2">{DS_LOAI_PA.map((k) => (
                <button key={k} type="button" className="chip" aria-pressed={f.loai === k} onClick={() => setF({ ...f, loai: k })}>{loaiPA(k)}</button>))}</div></fieldset>
            <label className={nhan}>{t('diaDiemLienQuan')}<select className="o-nhap mt-1 font-normal" value={f.diaDiemId} onChange={(e) => setF({ ...f, diaDiemId: e.target.value })}>
              <option value="">—</option>{ds.map((p) => <option key={p.id} value={p.id}>{chon(p.ten, p.tenEn)}</option>)}</select></label>
            <label className={nhan}>{t('noiDungPhanAnh')}<textarea className="o-nhap mt-1 font-normal" rows={5} maxLength={2000} value={f.noiDung} onChange={(e) => setF({ ...f, noiDung: e.target.value })} /></label>
            <label className={nhan}>{t('lienHe')}<input className="o-nhap mt-1 font-normal" maxLength={100} value={f.lienHe} onChange={(e) => setF({ ...f, lienHe: e.target.value })} /></label>
            {captchaEnabled && <div className="mt-4"><Turnstile key={khoaXm} onToken={setToken} /></div>}
            {loi && <div role="alert" className="mt-4 rounded-xl bg-[#FDECEA] px-4 py-3 text-sm text-[#B42318]">{loi}</div>}
            <button type="button" onClick={nop} disabled={gui.isPending} className="nut nut-chinh mt-6">
              {gui.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{gui.isPending ? t('dangGui') : t('guiPhanAnh')}</button>
            <p className="mt-4 flex items-start gap-1.5 text-[13px] text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t('baoMatPhanAnh')}</p>
          </>}
        </div>
      </section>
    </div>);
}
