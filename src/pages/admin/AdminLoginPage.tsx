/** Trang đăng nhập khu vực cán bộ */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Loader2, Smartphone } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { LoginError } from '../../services/adminService';
import { ANH_MAC_DINH, srcSetMacDinh } from '../../utils/anhMacDinh';

/* Nền trang đăng nhập: ảnh mặc định đủ rộng cho cả màn hình, ưu tiên Cát Tiên. */
const ANH_NEN = [...(ANH_MAC_DINH['vuon-quoc-gia-cat-tien'] || []), ...Object.values(ANH_MAC_DINH).flat()].find((a) => a.rong >= 1280);

export default function AdminLoginPage() {
  const { login, staff, loading: dangKhoiPhucPhien } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* Ô "không phải người máy" chỉ ở cổng vào (CongXacMinh). Tài khoản vừa bị gõ
     sai nhiều lần thì máy chủ đòi qua cổng lần nữa: cổng tự hiện đè lên trang,
     tên và mật khẩu đã gõ vẫn giữ, xong bấm Đăng nhập lại. */
  /* Xác thực hai lớp: mật khẩu đúng thì máy chủ báo canOtp -> hiện ô mã 6 số,
     giữ nguyên tên và mật khẩu đã gõ, gửi lại kèm mã. */
  const [canOtp, setCanOtp] = useState(false);
  const [maOtp, setMaOtp] = useState('');

  async function handleSubmit() {
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }
    /* Chặn ngay tại giao diện cho rõ ràng, khỏi phải đi một vòng lên máy chủ
       rồi quay về với đúng câu nhắc mà người dùng đang nhìn thấy sẵn. */
    if (canOtp && !/^\d{6}$/.test(maOtp.replace(/\s/g, ''))) {
      setError('Nhập đủ 6 chữ số đang hiện trên ứng dụng xác thực.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password, canOtp ? maOtp.replace(/\s/g, '') : undefined);
      navigate('/quan-tri');
    } catch (e) {
      /* Lần đầu máy chủ hỏi mã 6 số không phải lỗi — ô nhập mã đã tự giải thích, không hiện khung đỏ. */
      const hoiMaLanDau = e instanceof LoginError && e.canOtp && !canOtp;
      setError(hoiMaLanDau ? '' : e instanceof Error ? e.message : 'Đăng nhập thất bại.');
      if (e instanceof LoginError && e.canOtp) { setCanOtp(true); setMaOtp(''); }
    } finally {
      setLoading(false);
    }
  }

  /* Chờ khôi phục phiên xong rồi mới quyết định — nếu không, cán bộ đang có
     phiên hợp lệ sẽ thấy form đăng nhập loé lên một nhịp trước khi bị chuyển đi. */
  if (dangKhoiPhucPhien) {
    return (
      <div className="container-page flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  // Đã đăng nhập -> vào thẳng khu quản trị
  if (staff) return <Navigate to="/quan-tri" replace />;

  return (
    <div className="relative isolate flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-[#0C2925] px-4 py-12 sm:py-20">
      <div className="hero-nen absolute inset-0" aria-hidden="true" />
      {ANH_NEN && <img src={ANH_NEN.tep} srcSet={srcSetMacDinh(ANH_NEN)} sizes="100vw" alt="" aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-[#0C2925]/55" aria-hidden="true" />
      <div className="hop-thoai relative w-full max-w-md rounded-[24px] bg-paper p-8 text-ink shadow-sh-3">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest text-[#F7F5EF]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="tieu-de-vua">Khu vực cán bộ</h1>
          <p className="mt-1 text-sm text-muted">Du lịch Đồng Nai, thành phố Đồng Nai</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Tên đăng nhập</label>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-primary-500 dark:border-slate-700">
          <User className="h-4 w-4 text-slate-400" />
          <input
            className="w-full bg-transparent py-2.5 text-sm outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="admin"
            autoComplete="username"
          />
        </div>

        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Mật khẩu</label>
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-primary-500 dark:border-slate-700">
          <Lock className="h-4 w-4 text-slate-400" />
          <input
            type="password"
            className="w-full bg-transparent py-2.5 text-sm outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {canOtp && (<>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Mã xác thực 6 số</label>
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-primary-500 dark:border-slate-700">
            <Smartphone className="h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent py-2.5 text-lg tracking-[0.4em] outline-none"
              value={maOtp}
              onChange={(e) => setMaOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
            />
          </div>
          <p className="mb-6 text-xs text-slate-500">Mở ứng dụng xác thực (Google Authenticator, Microsoft Authenticator…) trên điện thoại, nhập mã đang hiện. Mất điện thoại thì nhờ đồng nghiệp tắt hai lớp hộ ở mục Tài khoản cán bộ.</p>
        </>)}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="nut nut-chinh w-full"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập...</> : 'Đăng nhập'}
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          Chỉ dành cho cán bộ được cấp tài khoản. Mọi thao tác đều được ghi nhật ký.
        </p>
      </div>
    </div>
  );
}
