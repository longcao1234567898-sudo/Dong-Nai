import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <div className="container-page flex flex-wrap justify-between gap-3">
        <span>Du lịch Đồng Nai — thông tin do cán bộ cập nhật. Bản đồ © người đóng góp OpenStreetMap.</span>
        <Link to="/dang-nhap" className="font-semibold text-primary-600">Dành cho cán bộ được cấp tài khoản</Link>
      </div>
    </footer>
  );
}
