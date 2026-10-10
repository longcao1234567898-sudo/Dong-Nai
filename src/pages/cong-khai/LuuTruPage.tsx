/** Resort, khu nghỉ dưỡng cán bộ đã xác nhận (bảng 3, chỉ cơ sở được đánh dấu hiện cho người dân). */
import { useQuery } from '@tanstack/react-query';
import { BedDouble, MapPin, Info } from 'lucide-react';
import { layLuuTru } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';

export default function LuuTruPage() {
  const { t } = useNN();
  const { data: ds = [], isLoading } = useQuery({ queryKey: ['luu-tru'], queryFn: layLuuTru });
  return (
    <section className="animate-page container-page py-8">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold"><BedDouble className="h-6 w-6" />{t('luuTruTieuDe')}</h1>
      <p className="text-sm text-slate-500">{t('luuTruMoTa')}</p>
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-secondary-500 dark:bg-slate-800 dark:text-blue-200"><Info className="mt-0.5 h-4 w-4 shrink-0" />{t('luuYTamTru')}</p>
      {isLoading && <p className="py-10 text-center text-slate-500">{t('dangTai')}</p>}
      {!isLoading && !ds.length && <p className="py-10 text-center text-slate-500">{t('khongCoLuuTru')}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ds.map((x) => (
        <div key={x.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <b className="block">{x.ten}</b>
          <span className="mt-1 block text-sm font-bold text-amber-600" aria-label={x.hangSao ? `${x.hangSao} ${t('sao')}` : t('chuaXepHangSao')}>
            {x.hangSao ? '★'.repeat(x.hangSao) : <span className="font-medium text-slate-400">{t('chuaXepHangSao')}</span>}</span>
          <p className="mt-2 flex gap-1.5 text-sm text-slate-600 dark:text-slate-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{[x.diaChi, x.xaPhuong].filter(Boolean).join(', ')}</p>
        </div>))}</div>
    </section>);
}
