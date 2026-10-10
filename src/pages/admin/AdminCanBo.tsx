import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminFetch } from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { TieuDeQt, The, The_nho, nutVien } from '../../components/common/KhoiQt';
interface CB { id: number; hoTen: string; username: string; vaiTro: string; hoatDong: boolean; soLanSai: number; tamKhoaDen: string | null; dangNhapCuoi: string | null }
export default function AdminCanBo() {
  const qc = useQueryClient(); const { staff } = useAdminAuth();
  const { data: ds = [] } = useQuery({ queryKey: ['qt-can-bo'], queryFn: () => adminFetch<CB[]>('/can-bo') });
  const doi = useMutation({ mutationFn: ({ id, body }: { id: number; body: object }) => adminFetch(`/can-bo/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qt-can-bo'] }); toast.success('Đã cập nhật tài khoản.'); }, onError: (e: Error) => toast.error(e.message) });
  return (<>
    <TieuDeQt tieuDe="Tài khoản cán bộ" moTa="Mọi tài khoản cùng một quyền, làm được tất cả. Khoá tài khoản là có hiệu lực ngay, không chờ phiên hết hạn. Tạo tài khoản mới bằng lệnh trên máy chủ — xem README." />
    <The><div className="overflow-x-auto"><table className="w-full text-[13.5px]"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"><th className="py-2">Cán bộ</th><th>Đăng nhập gần nhất</th><th></th></tr></thead>
      <tbody>{ds.map((c) => { const tamKhoa = c.tamKhoaDen && new Date(c.tamKhoaDen) > new Date(); return (
        <tr key={c.id} className="border-b border-slate-100 align-top dark:border-slate-800">
          <td className="space-x-1 py-2.5">{c.hoTen}<br /><code className="rounded bg-slate-100 px-1.5 text-xs dark:bg-slate-800">{c.username}</code>
            {!c.hoatDong && <The_nho mau="vang">Đã khoá</The_nho>}{tamKhoa && <The_nho mau="vang">Tạm khoá do nhập sai</The_nho>}{c.soLanSai > 0 && <The_nho mau="xam">Sai {c.soLanSai} lần</The_nho>}</td>
          <td>{c.dangNhapCuoi ? new Date(c.dangNhapCuoi).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</td>
          <td className="whitespace-nowrap text-right">{c.id === staff?.id ? <small className="text-slate-400">Tài khoản của bạn</small> : <>
            <button type="button" className={nutVien} onClick={() => doi.mutate({ id: c.id, body: { hoatDong: !c.hoatDong } })}>{c.hoatDong ? 'Khoá' : 'Mở khoá'}</button>{' '}
            {(c.soLanSai > 0 || tamKhoa) && <button type="button" className={nutVien} onClick={() => doi.mutate({ id: c.id, body: { goTamKhoa: true } })}>Gỡ tạm khoá</button>}</>}</td></tr>); })}</tbody></table></div></The>
  </>);
}
