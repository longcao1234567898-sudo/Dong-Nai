/** Tin tức, sự kiện, cảnh báo, số điện thoại cần biết — cán bộ đăng ở khu quản trị. */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Megaphone, Phone } from 'lucide-react';
import { layTinTuc, layDiaDiem } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';

export default function TinTucPage() {
  const { t, chon, ngay } = useNN();
  const { data: tin = [], isLoading } = useQuery({ queryKey: ['tin-tuc'], queryFn: layTinTuc });
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const ds2 = tin.filter((x) => x.loai !== 'lien-he'), lienHe = tin.filter((x) => x.loai === 'lien-he');
  const IC = { 'canh-bao': AlertTriangle, 'su-kien': CalendarDays, 'thong-bao': Megaphone, 'lien-he': Phone };
  const NHAN = { 'canh-bao': t('canhBao'), 'su-kien': t('suKien'), 'thong-bao': t('thongBao'), 'lien-he': '' };
  return (
    <section className="animate-page container-page py-8">
      <h1 className="text-2xl font-extrabold">{t('tinTuc')}</h1><p className="text-sm text-slate-500">{t('tinTucMoTa')}</p>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {isLoading && <p className="text-slate-500">{t('dangTai')}</p>}
          {!isLoading && !ds2.length && <p className="rounded-2xl bg-white p-6 text-center text-slate-500 dark:bg-slate-900">{t('khongCoTin')}</p>}
          {ds2.map((x) => { const Ic = IC[x.loai]; const p = ds.find((d) => d.id === x.diaDiemId); return (
            <article key={x.id} className={`rounded-2xl border bg-white p-5 shadow-soft dark:bg-slate-900 ${x.loai === 'canh-bao' ? 'border-amber-400' : 'border-slate-200 dark:border-slate-800'}`}>
              <p className={`flex items-center gap-1.5 text-xs font-bold ${x.loai === 'canh-bao' ? 'text-amber-700 dark:text-amber-300' : 'text-secondary-500'}`}><Ic className="h-4 w-4" />{NHAN[x.loai]}
                {(x.tuNgay || x.denNgay) && <span className="font-medium text-slate-500"> · {x.tuNgay ? `${t('tu')} ${ngay(x.tuNgay)} ` : ''}{x.denNgay ? `${t('den')} ${ngay(x.denNgay)}` : ''}</span>}</p>
              <h2 className="mt-1 text-lg font-bold">{chon(x.tieuDe, x.tieuDeEn)}</h2>
              {chon(x.noiDung, x.noiDungEn) && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{chon(x.noiDung, x.noiDungEn)}</p>}
              {p && <Link to={`/dia-diem/${p.id}`} className="mt-2 inline-block text-sm font-semibold text-primary-600">{chon(p.ten, p.tenEn)} →</Link>}
            </article>); })}
        </div>
        {lienHe.length > 0 && <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 font-bold"><Phone className="h-5 w-5" />{t('soCanBiet')}</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{lienHe.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span>{chon(x.tieuDe, x.tieuDeEn)}</span>
              <a className="font-extrabold text-primary-700 dark:text-primary-400" href={`tel:${String(x.noiDung || '').replace(/[^0-9+]/g, '')}`}>{x.noiDung}</a></li>))}</ul>
        </aside>}
      </div>
    </section>);
}
