/** Danh sách xã/phường dùng cho phụ lục: thêm nhiều một lúc, đổi tên, ẩn khi thôi theo dõi. */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nutChinh, nutVien } from '../../components/common/KhoiQt';
import { useCauHinh, type XaPhuong } from '../../utils/phuLuc';

export default function AdminXaPhuong() {
  const qc = useQueryClient();
  const { data: ch } = useCauHinh();
  const [ds, setDs] = useState('');
  const [sua, setSua] = useState<{ id: number; ten: string } | null>(null);
  const lamMoi = () => ['qt-cau-hinh', 'qt-nop'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const them = useMutation({ mutationFn: () => adminFetch<{ them: number; trung: string[]; loi: string[] }>('/bao-cao/xa-phuong', { method: 'POST', body: JSON.stringify({ danhSach: ds }) }),
    onSuccess: (r) => {
      toast[r.loi.length ? 'error' : 'success'](`Đã thêm ${r.them}.${r.trung.length ? ` Đã có sẵn: ${r.trung.length}.` : ''}${r.loi.length ? ' ' + r.loi.slice(0, 3).join(' ') : ''}`, { duration: 7000 });
      if (!r.loi.length) setDs(''); lamMoi();
    }, onError: (e: Error) => toast.error(e.message) });
  const doi = useMutation({ mutationFn: ({ id, body }: { id: number; body: object }) => adminFetch(`/bao-cao/xa-phuong/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Đã cập nhật.'); setSua(null); lamMoi(); }, onError: (e: Error) => toast.error(e.message) });
  const hang = (x: XaPhuong) => (
    <tr key={x.id} className={`border-b border-slate-100 dark:border-slate-800 ${x.hien ? '' : 'opacity-60'}`}>
      <td className="py-2.5 pr-2">{sua?.id === x.id
        ? <input className={o + ' mt-0'} value={sua.ten} onChange={(e) => setSua({ ...sua, ten: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && doi.mutate({ id: x.id, body: { ten: sua.ten } })} autoFocus />
        : <>{x.ten} {!x.hien && <The_nho mau="xam">Đã ẩn</The_nho>}</>}</td>
      <td className="whitespace-nowrap py-2.5 text-right">{sua?.id === x.id
        ? <><button type="button" className={nutVien} onClick={() => doi.mutate({ id: x.id, body: { ten: sua.ten } })}>Lưu</button> <button type="button" className={nutVien} onClick={() => setSua(null)}>Huỷ</button></>
        : <><button type="button" className={nutVien} onClick={() => setSua({ id: x.id, ten: x.ten })}>Đổi tên</button>{' '}
          <button type="button" className={nutVien} onClick={() => doi.mutate({ id: x.id, body: { hien: !x.hien } })}>{x.hien ? 'Ẩn' : 'Hiện lại'}</button></>}</td>
    </tr>);
  return (<>
    <TieuDeQt tieuDe="Xã/phường" moTa="Đơn vị báo cáo của phụ lục thống kê. Ẩn chứ không xoá: xã/phường đã ẩn không hiện trong bảng theo dõi nữa nhưng số liệu cũ vẫn còn." />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <The><h2 className="text-[17px] font-bold">Thêm xã/phường</h2>
        <p className="text-[13px] text-slate-500">Dán danh sách, mỗi dòng một đơn vị, ghi đủ "Xã", "Phường" hoặc "Đặc khu" ở đầu — chép từ văn bản sắp xếp đơn vị hành chính chính thức. Dòng đã có sẵn tự bỏ qua.</p>
        <textarea className={o} rows={8} value={ds} onChange={(e) => setDs(e.target.value)} placeholder={'Phường Biên Hòa\nPhường Long Khánh\nXã Xuân Lộc'} />
        <button type="button" className={nutChinh + ' mt-3'} disabled={!ds.trim() || them.isPending} onClick={() => them.mutate()}>Thêm vào danh sách</button>
      </The>
      <The><h2 className="mb-2 text-[17px] font-bold">Danh sách ({ch?.xaPhuong.length || 0})</h2>
        <div className="overflow-x-auto"><table className="w-full text-[13.5px]"><tbody>{ch?.xaPhuong.map(hang)}</tbody></table></div></The>
    </div>
  </>);
}
