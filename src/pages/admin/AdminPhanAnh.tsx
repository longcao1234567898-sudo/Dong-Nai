/** Phản ánh của người dân: lọc theo trạng thái, giao về xã/phường, trả lời (người gửi đọc được qua mã tra cứu). */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nutChinh, nutVien } from '../../components/common/KhoiQt';
import { useCauHinh } from '../../utils/phuLuc';

interface PA { id: number; ma: string; loai: string; diaDiem: string | null; xaPhuongId: number | null; noiDung: string; lienHe: string | null;
  trangThai: string; phanHoi: string | null; nguoiXuLy: string | null; xuLyLuc: string | null; guiLuc: string }
const LOAI: Record<string, string> = { 'gia-ca': 'Chặt chém, nâng giá', 'an-ninh': 'Mất an ninh, trộm cắp, lừa đảo', 've-sinh': 'Vệ sinh, môi trường',
  'dich-vu': 'Thái độ, chất lượng dịch vụ', 'an-toan': 'Nguy hiểm, mất an toàn', khac: 'Khác' };
const TRANG_THAI: Record<string, [string, 'vang' | 'xanh' | 'xam']> = { moi: ['Mới', 'vang'], 'dang-xu-ly': ['Đang xử lý', 'vang'], 'da-xu-ly': ['Đã xử lý', 'xanh'], 'khong-xu-ly': ['Không xử lý', 'xam'] };

function XuLy({ x, onXong }: { x: PA; onXong: () => void }) {
  const { data: ch } = useCauHinh();
  const [f, setF] = useState({ trangThai: x.trangThai === 'moi' ? 'dang-xu-ly' : x.trangThai, phanHoi: x.phanHoi || '', xaPhuongId: x.xaPhuongId || 0 });
  const luu = useMutation({ mutationFn: () => adminFetch(`/phan-anh/${x.id}`, { method: 'PATCH', body: JSON.stringify(f) }),
    onSuccess: () => { toast.success('Đã cập nhật phản ánh.'); onXong(); }, onError: (e: Error) => toast.error(e.message) });
  return (
    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-2">
      <label className="text-sm font-semibold">Trạng thái<select className={o} value={f.trangThai} onChange={(e) => setF({ ...f, trangThai: e.target.value })}>
        {Object.entries(TRANG_THAI).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}</select></label>
      <label className="text-sm font-semibold">Giao về xã/phường<select className={o} value={f.xaPhuongId} onChange={(e) => setF({ ...f, xaPhuongId: Number(e.target.value) })}>
        <option value={0}>— Chưa giao —</option>{ch?.xaPhuong.filter((z) => z.hien).map((z) => <option key={z.id} value={z.id}>{z.ten}</option>)}</select></label>
      <label className="text-sm font-semibold sm:col-span-2">Trả lời người gửi <small className="font-normal text-slate-500">(công khai qua mã tra cứu — bắt buộc khi đã xử lý hoặc không xử lý)</small>
        <textarea className={o} rows={3} maxLength={2000} value={f.phanHoi} onChange={(e) => setF({ ...f, phanHoi: e.target.value })} /></label>
      <div><button type="button" className={nutChinh} disabled={luu.isPending} onClick={() => luu.mutate()}>Lưu</button></div>
    </div>);
}

export default function AdminPhanAnh() {
  const qc = useQueryClient();
  const { data: ch } = useCauHinh();
  const [trangThai, setTrangThai] = useState('');
  const [mo, setMo] = useState<number | null>(null);
  const { data: ds = [], isLoading } = useQuery({ queryKey: ['qt-phan-anh', trangThai], queryFn: () => adminFetch<PA[]>(`/phan-anh${trangThai ? `?trangThai=${trangThai}` : ''}`) });
  const xa = (id: number | null) => ch?.xaPhuong.find((z) => z.id === id)?.ten;
  return (<>
    <TieuDeQt tieuDe="Phản ánh của người dân" moTa="Người gửi tra cứu kết quả bằng mã 8 ký tự. Số liên hệ chỉ cán bộ thấy, không bao giờ hiện công khai." />
    <The className="mb-4"><div className="flex flex-wrap gap-1.5">{[['', 'Tất cả'], ...Object.entries(TRANG_THAI).map(([k, [t]]) => [k, t])].map(([k, t]) => (
      <button key={k} type="button" aria-pressed={trangThai === k} onClick={() => setTrangThai(k)}
        className={`min-h-[36px] rounded-full border px-3 text-sm ${trangThai === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}>{t}</button>))}</div></The>
    <The>
      {isLoading && <p className="py-6 text-center text-slate-500">Đang tải…</p>}
      {!isLoading && !ds.length && <p className="py-6 text-center text-slate-500">Không có phản ánh nào.</p>}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">{ds.map((x) => (
        <li key={x.id} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-1.5"><The_nho mau={TRANG_THAI[x.trangThai]?.[1] || 'xam'}>{TRANG_THAI[x.trangThai]?.[0]}</The_nho>
              <b className="text-sm">{LOAI[x.loai] || x.loai}</b><code className="rounded bg-slate-100 px-1.5 text-xs dark:bg-slate-800">{x.ma}</code></span>
            <small className="text-xs text-slate-500">{new Date(x.guiLuc).toLocaleString('vi-VN')}</small></div>
          <p className="mt-1 text-sm">{x.noiDung}</p>
          <p className="mt-1 text-xs text-slate-500">{[x.diaDiem && `Địa điểm: ${x.diaDiem}`, xa(x.xaPhuongId) && `Xã/phường: ${xa(x.xaPhuongId)}`, x.lienHe && `Liên hệ: ${x.lienHe}`,
            x.nguoiXuLy && `Cán bộ xử lý: ${x.nguoiXuLy}`].filter(Boolean).join(' · ')}</p>
          {x.phanHoi && mo !== x.id && <p className="mt-1 rounded-lg border-l-4 border-primary-600 bg-primary-50 px-3 py-1.5 text-sm dark:bg-slate-800">{x.phanHoi}</p>}
          <button type="button" className={nutVien + ' mt-2'} onClick={() => setMo(mo === x.id ? null : x.id)}>{mo === x.id ? 'Đóng' : 'Xử lý / trả lời'}</button>
          {mo === x.id && <XuLy x={x} onXong={() => { setMo(null); qc.invalidateQueries({ queryKey: ['qt-phan-anh'] }); qc.invalidateQueries({ queryKey: ['qt-tong-quan'] }); }} />}
        </li>))}</ul>
    </The>
  </>);
}
