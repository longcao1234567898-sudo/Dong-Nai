import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/HomePage';
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth';
import { NgonNguProvider, useNN } from './i18n/NgonNgu';
import { batHienDan, batNghieng } from './utils/hieuUng';
import { cheDoMinhHoa } from './minh-hoa/cheDo';
import CongXacMinh from './components/common/CongXacMinh';

/* Trang thống kê và trang quản trị tách gói riêng: du khách mở trang chủ
   không phải tải thư viện biểu đồ hay mã quản trị. */
const ThongKePage = lazy(() => import('./pages/ThongKePage'));
const DiaDiemPage = lazy(() => import('./pages/cong-khai/DiaDiemPage'));
const LoTrinhDanhSach = lazy(() => import('./pages/cong-khai/LoTrinhPage').then((m) => ({ default: m.LoTrinhDanhSach })));
const LoTrinhChiTiet = lazy(() => import('./pages/cong-khai/LoTrinhPage').then((m) => ({ default: m.LoTrinhChiTiet })));
const TuTaoLoTrinh = lazy(() => import('./pages/cong-khai/LoTrinhPage').then((m) => ({ default: m.TuTaoLoTrinh })));
const LuuTruPage = lazy(() => import('./pages/cong-khai/LuuTruPage'));
const PhanAnhPage = lazy(() => import('./pages/cong-khai/PhanAnhPage'));
const TinTucPage = lazy(() => import('./pages/cong-khai/TinTucPage'));
const KhachQuocTePage = lazy(() => import('./pages/cong-khai/KhachQuocTePage'));
const AdminNguonAnh = lazy(() => import('./pages/admin/AdminNguonAnh'));
const AdminLoTrinh = lazy(() => import('./pages/admin/AdminLoTrinh'));
const AdminTinTuc = lazy(() => import('./pages/admin/AdminTinTuc'));
const AdminPhanAnh = lazy(() => import('./pages/admin/AdminPhanAnh'));
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
const AdminTaiKhoan = lazy(() => import('./pages/admin/AdminTaiKhoan'));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });

function KhungChung() {
  const { t } = useNN();
  /* Chuyển động dùng chung: hiện khi cuộn (3D) và thẻ nghiêng theo chuột — bật một lần cho cả trang. */
  useEffect(() => { const a = batHienDan(), b = batNghieng(); return () => { a(); b(); }; }, []);
  return (<div className="flex min-h-screen flex-col text-ink">
    <a href="#noi-dung" className="sr-only z-[2000] rounded-xl bg-paper px-4 py-3 font-semibold text-ink shadow-sh-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t('boQuaNoiDung')}</a>
    {cheDoMinhHoa && <div role="status" className="bg-[#FCEFC7] px-4 py-2 text-center text-sm font-semibold text-[#192522]">{t('dangXemMinhHoa')}</div>}
    <Header /><main id="noi-dung" tabIndex={-1} className="flex-1 outline-none"><Suspense fallback={<div className="py-20 text-center text-muted">{t('dangTai')}</div>}><Outlet /></Suspense></main><Footer /></div>);
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
      <NgonNguProvider>
      <AdminAuthProvider>
        <BrowserRouter>
        <CongXacMinh>
          <Routes>
            <Route element={<KhungChung />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/thong-ke" element={<ThongKePage />} />
              <Route path="/dia-diem/:id" element={<DiaDiemPage />} />
              <Route path="/lo-trinh" element={<LoTrinhDanhSach />} />
              <Route path="/lo-trinh/:id" element={<LoTrinhChiTiet />} />
              <Route path="/tu-tao-lo-trinh" element={<TuTaoLoTrinh />} />
              <Route path="/luu-tru" element={<LuuTruPage />} />
              <Route path="/phan-anh" element={<PhanAnhPage />} />
              <Route path="/tin-tuc" element={<TinTucPage />} />
              <Route path="/khach-quoc-te" element={<KhachQuocTePage />} />
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
                <Route path="tai-khoan" element={<AdminTaiKhoan />} />
                <Route path="lo-trinh" element={<AdminLoTrinh />} />
                <Route path="tin-tuc" element={<AdminTinTuc />} />
                <Route path="phan-anh" element={<AdminPhanAnh />} />
                <Route path="nguon-anh" element={<AdminNguonAnh />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </CongXacMinh>
        </BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { borderRadius: 14, fontFamily: 'inherit', background: '#FFFEFB', color: '#192522', boxShadow: '0 4px 10px rgb(18 60 53 / .08), 0 24px 50px -20px rgb(18 60 53 / .4)' } }} />
      </AdminAuthProvider>
      </NgonNguProvider>
    </QueryClientProvider>
  );
}
