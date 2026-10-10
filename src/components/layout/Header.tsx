import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Leaf, Map, BarChart3, ShieldCheck, Moon, Sun, Route, BedDouble, MessageSquareWarning } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useNN } from '../../i18n/NgonNgu';

/** Đầu trang — cùng kiểu với Header.tsx của Điểm Chạm An Ninh, thêm nút đổi ngôn ngữ. */
export default function Header() {
  const { staff } = useAdminAuth();
  const { t, nn, doi } = useNN();
  const [toi, setToi] = useState(() => { try { return localStorage.getItem('dldn_giao_dien') === 'dark'; } catch { return false; } });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', toi);
    try { localStorage.setItem('dldn_giao_dien', toi ? 'dark' : 'light'); } catch { /* bỏ qua */ }
  }, [toi]);
  const lop = ({ isActive }: { isActive: boolean }) => `inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium transition lg:px-3 ${
    isActive ? 'bg-primary-600 text-white shadow-soft' : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-slate-800'}`;
  const MUC = [
    { to: '/', ten: t('khamPha'), ic: Map, end: true },
    { to: '/lo-trinh', ten: t('loTrinh'), ic: Route },
    { to: '/luu-tru', ten: t('luuTru'), ic: BedDouble },
    { to: '/phan-anh', ten: t('phanAnh'), ic: MessageSquareWarning },
    { to: '/thong-ke', ten: t('thongKe'), ic: BarChart3 },
  ];
  return (
    <header className="glass sticky top-0 z-[600] border-b border-slate-200 dark:border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container-page flex h-16 items-center gap-2">
        <Link to="/" className="mr-auto flex min-w-0 items-center gap-2.5" aria-label={t('tenTrang')}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-500 text-white"><Leaf className="h-5 w-5" /></span>
          <span className="hidden min-w-0 sm:block"><b className="block font-extrabold leading-tight text-primary-600 dark:text-primary-400">{t('tenTrang')}</b>
            <small className="hidden text-[11px] text-slate-500 lg:block">{t('thanhPho')}</small></span>
        </Link>
        <nav className="flex gap-0.5" aria-label={t('tenTrang')}>
          {MUC.map((m) => <NavLink key={m.to} to={m.to} end={m.end} className={lop} title={m.ten}><m.ic className="h-4 w-4" /><span className="hidden md:inline">{m.ten}</span></NavLink>)}
          {staff && <Link to="/quan-tri" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-accent-500 px-2.5 text-sm font-bold text-white lg:px-3.5" title={t('quanTri')}>
            <ShieldCheck className="h-4 w-4" /><span className="hidden lg:inline">{t('quanTri')}</span></Link>}
        </nav>
        <button type="button" onClick={doi} title={t('doiNgonNgu')} aria-label={t('doiNgonNgu')}
          className="min-h-[40px] rounded-xl border border-slate-200 px-2 text-xs font-extrabold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{nn === 'vi' ? 'EN' : 'VI'}</button>
        <button type="button" onClick={() => setToi((x) => !x)} aria-label={t('doiGiaoDien')} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          {toi ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
      </div>
    </header>
  );
}
