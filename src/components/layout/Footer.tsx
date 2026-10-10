import { Link } from 'react-router-dom';
import { useNN } from '../../i18n/NgonNgu';
export default function Footer() {
  const { t } = useNN();
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <div className="container-page flex flex-wrap justify-between gap-x-6 gap-y-3">
        <span>{t('chanTrang')}</span>
        <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t('tenTrang')}>
          <Link to="/tin-tuc" className="font-semibold text-primary-600">{t('tinTuc')}</Link>
          <Link to="/khach-quoc-te" className="font-semibold text-primary-600">{t('khachQuocTe')}</Link>
          <Link to="/dang-nhap" className="font-semibold text-primary-600">{t('choCanBo')}</Link>
        </nav>
      </div>
    </footer>
  );
}
