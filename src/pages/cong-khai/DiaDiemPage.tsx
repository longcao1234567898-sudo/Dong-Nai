/** Trang riêng của một địa điểm — có đường dẫn để chia sẻ, ảnh lớn, bản đồ nhỏ, đánh giá. */
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import BanDo from '../../components/du-lich/BanDo';
import { ThongTinDiaDiem, DaiAnh } from '../../components/du-lich/ChiTiet';
import { KhungAnh } from '../../components/du-lich/GiaoDien';
import { layDiaDiem } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';

export default function DiaDiemPage() {
  const { id } = useParams();
  const { t, chon } = useNN();
  const { data: ds = [], isLoading } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const p = ds.find((x) => x.id === id);
  useEffect(() => { if (p) document.title = `${chon(p.ten, p.tenEn)} — ${t('tenTrang')}`; return () => { document.title = t('tenTrang'); }; }, [p, chon, t]);
  if (isLoading) return <p className="py-24 text-center text-muted">{t('dangTai')}</p>;
  if (!p) return <section className="container-page py-24 text-center"><p className="tieu-de-vua">404</p><Link className="mt-3 inline-block text-action" to="/">{t('khamPha')}</Link></section>;
  return (
    <div className="animate-page nen-dong-muc pb-20">
      <div className="container-page pt-8">
        <Link to="/" className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-action"><ArrowLeft className="h-4 w-4" />{t('khamPha')}</Link>
        <div className="mt-4 grid gap-8 lg:grid-cols-12">
          <article className="hien-dan the min-w-0 p-6 sm:p-8 lg:col-span-7"><ThongTinDiaDiem p={p} trangRieng /></article>
          <aside className="space-y-4 lg:col-span-5">
            {/* Ảnh: ảnh cán bộ tải lên, không thì ảnh mặc định của điểm. */}
            <div className="hien-dan relative aspect-[3/2] overflow-hidden rounded-[20px] bg-sunken shadow-sh-2"><KhungAnh p={p} uuTien sizes="(min-width: 1024px) 40vw, 100vw" /></div>
            {p.anh.length > 1 && <div className="hien-dan"><DaiAnh p={p} lon /></div>}
            <div className="hien-dan lg:sticky lg:top-24"><BanDo ds={[p]} tam={[p.lat, p.lng]} chon={p.id} onChon={() => undefined} thap /></div>
          </aside>
        </div>
      </div>
    </div>);
}
