/** Lộ trình gợi ý cho người dân: thêm, sửa, sắp xếp điểm theo ngày, ẩn/hiện. */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nhan, nutChinh, nutVien } from '../../components/common/KhoiQt';

interface Diem { id: string; ngay: number; ghiChu: string | null }
interface LT { id: number; ten: string; tenEn: string | null; thoiGian: string | null; moTa: string | null; moTaEn: string | null; hien: boolean; thuTu: number; diem: Diem[] }
const TRONG = { ten: '', tenEn: '', thoiGian: '', moTa: '', moTaEn: '', hien: true, thuTu: 0, diem: [] as Diem[] };

export default function AdminLoTrinh() {
  const qc = useQueryClient();
  const { data: ds = [] } = useQuery({ queryKey: ['qt-lo-trinh'], queryFn: () => adminFetch<LT[]>('/lo-trinh') });
  const { data: dd = [] } = useQuery({ queryKey: ['qt-dia-diem'], queryFn: () => adminFetch<{ id: string; ten: string }[]>('/dia-diem') });
  const [f, setF] = useState<typeof TRONG>(TRONG); const [suaId, setSuaId] = useState<number | null>(null); const [loi, setLoi] = useState('');
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-lo-trinh'] }); qc.invalidateQueries({ queryKey: ['lo-trinh'] }); };
  const luu = useMutation({ mutationFn: () => adminFetch(suaId ? `/lo-trinh/${suaId}` : '/lo-trinh', { method: suaId ? 'PUT' : 'POST', body: JSON.stringify(f) }),
    onSuccess: () => { toast.success('Đã lưu lộ trình.'); setF(TRONG); setSuaId(null); setLoi(''); lamMoi(); }, onError: (e: Error) => setLoi(e.message) });
  const xoa = useMutation({ mutationFn: (id: number) => adminFetch(`/lo-trinh/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('Đã xoá.'); lamMoi(); } });
  const ten = (id: string) => dd.find((d) => d.id === id)?.ten || id;
  const doiDiem = (i: number, gt: Partial<Diem>) => setF({ ...f, diem: f.diem.map((d, j) => (j === i ? { ...d, ...gt } : d)) });
  const doiCho = (i: number, j: number) => { const m = [...f.diem]; [m[i], m[j]] = [m[j], m[i]]; setF({ ...f, diem: m }); };
  const dat = (k: keyof typeof TRONG) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });
  return (<>
    <TieuDeQt tieuDe="Lộ trình" moTa="Lộ trình gợi ý hiện ở trang chủ và trang Lộ trình của người dân. Người dân còn tự tạo được lộ trình riêng." />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <The><h2 className="text-[17px] font-bold">{suaId ? 'Sửa lộ trình' : 'Thêm lộ trình'}</h2>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <label className={nhan}>Tên lộ trình<input className={o} value={f.ten} maxLength={120} onChange={dat('ten')} /></label>
          <label className={nhan}>Tên tiếng Anh <small className="font-normal text-slate-500">(không bắt buộc)</small><input className={o} value={f.tenEn} maxLength={120} onChange={dat('tenEn')} /></label>
          <label className={nhan}>Thời gian<input className={o} value={f.thoiGian} maxLength={40} placeholder="2 ngày 1 đêm" onChange={dat('thoiGian')} /></label>
          <label className={nhan}>Thứ tự hiện<input className={o} type="number" value={f.thuTu} onChange={dat('thuTu')} /></label>
        </div>
        <label className={nhan}>Mô tả<textarea className={o} rows={2} maxLength={600} value={f.moTa} onChange={dat('moTa')} /></label>
        <label className={nhan}>Mô tả tiếng Anh<textarea className={o} rows={2} maxLength={600} value={f.moTaEn} onChange={dat('moTaEn')} /></label>
        <p className={nhan}>Các điểm, theo thứ tự đi ({f.diem.length})</p>
        <ol className="mt-1 space-y-1.5">{f.diem.map((d, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-700">
            <b className="w-5 text-center">{i + 1}</b><span className="min-w-[140px] flex-1">{ten(d.id)}</span>
            <label className="flex items-center gap-1 text-xs">Ngày<input type="number" min={1} max={30} className="w-14 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900" value={d.ngay} onChange={(e) => doiDiem(i, { ngay: Number(e.target.value) || 1 })} /></label>
            <button type="button" className={nutVien} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label="Lên"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" className={nutVien} disabled={i === f.diem.length - 1} onClick={() => doiCho(i, i + 1)} aria-label="Xuống"><ArrowDown className="h-3.5 w-3.5" /></button>
            <button type="button" className={nutVien} onClick={() => setF({ ...f, diem: f.diem.filter((_, j) => j !== i) })} aria-label="Bỏ"><X className="h-3.5 w-3.5" /></button>
          </li>))}</ol>
        <select className={o} value="" onChange={(e) => e.target.value && setF({ ...f, diem: [...f.diem, { id: e.target.value, ngay: f.diem[f.diem.length - 1]?.ngay || 1, ghiChu: null }] })}>
          <option value="">+ Thêm điểm…</option>{dd.filter((x) => !f.diem.some((d) => d.id === x.id)).map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}</select>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-[18px] w-[18px] accent-primary-600" checked={f.hien} onChange={dat('hien')} />Hiện cho người dân</label>
        {loi && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{loi}</div>}
        <div className="mt-4 flex gap-2"><button type="button" className={nutChinh} disabled={luu.isPending} onClick={() => luu.mutate()}>Lưu lộ trình</button>
          {suaId && <button type="button" className={nutVien + ' min-h-[44px] px-4 text-sm'} onClick={() => { setSuaId(null); setF(TRONG); setLoi(''); }}>Huỷ sửa</button>}</div>
      </The>
      <The><h2 className="mb-2 text-[17px] font-bold">Danh sách ({ds.length})</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">{ds.map((l) => (
          <li key={l.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
            <div className="min-w-0"><b>{l.ten}</b> {!l.hien && <The_nho mau="xam">Đang ẩn</The_nho>}{l.thoiGian && <small className="ml-1 text-slate-500">· {l.thoiGian}</small>}
              <p className="text-xs text-slate-500">{l.diem.map((d) => ten(d.id)).join(' → ')}</p></div>
            <div className="whitespace-nowrap"><button type="button" className={nutVien} onClick={() => { setSuaId(l.id); setLoi(''); setF({ ten: l.ten, tenEn: l.tenEn || '', thoiGian: l.thoiGian || '', moTa: l.moTa || '', moTaEn: l.moTaEn || '', hien: l.hien, thuTu: l.thuTu, diem: l.diem }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Sửa</button>{' '}
              <button type="button" className={nutVien} onClick={() => window.confirm(`Xoá lộ trình "${l.ten}"? Muốn tạm cất thì bỏ dấu "Hiện cho người dân" thay vì xoá.`) && xoa.mutate(l.id)}>Xoá</button></div>
          </li>))}</ul></The>
    </div>
  </>);
}
