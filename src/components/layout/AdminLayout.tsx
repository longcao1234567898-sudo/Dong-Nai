import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, MapPin, Activity, Star, Users, FileText, Home, LogOut } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { VAI_TRO } from '../../utils/hangSo';

/* Mục quản trị và vai trò được thấy — khớp phân quyền ở routes/quan-tri.js. */
const MUC = [
  { nhom: 'Xử lý', ds: [
    { to: '/quan-tri', ten: 'Tổng quan', ic: LayoutDashboard, vt: ['admin', 'manager', 'handler'], end: true },
    { to: '/quan-tri/dia-diem', ten: 'Địa điểm', ic: MapPin, vt: ['admin', 'manager'] },
    { to: '/quan-tri/luot-khach', ten: 'Lượt khách', ic: Activity, vt: ['admin', 'manager', 'handler'] },
    { to: '/quan-tri/danh-gia', ten: 'Đánh giá', ic: Star, vt: ['admin', 'manager'] } ] },
  { nhom: 'Hệ thống', ds: [
    { to: '/quan-tri/can-bo', ten: 'Tài khoản cán bộ', ic: Users, vt: ['admin'] },
    { to: '/quan-tri/nhat-ky', ten: 'Nhật ký', ic: FileText, vt: ['admin', 'manager'] } ] },
];

export default function AdminLayout() {
  const { staff, logout } = useAdminAuth();
  const navigate = useNavigate();
  if (!staff) return null;
  const lop = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-primary-600 text-white shadow-soft' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'}`;
  const muc = MUC.map((n) => ({ ...n, ds: n.ds.filter((m) => m.vt.includes(staff.role)) })).filter((n) => n.ds.length);
  return (
    <section className="container-page py-5">
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25"><ShieldCheck className="h-5 w-5" /></span>
            <span><b className="block leading-tight">{staff.name}</b><small className="text-[11px] text-white/70">{VAI_TRO[staff.role]} · Mọi thao tác đều được ghi nhật ký</small></span>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"><Home className="h-4 w-4" />Trang du khách</Link>
            <button type="button" onClick={async () => { await logout(); navigate('/dang-nhap'); }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"><LogOut className="h-4 w-4" />Đăng xuất</button>
          </div>
        </div>
      </div>
      <nav className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-soft dark:bg-slate-900 lg:hidden" aria-label="Mục quản trị">
        {muc.flatMap((n) => n.ds).map((m) => <NavLink key={m.to} to={m.to} end={m.end} className={(a) => lop(a) + ' shrink-0 whitespace-nowrap'}><m.ic className="h-4 w-4" />{m.ten}</NavLink>)}
      </nav>
      <div className="flex gap-5">
        <aside className="hidden w-56 shrink-0 lg:block"><div className="sticky top-24 space-y-5">
          {muc.map((n) => <div key={n.nhom}><p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{n.nhom}</p>
            <div className="space-y-0.5">{n.ds.map((m) => <NavLink key={m.to} to={m.to} end={m.end} className={lop}><m.ic className="h-4 w-4" />{m.ten}</NavLink>)}</div></div>)}
        </div></aside>
        <div className="min-w-0 flex-1"><Outlet /></div>
      </div>
    </section>
  );
}
