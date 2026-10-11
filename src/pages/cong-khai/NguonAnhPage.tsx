/** Nguồn ảnh: tác giả và giấy phép của từng ảnh mặc định (CC BY / CC BY-SA bắt buộc ghi công). */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DauTrang } from '../../components/du-lich/GiaoDien';
import { layDiaDiem } from '../../services/api';
import { ANH_MAC_DINH } from '../../utils/anhMacDinh';
import { useNN } from '../../i18n/NgonNgu';

export default function NguonAnhPage() {
  const { t, chon } = useNN();
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const muc = Object.entries(ANH_MAC_DINH).flatMap(([id, anh]) => anh.map((a, i) => ({ id, a, i })));
  const tenDiem = (id: string) => { const p = ds.find((x) => x.id === id); return p ? chon(p.ten, p.tenEn) : id; };
  return (
    <div className="animate-page">
      <DauTrang tieuDe={t('nguonAnh')} moTa={t('nguonAnhMoTa')} />
      <section className="container-page py-12">
        {!muc.length ? <p className="the p-8 text-center text-[17px] text-muted">{t('chuaCoAnhMacDinh')}</p> :
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{muc.map(({ id, a, i }) => (
            <li key={a.tep} className="the overflow-hidden">
              <div className="relative aspect-[3/2] bg-sunken"><img src={a.nho} alt={a.moTa || tenDiem(id)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></div>
              <div className="p-5 text-[15px]">
                <Link to={`/dia-diem/${id}`} className="font-semibold text-action">{tenDiem(id)}{i > 0 ? ` (${i + 1})` : ''}</Link>
                <dl className="mt-2 space-y-1 text-sm text-ink-2">
                  <div><dt className="inline text-muted">{t('tacGia')}: </dt><dd className="inline">{a.tacGia}</dd></div>
                  <div><dt className="inline text-muted">{t('giayPhep')}: </dt><dd className="inline">{a.linkGiayPhep ? <a href={a.linkGiayPhep} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{a.giayPhep}</a> : a.giayPhep}</dd></div>
                </dl>
                <a href={a.nguon} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-action underline-offset-2 hover:underline">{t('xemTrenCommons')}</a>
              </div>
            </li>))}</ul>}
      </section>
    </div>);
}
