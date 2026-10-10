/** Tài khoản của tôi: tự đổi mật khẩu, tự bật / tắt xác thực hai lớp. */
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nhan, nutChinh, nutVien } from '../../components/common/KhoiQt';

interface Toi { hoTen: string; username: string; haiLop: boolean }
const loiHop = 'mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300';
const chiSo = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 6);

export default function AdminTaiKhoan() {
  const qc = useQueryClient();
  const { data: toi } = useQuery({ queryKey: ['qt-toi'], queryFn: () => adminFetch<Toi>('/tai-khoan') });
  const [mk, setMk] = useState({ cu: '', moi: '', lai: '' });
  const [loiMk, setLoiMk] = useState('');
  const [batDau, setBatDau] = useState<{ biMat: string; duongDan: string } | null>(null);
  const [qr, setQr] = useState('');
  const [ma, setMa] = useState('');
  const [tat, setTat] = useState({ matKhau: '', ma: '' });
  const [loi2, setLoi2] = useState('');
  useEffect(() => { if (batDau) QRCode.toDataURL(batDau.duongDan, { width: 220, margin: 1 }).then(setQr).catch(() => setQr('')); }, [batDau]);

  const doiMk = useMutation({ mutationFn: () => adminFetch('/tai-khoan/doi-mat-khau', { method: 'POST', body: JSON.stringify({ matKhauCu: mk.cu, matKhauMoi: mk.moi }) }),
    onSuccess: () => { toast.success('Đã đổi mật khẩu. Các phiên đăng nhập ở máy khác đã bị đăng xuất.'); setMk({ cu: '', moi: '', lai: '' }); setLoiMk(''); },
    onError: (e: Error) => setLoiMk(e.message) });
  const moBat = useMutation({ mutationFn: () => adminFetch<{ biMat: string; duongDan: string }>('/tai-khoan/hai-lop/bat-dau', { method: 'POST' }),
    onSuccess: (r) => { setBatDau(r); setMa(''); setLoi2(''); }, onError: (e: Error) => setLoi2(e.message) });
  const xacNhan = useMutation({ mutationFn: () => adminFetch('/tai-khoan/hai-lop/xac-nhan', { method: 'POST', body: JSON.stringify({ ma }) }),
    onSuccess: () => { toast.success('Đã bật xác thực hai lớp. Lần đăng nhập sau sẽ hỏi mã 6 số.'); setBatDau(null); qc.invalidateQueries({ queryKey: ['qt-toi'] }); },
    onError: (e: Error) => setLoi2(e.message) });
  const tatHaiLop = useMutation({ mutationFn: () => adminFetch('/tai-khoan/hai-lop/tat', { method: 'POST', body: JSON.stringify(tat) }),
    onSuccess: () => { toast.success('Đã tắt xác thực hai lớp.'); setTat({ matKhau: '', ma: '' }); setLoi2(''); qc.invalidateQueries({ queryKey: ['qt-toi'] }); },
    onError: (e: Error) => setLoi2(e.message) });

  const nopMk = () => {
    if (mk.moi !== mk.lai) return setLoiMk('Hai lần gõ mật khẩu mới không khớp nhau.');
    doiMk.mutate();
  };

  return (<>
    <TieuDeQt tieuDe="Tài khoản của tôi" moTa={toi ? `${toi.hoTen} · ${toi.username}` : ''} />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <The>
        <h2 className="flex items-center gap-2 text-[17px] font-bold"><KeyRound className="h-5 w-5" />Đổi mật khẩu</h2>
        <p className="text-[13px] text-slate-500">Ít nhất 12 ký tự, có chữ thường, chữ HOA, chữ số và ký tự đặc biệt. Ví dụ dạng: Suoi-Mo#2026-Ta. Đổi xong, máy khác đang đăng nhập tài khoản này sẽ bị đăng xuất.</p>
        <label className={nhan}>Mật khẩu hiện tại<input type="password" autoComplete="current-password" className={o} value={mk.cu} onChange={(e) => setMk({ ...mk, cu: e.target.value })} /></label>
        <label className={nhan}>Mật khẩu mới<input type="password" autoComplete="new-password" className={o} value={mk.moi} onChange={(e) => setMk({ ...mk, moi: e.target.value })} /></label>
        <label className={nhan}>Gõ lại mật khẩu mới<input type="password" autoComplete="new-password" className={o} value={mk.lai} onChange={(e) => setMk({ ...mk, lai: e.target.value })} /></label>
        {loiMk && <div className={loiHop}>{loiMk}</div>}
        <button type="button" className={nutChinh + ' mt-4'} disabled={!mk.cu || !mk.moi || doiMk.isPending} onClick={nopMk}>Đổi mật khẩu</button>
      </The>

      <The>
        <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-bold"><ShieldCheck className="h-5 w-5" />Xác thực hai lớp
          {toi && (toi.haiLop ? <The_nho mau="xanh">Đang bật</The_nho> : <The_nho mau="vang">Chưa bật</The_nho>)}</h2>
        <p className="text-[13px] text-slate-500">Khi bật, đăng nhập cần cả mật khẩu và mã 6 số trên điện thoại — lộ mật khẩu cũng không ai vào được. Nên bật, vì tài khoản xem được các bảng nhạy cảm (vụ việc, quân số, vi phạm).</p>

        {toi && !toi.haiLop && !batDau && <button type="button" className={nutChinh + ' mt-4'} disabled={moBat.isPending} onClick={() => moBat.mutate()}>Bật xác thực hai lớp</button>}

        {batDau && <div className="mt-4 space-y-3 text-sm">
          <p><b>Bước 1.</b> Cài ứng dụng Google Authenticator hoặc Microsoft Authenticator trên điện thoại, chọn thêm tài khoản, quét mã dưới đây.</p>
          {qr && <img src={qr} alt="Mã QR để thêm tài khoản vào ứng dụng xác thực" width={220} height={220} className="rounded-xl border border-slate-200 bg-white p-2" />}
          <p className="text-xs text-slate-500">Không quét được thì nhập tay khoá này: <code className="select-all break-all rounded bg-slate-100 px-1.5 py-0.5 text-[13px] dark:bg-slate-800">{batDau.biMat}</code></p>
          <label className={nhan}><b>Bước 2.</b> Nhập mã 6 số đang hiện trên ứng dụng
            <input className={o + ' tracking-[0.3em]'} inputMode="numeric" autoComplete="one-time-code" value={ma} onChange={(e) => setMa(chiSo(e.target.value))} placeholder="000000" /></label>
          <div className="flex gap-2"><button type="button" className={nutChinh} disabled={ma.length !== 6 || xacNhan.isPending} onClick={() => xacNhan.mutate()}>Xác nhận và bật</button>
            <button type="button" className={nutVien + ' min-h-[44px] px-4 text-sm'} onClick={() => setBatDau(null)}>Huỷ</button></div>
        </div>}

        {toi?.haiLop && <div className="mt-4">
          <p className="text-sm font-semibold">Tắt xác thực hai lớp</p>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <label className={nhan}>Mật khẩu<input type="password" autoComplete="current-password" className={o} value={tat.matKhau} onChange={(e) => setTat({ ...tat, matKhau: e.target.value })} /></label>
            <label className={nhan}>Mã 6 số hiện tại<input className={o} inputMode="numeric" value={tat.ma} onChange={(e) => setTat({ ...tat, ma: chiSo(e.target.value) })} /></label>
          </div>
          <button type="button" className={nutVien + ' mt-3 min-h-[44px] gap-1.5 px-4 text-sm'} disabled={!tat.matKhau || tat.ma.length !== 6 || tatHaiLop.isPending} onClick={() => tatHaiLop.mutate()}>
            <ShieldOff className="h-4 w-4" />Tắt xác thực hai lớp</button>
        </div>}
        {loi2 && <div className={loiHop}>{loi2}</div>}
      </The>
    </div>
  </>);
}
