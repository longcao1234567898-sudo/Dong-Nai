/** Tin tức, cảnh báo, sự kiện, số điện thoại cần biết — hiện ở trang người dân. */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nhan, nutChinh, nutVien } from '../../components/common/KhoiQt';
import { ngayVn } from '../../utils/phuLuc';

interface Tin { id: number; loai: string; tieuDe: string; tieuDeEn: string | null; noiDung: string | null; noiDungEn: string | null;
  tuNgay: string | null; denNgay: string | null; diaDiemId: string | null; hien: boolean; thuTu: number }
const LOAI: Record<string, [string, string]> = {
  'canh-bao': ['Cảnh báo', 'Hiện thành dải màu vàng trên đầu trang chủ — dùng cho biển động, mưa lũ, sạt lở, đóng cửa tạm thời…'],
  'su-kien': ['Sự kiện', 'Lễ hội, hội chợ, giải đấu. Hiện cả khi chưa tới ngày bắt đầu.'],
  'thong-bao': ['Thông báo', 'Tin thường: giờ mở cửa mới, thay đổi giá vé…'],
  'lien-he': ['Số điện thoại', 'Hiện ở ô "Số điện thoại cần biết". Ghi số vào ô Nội dung.'],
};
const TRONG = { loai: 'thong-bao', tieuDe: '', tieuDeEn: '', noiDung: '', noiDungEn: '', tuNgay: '', denNgay: '', diaDiemId: '', hien: true, thuTu: 0 };

export default function AdminTinTuc() {
  const qc = useQueryClient();
  const { data: ds = [] } = useQuery({ queryKey: ['qt-tin-tuc'], queryFn: () => adminFetch<Tin[]>('/tin-tuc') });
  const { data: dd = [] } = useQuery({ queryKey: ['qt-dia-diem'], queryFn: () => adminFetch<{ id: string; ten: string }[]>('/dia-diem') });
  const [f, setF] = useState(TRONG); const [suaId, setSuaId] = useState<number | null>(null); const [loi, setLoi] = useState('');
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-tin-tuc'] }); qc.invalidateQueries({ queryKey: ['tin-tuc'] }); };
  const luu = useMutation({ mutationFn: () => adminFetch(suaId ? `/tin-tuc/${suaId}` : '/tin-tuc', { method: suaId ? 'PUT' : 'POST', body: JSON.stringify(f) }),
    onSuccess: () => { toast.success('Đã lưu.'); setF(TRONG); setSuaId(null); setLoi(''); lamMoi(); }, onError: (e: Error) => setLoi(e.message) });
  const xoa = useMutation({ mutationFn: (id: number) => adminFetch(`/tin-tuc/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('Đã xoá.'); lamMoi(); } });
  const dat = (k: keyof typeof TRONG) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });
  const homNay = new Date().toISOString().slice(0, 10);
  return (<>
    <TieuDeQt tieuDe="Tin tức, cảnh báo" moTa="Hết ngày kết thúc thì tin tự thôi hiện, không cần vào xoá." />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <The><h2 className="text-[17px] font-bold">{suaId ? 'Sửa tin' : 'Đăng tin'}</h2>
        <label className={nhan}>Loại<select className={o} value={f.loai} onChange={dat('loai')}>{Object.entries(LOAI).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}</select></label>
        <p className="mt-1 text-xs text-slate-500">{LOAI[f.loai][1]}</p>
        <label className={nhan}>Tiêu đề<input className={o} value={f.tieuDe} maxLength={200} onChange={dat('tieuDe')} /></label>
        <label className={nhan}>Tiêu đề tiếng Anh <small className="font-normal text-slate-500">(không bắt buộc)</small><input className={o} value={f.tieuDeEn} maxLength={200} onChange={dat('tieuDeEn')} /></label>
        <label className={nhan}>Nội dung{f.loai === 'lien-he' && ' (số điện thoại)'}<textarea className={o} rows={f.loai === 'lien-he' ? 1 : 4} maxLength={3000} value={f.noiDung} onChange={dat('noiDung')} /></label>
        {f.loai !== 'lien-he' && <label className={nhan}>Nội dung tiếng Anh<textarea className={o} rows={3} maxLength={3000} value={f.noiDungEn} onChange={dat('noiDungEn')} /></label>}
        <div className="grid gap-x-3 sm:grid-cols-2">
          <label className={nhan}>Từ ngày<input type="date" className={o} value={f.tuNgay} onChange={dat('tuNgay')} /></label>
          <label className={nhan}>Đến ngày (hết hạn thì tự ẩn)<input type="date" className={o} value={f.denNgay} onChange={dat('denNgay')} /></label>
        </div>
        <label className={nhan}>Gắn với địa điểm<select className={o} value={f.diaDiemId} onChange={dat('diaDiemId')}><option value="">—</option>{dd.map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}</select></label>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-[18px] w-[18px] accent-primary-600" checked={f.hien} onChange={dat('hien')} />Hiện cho người dân</label>
        {loi && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{loi}</div>}
        <div className="mt-4 flex gap-2"><button type="button" className={nutChinh} disabled={luu.isPending} onClick={() => luu.mutate()}>Lưu</button>
          {suaId && <button type="button" className={nutVien + ' min-h-[44px] px-4 text-sm'} onClick={() => { setSuaId(null); setF(TRONG); setLoi(''); }}>Huỷ sửa</button>}</div>
      </The>
      <The><h2 className="mb-2 text-[17px] font-bold">Đã đăng ({ds.length})</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">{ds.map((x) => { const hetHan = !!x.denNgay && x.denNgay < homNay; return (
          <li key={x.id} className={`flex flex-wrap items-start justify-between gap-2 py-3 ${!x.hien || hetHan ? 'opacity-60' : ''}`}>
            <div className="min-w-0"><The_nho mau={x.loai === 'canh-bao' ? 'vang' : 'xanh'}>{LOAI[x.loai]?.[0]}</The_nho> <b>{x.tieuDe}</b>{x.loai === 'lien-he' && <span className="ml-1 font-bold text-primary-700">{x.noiDung}</span>}
              <p className="text-xs text-slate-500">{x.tuNgay && `Từ ${ngayVn(x.tuNgay)} `}{x.denNgay && `đến ${ngayVn(x.denNgay)}`}{hetHan && ' · đã hết hạn'}{!x.hien && ' · đang ẩn'}</p></div>
            <div className="whitespace-nowrap"><button type="button" className={nutVien} onClick={() => { setSuaId(x.id); setLoi(''); setF({ loai: x.loai, tieuDe: x.tieuDe, tieuDeEn: x.tieuDeEn || '', noiDung: x.noiDung || '',
              noiDungEn: x.noiDungEn || '', tuNgay: x.tuNgay || '', denNgay: x.denNgay || '', diaDiemId: x.diaDiemId || '', hien: x.hien, thuTu: x.thuTu }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Sửa</button>{' '}
              <button type="button" className={nutVien} onClick={() => window.confirm('Xoá tin này?') && xoa.mutate(x.id)}>Xoá</button></div>
          </li>); })}</ul></The>
    </div>
  </>);
}
