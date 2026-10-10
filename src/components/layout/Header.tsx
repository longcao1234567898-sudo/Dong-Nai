import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Leaf, Map, BarChart3, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

/** Đầu trang — cùng kiểu với Header.tsx của Điểm Chạm An Ninh. */
export default function Header() {
  const { staff } = useAdminAuth();
  const [toi, setToi] = useState(() => { try { return localStorage.getItem('dldn_giao_dien') === 'dark'; } catch { return false; } });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', toi);
    try { localStorage.setItem('dldn_giao_dien', toi ? 'dark' : 'light'); } catch { /* bỏ qua */ }
  }, [toi]);
  const lop = ({ isActive }: { isActive: boolean }) => `inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${
    isActive ? 'bg-primary-600 text-white shadow-soft' : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-slate-800'}`;
  return (
    <header className="glass sticky top-0 z-[600] border-b border-slate-200 dark:border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container-page flex h-16 items-center gap-3">
        <Link to="/" className="mr-auto flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-500 text-white"><Leaf className="h-5 w-5" /></span>
          <span className="min-w-0"><b className="block font-extrabold leading-tight text-primary-600 dark:text-primary-400">Du lịch Đồng Nai</b>
            <small className="hidden text-[11px] text-slate-500 sm:block">Thành phố Đồng Nai</small></span>
        </Link>
        <nav className="flex gap-1" aria-label="Điều hướng chính">
          <NavLink to="/" end className={lop}><Map className="h-4 w-4" /><span className="hidden sm:inline">Khám phá</span></NavLink>
          <NavLink to="/thong-ke" className={lop}><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Thống kê</span></NavLink>
          {staff && <Link to="/quan-tri" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-accent-500 px-3.5 text-sm font-bold text-white">
            <ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Quản trị</span></Link>}
        </nav>
        <button type="button" onClick={() => setToi((x) => !x)} aria-label="Chuyển giao diện sáng tối" className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          {toi ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
      </div>
    </header>
  );
}
