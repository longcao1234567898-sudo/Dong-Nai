/** Trang riêng của một tin — đường dẫn /tin-tuc/:id để chia sẻ; ảnh bìa, nội dung, bộ ảnh, nguồn tin. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowUpRight, ExternalLink, Link2, CalendarDays } from 'lucide-react';
import { KhungXem, type Tam } from '../../components/du-lich/BoAnh';
import { layTin, layDiaDiem, anhTinUrl } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';

export default function TinChiTietPage() {
  const { id } = useParams();
  const { t, chon, ngay } = useNN();
  const { data: x, isLoading, error } = useQuery({ queryKey: ['tin', id], queryFn: () => layTin(Number(id)), retry: 0 });
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const [mo, setMo] = useState<number | null>(null);
  useEffect(() => { if (x) document.title = `${chon(x.tieuDe, x.tieuDeEn)} — ${t('tenTrang')}`; return () => { document.title = t('tenTrang'); }; }, [x, chon, t]);
  if (isLoading) return <p className="py-24 text-center text-muted">{t('dangTai')}</p>;
  if (!x) return <section className="container-page py-24 text-center"><p className="tieu-de-vua">{(error as Error)?.message || '404'}</p>
    <Link className="mt-3 inline-block font-semibold text-action" to="/tin-tuc">{t('tatCaTin')}</Link></section>;
  const p = ds.find((d) => d.id === x.diaDiemId);
  const anh: Tam[] = (x.anh || []).map((a) => ({ lon: anhTinUrl(a.id), nho: anhTinUrl(a.id), chuThich: a.chuThich || chon(x.tieuDe, x.tieuDeEn), rong: a.rong, cao: a.cao, vt: '50% 50%' }));
  const hetHan = !!x.denNgay && x.denNgay < new Date().toISOString().slice(0, 10);
  const NHAN: Record<string, string> = { 'canh-bao': t('canhBao'), 'su-kien': t('suKien'), 'thong-bao': t('thongBao') };
  const chep = () => navigator.clipboard?.writeText(window.location.href).then(() => toast.success(t('daChepLink')), () => undefined);
  return (
    <article className="animate-page nen-dong-muc pb-20">
      <div className="container-page max-w-3xl pt-8">
        <Link to="/tin-tuc" className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-action"><ArrowLeft className="h-4 w-4" />{t('tatCaTin')}</Link>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-[13px] font-medium text-muted"><CalendarDays className="h-4 w-4" />{NHAN[x.loai]}
          {(x.tuNgay || x.denNgay) && <span>{x.tuNgay ? `${t('tu')} ${ngay(x.tuNgay)} ` : ''}{x.denNgay ? `${t('den')} ${ngay(x.denNgay)}` : ''}</span>}</p>
        <h1 className="tieu-de-muc mt-2">{chon(x.tieuDe, x.tieuDeEn)}</h1>
        {hetHan && <p className="mt-3 rounded-xl bg-[#FCEFC7] px-4 py-2.5 text-sm text-[#5C4200]">{t('tinDaKetThuc')}</p>}
        {anh[0] && <button type="button" onClick={() => setMo(0)} className="mt-6 block w-full overflow-hidden rounded-[20px] bg-sunken shadow-sh-2" aria-label={t('xemAnhLon')}>
          <img src={anh[0].lon} alt={anh[0].chuThich} className="max-h-[520px] w-full object-cover" /></button>}
        {chon(x.noiDung, x.noiDungEn) && <div className="mt-6 whitespace-pre-line text-[17px] leading-[1.75] text-ink-2">{chon(x.noiDung, x.noiDungEn)}</div>}
        {anh.length > 1 && <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">{anh.slice(1).map((a, k) => (
          <button key={a.lon} type="button" onClick={() => setMo(k + 1)} className="aspect-[4/3] overflow-hidden rounded-xl bg-sunken" aria-label={`${t('xemAnhLon')}: ${a.chuThich}`}>
            <img src={a.nho} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.04]" /></button>))}</div>}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
          {x.lienKet && <a href={x.lienKet} target="_blank" rel="noopener noreferrer" className="nut nut-chinh"><ExternalLink className="h-4 w-4" />{t('xemNguon')}</a>}
          {p && <Link to={`/dia-diem/${p.id}`} className="nut nut-vien">{t('diemLienQuan')}: {chon(p.ten, p.tenEn)}<ArrowUpRight className="h-4 w-4" /></Link>}
          <button type="button" onClick={chep} className="nut nut-vien"><Link2 className="h-4 w-4" />{t('chepLink')}</button>
        </div>
      </div>
      {mo !== null && <KhungXem ds={anh} dau={mo} onDong={() => setMo(null)} />}
    </article>);
}
