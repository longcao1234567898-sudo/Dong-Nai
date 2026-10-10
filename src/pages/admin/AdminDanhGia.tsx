import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, The_nho, nutVien } from '../../components/common/KhoiQt';
import { saoChu } from '../../utils/hangSo';
interface DG { id: number; diaDiem: string; sao: number; nhanXet: string | null; ten: string | null; biAn: boolean; luc: string }
export default function AdminDanhGia() {
  const qc = useQueryClient();
  const { data: ds = [] } = useQuery({ queryKey: ['qt-danh-gia'], queryFn: () => adminFetch<DG[]>('/danh-gia') });
  const doi = useMutation({ mutationFn: (x: DG) => adminFetch(`/danh-gia/${x.id}/an`, { method: 'PATCH', body: JSON.stringify({ an: !x.biAn }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qt-danh-gia'] }); qc.invalidateQueries({ queryKey: ['dia-diem'] }); toast.success('Đã cập nhật.'); },
    onError: (e: Error) => toast.error(e.message) });
  return (<>
    <TieuDeQt tieuDe="Đánh giá" moTa="Ẩn những đánh giá xúc phạm, quảng cáo hoặc không liên quan. Ẩn chứ không xoá, để còn đối chiếu nếu có khiếu nại." />
    <The><div className="overflow-x-auto"><table className="w-full text-[13.5px]"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"><th className="py-2">Địa điểm</th><th>Sao</th><th>Nhận xét</th><th>Ngày</th><th></th></tr></thead>
      <tbody>{ds.map((x) => <tr key={x.id} className={`border-b border-slate-100 align-top dark:border-slate-800 ${x.biAn ? 'opacity-55' : ''}`}>
        <td className="py-2.5 pr-2">{x.diaDiem}</td><td className="whitespace-nowrap font-bold text-amber-600">{saoChu(x.sao)}</td>
        <td className="pr-2">{x.nhanXet}{x.ten && <small className="block text-slate-400">— {x.ten}</small>}</td>
        <td className="whitespace-nowrap">{new Date(x.luc).toLocaleDateString('vi-VN')}</td>
        <td className="whitespace-nowrap text-right">{x.biAn && <The_nho mau="xam">Đang ẩn</The_nho>} <button type="button" className={nutVien} onClick={() => doi.mutate(x)}>{x.biAn ? 'Hiện lại' : 'Ẩn'}</button></td></tr>)}
        {!ds.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Chưa có đánh giá.</td></tr>}</tbody></table></div></The>
  </>);
}
