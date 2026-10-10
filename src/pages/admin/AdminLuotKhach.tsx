import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, o, nhan, nutChinh } from '../../components/common/KhoiQt';
import { so } from '../../utils/hangSo';
interface Dong { diaDiemId: string; ten: string; thang: string; noiDia: number; quocTe: number; nguoiNhap: string | null }
export default function AdminLuotKhach() {
  const qc = useQueryClient();
  const { data: dd = [] } = useQuery({ queryKey: ['qt-dia-diem'], queryFn: () => adminFetch<{ id: string; ten: string }[]>('/dia-diem') });
  const { data: gan = [] } = useQuery({ queryKey: ['qt-luot-khach'], queryFn: () => adminFetch<Dong[]>('/luot-khach') });
  const [f, setF] = useState({ diaDiemId: '', thang: new Date().toISOString().slice(0, 7), noiDia: '0', quocTe: '0' });
  const [hang, setHang] = useState('');
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-luot-khach'] }); qc.invalidateQueries({ queryKey: ['thong-ke'] }); };
  const luu = useMutation({ mutationFn: () => adminFetch('/luot-khach', { method: 'PUT', body: JSON.stringify({ ...f, diaDiemId: f.diaDiemId || dd[0]?.id }) }),
    onSuccess: () => { toast.success(`Đã lưu số liệu tháng ${f.thang}.`); lamMoi(); }, onError: (e: Error) => toast.error(e.message) });
  const nhapHang = useMutation({
    mutationFn: () => adminFetch<{ ok: number; loi: string[] }>('/luot-khach/hang-loat', { method: 'POST', body: JSON.stringify({ dong: hang.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
      .map((d) => { const [diaDiemId, thang, noiDia, quocTe] = d.split(/[,;\t]/).map((z) => z.trim()); return { diaDiemId, thang, noiDia, quocTe: quocTe || 0 }; }) }) }),
    onSuccess: (r) => { r.loi.length ? toast(`Đã nhập ${r.ok} dòng. ${r.loi.slice(0, 3).join('. ')}`, { duration: 8000 }) : toast.success(`Đã nhập ${r.ok} dòng.`); lamMoi(); },
    onError: (e: Error) => toast.error(e.message) });
  return (<>
    <TieuDeQt tieuDe="Lượt khách" moTa="Nhập theo từng tháng. Nhập lại cùng tháng của cùng địa điểm thì số mới thay số cũ." />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <The>
        <label className={nhan + ' mt-0'}>Địa điểm<select className={o} value={f.diaDiemId || dd[0]?.id || ''} onChange={(e) => setF({ ...f, diaDiemId: e.target.value })}>{dd.map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}</select></label>
        <label className={nhan}>Tháng<input type="month" className={o} value={f.thang} onChange={(e) => setF({ ...f, thang: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={nhan}>Khách trong nước<input type="number" min={0} className={o} value={f.noiDia} onChange={(e) => setF({ ...f, noiDia: e.target.value })} /></label>
          <label className={nhan}>Khách quốc tế<input type="number" min={0} className={o} value={f.quocTe} onChange={(e) => setF({ ...f, quocTe: e.target.value })} /></label></div>
        <button type="button" className={nutChinh + ' mt-4'} disabled={luu.isPending} onClick={() => luu.mutate()}>Lưu số liệu</button>
      </The>
      <The><h2 className="text-[17px] font-bold">Nhập nhiều dòng một lúc</h2>
        <p className="mb-2 text-[13px] text-slate-500">Mỗi dòng: mã địa điểm, tháng, khách trong nước, khách quốc tế. Mã địa điểm xem ở mục Địa điểm.</p>
        <textarea className={o} rows={5} value={hang} onChange={(e) => setHang(e.target.value)} placeholder="van-mieu-tran-bien,2026-08,5200,310" />
        <button type="button" className={nutChinh + ' mt-3'} disabled={nhapHang.isPending || !hang.trim()} onClick={() => nhapHang.mutate()}>Nhập các dòng</button>
      </The>
    </div>
    <The className="mt-4"><h2 className="mb-2 text-[17px] font-bold">Số liệu nhập gần đây</h2>
      <div className="overflow-x-auto"><table className="w-full text-[13.5px]"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"><th className="py-2">Địa điểm</th><th>Tháng</th><th>Trong nước</th><th>Quốc tế</th><th>Người nhập</th></tr></thead>
        <tbody>{gan.map((r, i) => <tr key={i} className="border-b border-slate-100 dark:border-slate-800"><td className="py-2">{r.ten}</td><td>{r.thang}</td><td>{so(r.noiDia)}</td><td>{so(r.quocTe)}</td><td>{r.nguoiNhap}</td></tr>)}
          {!gan.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Chưa có số liệu.</td></tr>}</tbody></table></div>
    </The>
  </>);
}
