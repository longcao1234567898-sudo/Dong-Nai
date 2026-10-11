import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck, Moon, Sun, Menu, X } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useNN } from '../../i18n/NgonNgu';

/** Dấu hiệu: ô vuông màu rừng, dòng sông san hô, đường núi. Trùng với biểu tượng tab. */
export const DauHieu = ({ co = 36 }: { co?: number }) => (
  <svg width={co} height={co} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
    <rect width="32" height="32" rx="9" fill="#123C35" />
    <path d="M6 13l5-5 4 3 3-2 8 6" fill="none" stroke="#F7F5EF" strokeWidth="1.6" strokeLinejoin="round" opacity=".7" />
    <path d="M6 22c5-1 6-7 11-8s6 3 9-1" fill="none" stroke="#F17C5B" strokeWidth="2.6" strokeLinecap="round" />
  </svg>);

/** Đầu trang. Ở trang chủ, khi chưa cuộn, nằm trong suốt trên cảnh 3D; cuộn xuống thì thành nền giấy. */
export default function Header() {
  const { staff } = useAdminAuth();
  const { t, nn, doi } = useNN();
  const { pathname } = useLocation();
  const [toi, setToi] = useState(() => { try { return localStorage.getItem('dldn_giao_dien') === 'dark'; } catch { return false; } });
  const [cuon, setCuon] = useState(false);
  const [moMenu, setMoMenu] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', toi);
    try { localStorage.setItem('dldn_giao_dien', toi ? 'dark' : 'light'); } catch { /* bỏ qua */ }
  }, [toi]);
  useEffect(() => { const f = () => setCuon(window.scrollY > 40); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => { setMoMenu(false); }, [pathname]);
  useEffect(() => { if (!moMenu) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && setMoMenu(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [moMenu]);
  const trenCanh = pathname === '/' && !cuon && !moMenu;
  const MUC = [
    { to: '/', ten: t('khamPha'), end: true },
    { to: '/lo-trinh', ten: t('loTrinh') },
    { to: '/luu-tru', ten: t('luuTru') },
    { to: '/tin-tuc', ten: t('tinTuc') },
    { to: '/phan-anh', ten: t('phanAnh') },
    { to: '/thong-ke', ten: t('thongKe') },
  ];
  const lop = ({ isActive }: { isActive: boolean }) => `relative inline-flex min-h-[44px] items-center whitespace-nowrap px-3 text-[15px] font-medium transition-colors
    after:absolute after:inset-x-3 after:bottom-1.5 after:h-[2px] after:rounded-full after:transition-transform after:duration-300 ${isActive ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-50'}
    ${trenCanh ? 'text-[#F7F5EF] after:bg-coral' : 'text-ink after:bg-action'}`;
  const nutPhu = `grid h-11 min-w-[44px] place-items-center rounded-xl px-2 text-[13px] font-semibold transition-colors ${trenCanh ? 'text-[#F7F5EF] hover:bg-white/10' : 'text-ink-2 hover:bg-sunken'}`;
  return (
    <header className={`sticky top-0 z-[600] transition-[background-color,box-shadow] duration-300 ${trenCanh ? 'bg-transparent' : 'bg-ivory/[.97] shadow-[0_1px_0_rgb(var(--c-line))]'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container-page flex h-16 items-center gap-2">
        <Link to="/" className="mr-auto flex min-w-0 items-center gap-2.5" aria-label={t('tenTrang')}>
          <DauHieu co={34} />
          <span className={`truncate font-serif text-[21px] font-medium tracking-[-0.01em] ${trenCanh ? 'text-[#F7F5EF]' : 'text-forest dark:text-ink'}`}>{t('tenTrang')}</span>
        </Link>
        <nav className="hidden lg:flex" aria-label={t('tenTrang')}>
          {MUC.map((m) => <NavLink key={m.to} to={m.to} end={m.end} className={lop}>{m.ten}</NavLink>)}
        </nav>
        {staff && <Link to="/quan-tri" className={`${nutPhu} gap-1.5`} title={t('quanTri')}><ShieldCheck className="h-[18px] w-[18px]" /><span className="sr-only">{t('quanTri')}</span></Link>}
        <button type="button" onClick={doi} title={t('doiNgonNgu')} aria-label={t('doiNgonNgu')} className={nutPhu}>{nn === 'vi' ? 'EN' : 'VI'}</button>
        <button type="button" onClick={() => setToi((x) => !x)} aria-label={t('doiGiaoDien')} className={nutPhu}>{toi ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
        <button type="button" onClick={() => setMoMenu((m) => !m)} aria-expanded={moMenu} aria-controls="menu-nho" aria-label={t('danhMuc')} className={`${nutPhu} lg:hidden`}>
          {moMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
      </div>
      {moMenu && <nav id="menu-nho" className="hop-thoai border-t border-line bg-ivory pb-4 lg:hidden" aria-label={t('tenTrang')}>
        <div className="container-page flex flex-col py-2">
          {MUC.map((m) => <NavLink key={m.to} to={m.to} end={m.end} className={({ isActive }) => `flex min-h-[52px] items-center border-b border-line/60 font-serif text-[22px] ${isActive ? 'text-action' : 'text-ink'}`}>{m.ten}</NavLink>)}
        </div></nav>}
    </header>
  );
}
