/** Trang riêng của một địa điểm — có đường dẫn để chia sẻ, ảnh lớn, bản đồ nhỏ, đánh giá. */
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BanDo from '../../components/du-lich/BanDo';
import { ThongTinDiaDiem, DaiAnh } from '../../components/du-lich/ChiTiet';
import { layDiaDiem } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';

export default function DiaDiemPage() {
  const { id } = useParams();
  const { t, chon } = useNN();
  const { data: ds = [], isLoading } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const p = ds.find((x) => x.id === id);
  useEffect(() => { if (p) document.title = `${chon(p.ten, p.tenEn)} — ${t('tenTrang')}`; return () => { document.title = t('tenTrang'); }; }, [p, chon, t]);
  if (isLoading) return <p className="py-20 text-center text-slate-500">{t('dangTai')}</p>;
  if (!p) return <section className="container-page py-16 text-center"><p>404</p><Link className="text-primary-600" to="/">{t('khamPha')}</Link></section>;
  return (
    <section className="animate-page container-page py-8">
      <Link to="/" className="text-sm font-semibold text-primary-600">← {t('khamPha')}</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900"><ThongTinDiaDiem p={p} trangRieng /></div>
        <div className="space-y-4"><DaiAnh p={p} lon /><BanDo ds={[p]} tam={[p.lat, p.lng]} onChon={() => undefined} thap /></div>
      </div>
    </section>);
}
