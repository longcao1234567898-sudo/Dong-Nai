import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The } from '../../components/common/KhoiQt';
import { so } from '../../utils/hangSo';
import { ngayVn } from '../../utils/phuLuc';

interface TQ { diaDiem: number; choKiemTra: number; khachThangNay: number; danhGiaMoi: number; diaDiemChuaGanXa: number; phanAnhMoi: number;
  baoCao: { kyId: number; ky: string; hanNop: string | null; khoa: boolean; soXa: number; daChot: number } | null }

export default function AdminTongQuan() {
  const { data: d } = useQuery({ queryKey: ['qt-tong-quan'], queryFn: () => adminFetch<TQ>('/tong-quan') });
  const bc = d?.baoCao;
  const quaHan = bc?.hanNop && bc.hanNop < new Date().toISOString().slice(0, 10) && bc.daChot < bc.soXa;
  return (<>
    <TieuDeQt tieuDe="Tổng quan" moTa="Tình hình dữ liệu du lịch hiện tại." />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[[d?.diaDiem, 'địa điểm'], [d?.choKiemTra, 'địa điểm chờ kiểm tra'], [d?.khachThangNay, 'lượt khách tháng này'], [d?.danhGiaMoi, 'đánh giá mới trong 7 ngày']].map(([g, n], i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"><b className="block text-2xl font-extrabold">{d ? so(Number(g)) : '…'}</b><small className="text-xs text-slate-500">{n}</small></div>))}
    </div>
    {!!d?.phanAnhMoi && <Link to="/quan-tri/phan-anh" className="mt-4 block rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200">
      Có {d.phanAnhMoi} phản ánh mới của người dân chưa xử lý →</Link>}
    {bc && <The className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">Phụ lục thống kê — {bc.ky}</h2>
        <Link to="/quan-tri/bao-cao" className="text-sm font-semibold text-primary-600">Xem tiến độ từng xã →</Link>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Đã chốt <b>{bc.daChot}/{bc.soXa}</b> xã/phường{bc.hanNop ? ` · hạn nộp ${ngayVn(bc.hanNop)}` : ''}{bc.khoa ? ' · kỳ đã khoá' : ''}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-primary-600" style={{ width: `${bc.soXa ? (bc.daChot / bc.soXa) * 100 : 0}%` }} /></div>
      {quaHan && <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">Đã quá hạn nộp mà còn {bc.soXa - bc.daChot} xã/phường chưa chốt.</p>}
    </The>}
    {!!d?.choKiemTra && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">Còn {d.choKiemTra} địa điểm chưa được cán bộ kiểm tra. Nên bổ sung số điện thoại, giờ mở cửa từ nguồn chính thức rồi đánh dấu đã kiểm tra.</div>}
    {!!d?.diaDiemChuaGanXa && <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">Còn {d.diaDiemChuaGanXa} địa điểm chưa gắn xã/phường. Mở mục <Link className="font-bold underline" to="/quan-tri/dia-diem">Địa điểm</Link>, bấm Sửa và chọn xã/phường.</div>}
  </>);
}
