import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, MapPin, Activity, Star, Users, FileText, Home, LogOut, ClipboardCheck, Table2, BarChart3, Building2 } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useCauHinh } from '../../utils/phuLuc';

/* Một quyền duy nhất: mọi cán bộ thấy mọi mục. Các bảng phụ lục lấy theo cấu
   hình máy chủ gửi về, thêm bảng mới là tự có mục mới. */
type Muc = { to: string; ten: string; ic: typeof MapPin; end?: boolean };

export default function AdminLayout() {
  const { staff, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { data: ch } = useCauHinh();
  if (!staff) return null;
  const muc: { nhom: string; ds: Muc[] }[] = [
    { nhom: 'Xử lý', ds: [
      { to: '/quan-tri', ten: 'Tổng quan', ic: LayoutDashboard, end: true },
      { to: '/quan-tri/dia-diem', ten: 'Địa điểm', ic: MapPin },
      { to: '/quan-tri/luot-khach', ten: 'Lượt khách theo tháng', ic: Activity },
      { to: '/quan-tri/danh-gia', ten: 'Đánh giá', ic: Star } ] },
    { nhom: 'Phụ lục thống kê', ds: [
      { to: '/quan-tri/bao-cao', ten: 'Báo cáo kỳ', ic: ClipboardCheck },
      { to: '/quan-tri/thong-ke', ten: 'Thống kê', ic: BarChart3 },
      ...(ch?.bang || []).map((b) => ({ to: `/quan-tri/bang/${b.key}`, ten: `${b.so}. ${b.ten}`, ic: Table2 })) ] },
    { nhom: 'Hệ thống', ds: [
      { to: '/quan-tri/xa-phuong', ten: 'Xã/phường', ic: Building2 },
      { to: '/quan-tri/can-bo', ten: 'Tài khoản cán bộ', ic: Users },
      { to: '/quan-tri/nhat-ky', ten: 'Nhật ký', ic: FileText } ] },
  ];
  const lop = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-primary-600 text-white shadow-soft' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'}`;
  return (
    <section className="container-page py-5">
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25"><ShieldCheck className="h-5 w-5" /></span>
            <span><b className="block leading-tight">{staff.name}</b><small className="text-[11px] text-white/70">Cán bộ · Mọi thao tác đều được ghi nhật ký</small></span>
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
        <aside className="hidden w-60 shrink-0 lg:block"><div className="sticky top-24 space-y-5">
          {muc.map((n) => <div key={n.nhom}><p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{n.nhom}</p>
            <div className="space-y-0.5">{n.ds.map((m) => <NavLink key={m.to} to={m.to} end={m.end} className={lop}><m.ic className="h-4 w-4" />{m.ten}</NavLink>)}</div></div>)}
        </div></aside>
        <div className="min-w-0 flex-1"><Outlet /></div>
      </div>
    </section>
  );
}
