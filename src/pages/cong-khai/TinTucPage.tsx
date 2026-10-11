/** Tin tức, sự kiện, cảnh báo, số điện thoại cần biết — cán bộ đăng ở khu quản trị. */
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Megaphone, Phone, ArrowUpRight } from 'lucide-react';
import { DauTrang } from '../../components/du-lich/GiaoDien';
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
    <div className="animate-page">
      <DauTrang tieuDe={t('tinTuc')} moTa={t('tinTucMoTa')} />
      <section className="container-page grid items-start gap-8 py-12 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {isLoading && <p className="text-muted">{t('dangTai')}</p>}
          {!isLoading && !ds2.length && <p className="the p-8 text-center text-[17px] text-muted">{t('khongCoTin')}</p>}
          {ds2.map((x, i) => { const Ic = IC[x.loai]; const p = ds.find((d) => d.id === x.diaDiemId); const canh = x.loai === 'canh-bao'; return (
            <article key={x.id} className={`hien-dan the p-6 ${canh ? 'border-[#E0B54A] bg-[#FCEFC7] dark:bg-[#3a3216]' : ''}`} style={{ '--i': i % 3 } as CSSProperties}>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-muted"><Ic className={`h-4 w-4 ${canh ? 'text-[#8A5A00]' : ''}`} /><span className={canh ? 'font-semibold text-ink' : ''}>{NHAN[x.loai]}</span>
                {(x.tuNgay || x.denNgay) && <span>{x.tuNgay ? `${t('tu')} ${ngay(x.tuNgay)} ` : ''}{x.denNgay ? `${t('den')} ${ngay(x.denNgay)}` : ''}</span>}</p>
              <h2 className="mt-2 text-[21px] font-semibold leading-snug">{chon(x.tieuDe, x.tieuDeEn)}</h2>
              {chon(x.noiDung, x.noiDungEn) && <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-ink-2">{chon(x.noiDung, x.noiDungEn)}</p>}
              {p && <Link to={`/dia-diem/${p.id}`} className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[15px] font-semibold text-action">{chon(p.ten, p.tenEn)}<ArrowUpRight className="h-4 w-4" /></Link>}
            </article>); })}
        </div>
        {lienHe.length > 0 && <aside className="hien-dan nen-toi rounded-[20px] p-6 shadow-sh-2 lg:sticky lg:top-24 lg:col-span-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Phone className="h-4 w-4" />{t('soCanBiet')}</h2>
          <ul className="mt-3 divide-y divide-white/10">{lienHe.map((x) => (
            <li key={x.id}><a href={`tel:${String(x.noiDung || '').replace(/[^0-9+]/g, '')}`} className="flex min-h-[52px] items-center justify-between gap-3 text-[15px] hover:text-coral">
              <span>{chon(x.tieuDe, x.tieuDeEn)}</span><b className="font-serif text-[26px] font-medium tabular-nums">{x.noiDung}</b></a></li>))}</ul>
        </aside>}
      </section>
    </div>);
}
