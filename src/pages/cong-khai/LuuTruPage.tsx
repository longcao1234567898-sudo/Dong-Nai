/** Resort, khu nghỉ dưỡng cán bộ đã xác nhận (bảng 3, chỉ cơ sở được đánh dấu hiện cho người dân). */
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Info } from 'lucide-react';
import { DauTrang, HienSao } from '../../components/du-lich/GiaoDien';
import { layLuuTru } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';

export default function LuuTruPage() {
  const { t } = useNN();
  const { data: ds = [], isLoading } = useQuery({ queryKey: ['luu-tru'], queryFn: layLuuTru });
  return (
    <div className="animate-page">
      <DauTrang tieuDe={t('luuTruTieuDe')} moTa={t('luuTruMoTa')}>
        <p className="mt-6 flex max-w-3xl items-start gap-2.5 rounded-2xl border border-line bg-paper/70 px-4 py-3 text-[15px] text-ink-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-action" />{t('luuYTamTru')}</p>
      </DauTrang>
      <section className="container-page py-12">
        {isLoading && <p className="py-10 text-center text-muted">{t('dangTai')}</p>}
        {!isLoading && !ds.length && <p className="the p-8 text-center text-[17px] text-muted">{t('khongCoLuuTru')}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ds.map((x, i) => (
          <div key={x.id} className="hien-dan" style={{ '--i': i % 3 } as CSSProperties}>
            <article className="fx-the the relative h-full p-6" data-nghieng="5">
              <b className="block text-[19px] font-semibold leading-snug">{x.ten}</b>
              <span className="mt-2 flex items-center gap-2 text-sm" aria-label={x.hangSao ? `${x.hangSao} ${t('sao')}` : t('chuaXepHangSao')}>
                {x.hangSao ? <HienSao gt={x.hangSao} /> : <span className="text-muted">{t('chuaXepHangSao')}</span>}</span>
              <p className="mt-4 flex gap-2 border-t border-line/70 pt-4 text-[15px] text-ink-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />{[x.diaChi, x.xaPhuong].filter(Boolean).join(', ')}</p>
            </article>
          </div>))}</div>
      </section>
    </div>);
}
