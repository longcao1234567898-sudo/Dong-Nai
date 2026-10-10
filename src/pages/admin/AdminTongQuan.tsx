import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt } from '../../components/common/KhoiQt';
import { so } from '../../utils/hangSo';
export default function AdminTongQuan() {
  const { data: d } = useQuery({ queryKey: ['qt-tong-quan'], queryFn: () => adminFetch<{ diaDiem: number; choKiemTra: number; khachThangNay: number; danhGiaMoi: number }>('/tong-quan') });
  return (<>
    <TieuDeQt tieuDe="Tổng quan" moTa="Tình hình dữ liệu du lịch hiện tại." />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[[d?.diaDiem, 'địa điểm'], [d?.choKiemTra, 'địa điểm chờ kiểm tra'], [d?.khachThangNay, 'lượt khách tháng này'], [d?.danhGiaMoi, 'đánh giá mới trong 7 ngày']].map(([g, n], i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"><b className="block text-2xl font-extrabold">{d ? so(Number(g)) : '…'}</b><small className="text-xs text-slate-500">{n}</small></div>))}
    </div>
    {!!d?.choKiemTra && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">Còn {d.choKiemTra} địa điểm chưa được cán bộ kiểm tra. Nên bổ sung số điện thoại, giờ mở cửa từ nguồn chính thức rồi đánh dấu đã kiểm tra.</div>}
  </>);
}
