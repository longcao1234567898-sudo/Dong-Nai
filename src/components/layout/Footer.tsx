import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { layTinTuc } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';
import { DauHieu } from './Header';

/** Chân trang trên mảng rừng đêm: số điện thoại cần biết (cán bộ quản lý), lối đi nhanh, nguồn bản đồ. */
export default function Footer() {
  const { t, chon } = useNN();
  const { data: tin = [] } = useQuery({ queryKey: ['tin-tuc'], queryFn: layTinTuc });
  const lienHe = tin.filter((x) => x.loai === 'lien-he');
  const LOI = [['/', t('khamPha')], ['/lo-trinh', t('goiYLoTrinh')], ['/luu-tru', t('luuTru')], ['/tin-tuc', t('tinTuc')],
    ['/phan-anh', t('phanAnh')], ['/khach-quoc-te', t('khachQuocTe')], ['/thong-ke', t('thongKe')]];
  return (
    <footer className="nen-toi nen-dong-muc" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="container-page grid gap-10 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3"><DauHieu co={40} /><b className="font-serif text-[24px] font-medium">{t('tenTrang')}</b></div>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-[#B9C7C1]">{t('chanTrangMoTa')}</p>
        </div>
        <nav className="md:col-span-4" aria-label={t('tenTrang')}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-1">{LOI.map(([to, ten]) => (
            <li key={to}><Link to={to} className="inline-flex min-h-[40px] items-center text-[15px] text-[#F7F5EF] underline-offset-4 hover:underline">{ten}</Link></li>))}</ul>
        </nav>
        {lienHe.length > 0 && <div className="order-first md:order-none md:col-span-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Phone className="h-4 w-4" />{t('soCanBiet')}</h2>
          <ul className="mt-3 divide-y divide-white/10">{lienHe.map((x) => (
            <li key={x.id}><a href={`tel:${String(x.noiDung || '').replace(/[^0-9+]/g, '')}`} className="flex min-h-[48px] items-center justify-between gap-4 text-[15px] hover:text-coral">
              <span>{chon(x.tieuDe, x.tieuDeEn)}</span><b className="font-serif text-[24px] font-medium tabular-nums">{x.noiDung}</b></a></li>))}</ul>
        </div>}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-[13px] text-[#B9C7C1]">
          <span>{t('nguonBanDo')}</span>
          <Link to="/dang-nhap" className="inline-flex min-h-[40px] items-center text-[#F7F5EF] underline-offset-4 hover:underline">{t('choCanBo')}</Link>
        </div>
      </div>
    </footer>
  );
}
