import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/HomePage';
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth';

/* Trang thống kê và trang quản trị tách gói riêng: du khách mở trang chủ
   không phải tải thư viện biểu đồ hay mã quản trị. */
const ThongKePage = lazy(() => import('./pages/ThongKePage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminTongQuan = lazy(() => import('./pages/admin/AdminTongQuan'));
const AdminDiaDiem = lazy(() => import('./pages/admin/AdminDiaDiem'));
const AdminLuotKhach = lazy(() => import('./pages/admin/AdminLuotKhach'));
const AdminDanhGia = lazy(() => import('./pages/admin/AdminDanhGia'));
const AdminCanBo = lazy(() => import('./pages/admin/AdminCanBo'));
const AdminNhatKy = lazy(() => import('./pages/admin/AdminNhatKy'));
const AdminBaoCao = lazy(() => import('./pages/admin/AdminBaoCao'));
const AdminBang = lazy(() => import('./pages/admin/AdminBang'));
const AdminThongKe = lazy(() => import('./pages/admin/AdminThongKe'));
const AdminXaPhuong = lazy(() => import('./pages/admin/AdminXaPhuong'));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });

function KhungChung() {
  return (<div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <Header /><main className="flex-1"><Suspense fallback={<div className="py-20 text-center text-slate-500">Đang tải…</div>}><Outlet /></Suspense></main><Footer /></div>);
}
/** Chỉ cho vào khu quản trị khi đã khôi phục được phiên đăng nhập. */
function CanDangNhap() {
  const { staff, loading } = useAdminAuth();
  if (loading) return <div className="py-20 text-center text-slate-500">Đang kiểm tra phiên đăng nhập...</div>;
  return staff ? <AdminLayout /> : <Navigate to="/dang-nhap" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<KhungChung />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/thong-ke" element={<ThongKePage />} />
              <Route path="/dang-nhap" element={<AdminLoginPage />} />
              <Route path="/quan-tri" element={<CanDangNhap />}>
                <Route index element={<AdminTongQuan />} />
                <Route path="luot-khach" element={<AdminLuotKhach />} />
                <Route path="dia-diem" element={<AdminDiaDiem />} />
                <Route path="danh-gia" element={<AdminDanhGia />} />
                <Route path="nhat-ky" element={<AdminNhatKy />} />
                <Route path="can-bo" element={<AdminCanBo />} />
                <Route path="bao-cao" element={<AdminBaoCao />} />
                <Route path="bang/:bang" element={<AdminBang />} />
                <Route path="thong-ke" element={<AdminThongKe />} />
                <Route path="xa-phuong" element={<AdminXaPhuong />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { borderRadius: 12, fontFamily: 'inherit' } }} />
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
