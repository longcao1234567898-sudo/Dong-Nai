import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nhan, nutChinh, nutVien } from '../../components/common/KhoiQt';
import { LOAI, VUNG } from '../../utils/hangSo';
import { useCauHinh } from '../../utils/phuLuc';
import QuanLyAnh from '../../components/common/QuanLyAnh';
import QuanLyQuanSat from '../../components/common/QuanLyQuanSat';
import type { Loai } from '../../utils/kieu';

interface DD { id: string; ten: string; loai: Loai; moTa: string | null; diaChi: string | null; lat: number; lng: number; sdt: string | null; web: string | null;
  gioMo: string | null; noiBat: boolean; hien: boolean; daKiemTra: boolean; xaPhuongId: number | null; tenEn: string | null; moTaEn: string | null; vung: string | null;
  chiTiet: string | null; chiTietEn: string | null }
const TRONG = { ten: '', tenEn: '', loai: 'thien-nhien' as Loai, moTa: '', moTaEn: '', chiTiet: '', chiTietEn: '', diaChi: '', xaPhuongId: '', vung: '', lat: '', lng: '', sdt: '', web: '', gioMo: '', noiBat: false, hien: true, daKiemTra: false };

export default function AdminDiaDiem() {
  const qc = useQueryClient();
  const { data: ds = [] } = useQuery({ queryKey: ['qt-dia-diem'], queryFn: () => adminFetch<DD[]>('/dia-diem') });
  const { data: ch } = useCauHinh();
  const [f, setF] = useState<typeof TRONG>(TRONG); const [suaId, setSuaId] = useState<string | null>(null); const [loi, setLoi] = useState('');
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-dia-diem'] }); qc.invalidateQueries({ queryKey: ['dia-diem'] }); };
  const luu = useMutation({
    mutationFn: () => adminFetch(suaId ? `/dia-diem/${suaId}` : '/dia-diem', { method: suaId ? 'PUT' : 'POST', body: JSON.stringify({ ...f, lat: Number(String(f.lat).replace(',', '.')), lng: Number(String(f.lng).replace(',', '.')) }) }),
    onSuccess: () => { toast.success(suaId ? 'Đã lưu thay đổi.' : 'Đã thêm địa điểm.'); setF(TRONG); setSuaId(null); setLoi(''); lamMoi(); },
    onError: (e: Error) => setLoi(e.message),
  });
  const anHien = useMutation({ mutationFn: (p: DD) => adminFetch(`/dia-diem/${p.id}/hien`, { method: 'PATCH', body: JSON.stringify({ hien: !p.hien }) }), onSuccess: lamMoi,
    onError: (e: Error) => toast.error(e.message) });
  const sua = (p: DD) => { setSuaId(p.id); setLoi(''); setF({ ...TRONG, ...p, moTa: p.moTa || '', diaChi: p.diaChi || '', sdt: p.sdt || '', web: p.web || '', gioMo: p.gioMo || '', lat: String(p.lat), lng: String(p.lng), xaPhuongId: p.xaPhuongId ? String(p.xaPhuongId) : '', vung: p.vung || '', tenEn: p.tenEn || '', moTaEn: p.moTaEn || '', chiTiet: p.chiTiet || '', chiTietEn: p.chiTietEn || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const dat = (k: keyof typeof TRONG) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  return (<>
    <TieuDeQt tieuDe="Địa điểm" moTa="Thêm, sửa và ẩn các điểm đến hiện cho du khách." />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <The><h2 className="text-[17px] font-bold">{suaId ? 'Sửa địa điểm' : 'Thêm địa điểm'}</h2>
        <p className="text-[13px] text-slate-500">Toạ độ lấy từ Google Maps: nhấn giữ vào vị trí, chép dãy số hiện ra.</p>
        <label className={nhan}>Tên địa điểm<input className={o} value={f.ten} onChange={dat('ten')} maxLength={120} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={nhan}>Loại<select className={o} value={f.loai} onChange={dat('loai')}>{(Object.keys(LOAI) as Loai[]).map((k) => <option key={k} value={k}>{LOAI[k].ten}</option>)}</select></label>
          <label className={nhan}>Giờ mở cửa<input className={o} value={f.gioMo} onChange={dat('gioMo')} placeholder="7:00 – 17:00" /></label></div>
        <label className={nhan}>Giới thiệu<textarea className={o} rows={3} value={f.moTa} onChange={dat('moTa')} maxLength={1500} /></label>
        <label className={nhan}>Bài chi tiết <small className="font-normal text-slate-500">(hiện ở trang riêng của địa điểm)</small>
          <textarea className={o + ' font-mono text-[13px] leading-relaxed'} rows={12} value={f.chiTiet} onChange={dat('chiTiet')} maxLength={20000} /></label>
        <p className="mt-1 text-xs text-slate-500">Dòng bắt đầu bằng <code>## </code> là tiêu đề mục, dòng bắt đầu bằng <code>- </code> là gạch đầu dòng, để một dòng trống giữa hai đoạn. Trong mục <b>Lịch sử hình thành</b>, mỗi dòng ghi <code>- Mốc: nội dung</code> (ví dụ <code>- 1715: Dựng văn miếu…</code>) sẽ hiện thành dòng thời gian.</p>
        <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"><summary className="cursor-pointer text-sm font-semibold">Tiếng Anh cho khách nước ngoài <small className="font-normal text-slate-500">(không bắt buộc — trống thì hiện tiếng Việt)</small></summary>
          <label className={nhan}>Tên tiếng Anh<input className={o} value={f.tenEn} onChange={dat('tenEn')} maxLength={120} /></label>
          <label className={nhan}>Giới thiệu tiếng Anh<textarea className={o} rows={3} value={f.moTaEn} onChange={dat('moTaEn')} maxLength={1500} /></label>
          <label className={nhan}>Bài chi tiết tiếng Anh <small className="font-normal text-slate-500">(mục lịch sử đặt tên <code>## Timeline</code>)</small>
            <textarea className={o + ' font-mono text-[13px] leading-relaxed'} rows={8} value={f.chiTietEn} onChange={dat('chiTietEn')} maxLength={20000} /></label></details>
        <div className="grid grid-cols-2 gap-3">
          <label className={nhan}>Địa chỉ<input className={o} value={f.diaChi} onChange={dat('diaChi')} maxLength={200} /></label>
          <label className={nhan}>Xã/phường<select className={o} value={f.xaPhuongId} onChange={dat('xaPhuongId')}>
            <option value="">— Chưa chọn —</option>{ch?.xaPhuong.filter((x) => x.hien || String(x.id) === f.xaPhuongId).map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}</select></label></div>
        <label className={nhan}>Vùng du lịch <small className="font-normal text-slate-500">(để du khách lọc ở trang chủ)</small><select className={o} value={f.vung} onChange={dat('vung')}>
          <option value="">— Chưa chọn —</option>{Object.entries(VUNG).map(([k, v]) => <option key={k} value={k}>{v.ten}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={nhan}>Vĩ độ<input className={o} inputMode="decimal" value={f.lat} onChange={dat('lat')} /></label>
          <label className={nhan}>Kinh độ<input className={o} inputMode="decimal" value={f.lng} onChange={dat('lng')} /></label>
          <label className={nhan}>Số điện thoại<input className={o} inputMode="tel" value={f.sdt} onChange={dat('sdt')} /></label>
          <label className={nhan}>Trang web<input className={o} type="url" value={f.web} onChange={dat('web')} placeholder="https://" /></label></div>
        {([['noiBat', 'Đưa lên nổi bật'], ['hien', 'Hiện cho du khách xem'], ['daKiemTra', 'Cán bộ đã kiểm tra thông tin']] as const).map(([k, t]) => (
          <label key={k} className="mt-2.5 flex items-center gap-2 text-sm"><input type="checkbox" className="h-[18px] w-[18px] accent-primary-600" checked={f[k]} onChange={dat(k)} />{t}</label>))}
        {suaId ? <><QuanLyAnh diaDiemId={suaId} dangHien={f.hien} tenGoiY={f.ten} /><QuanLyQuanSat diaDiemId={suaId} /></> : <p className="mt-3 text-xs text-slate-500">Lưu địa điểm xong, bấm Sửa để thêm ảnh và điểm quan sát 360°.</p>}
        {loi && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{loi}</div>}
        <div className="mt-4 flex gap-2"><button type="button" className={nutChinh} disabled={luu.isPending} onClick={() => luu.mutate()}>{luu.isPending ? 'Đang lưu…' : 'Lưu địa điểm'}</button>
          {suaId && <button type="button" className={nutVien + ' min-h-[44px] px-4 text-sm'} onClick={() => { setSuaId(null); setF(TRONG); setLoi(''); }}>Huỷ sửa</button>}</div>
      </The>
      <The><h2 className="mb-2 text-[17px] font-bold">Danh sách ({ds.length})</h2>
        <div className="overflow-x-auto"><table className="w-full text-[13.5px]"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"><th className="py-2">Tên</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>{ds.map((p) => <tr key={p.id} className="border-b border-slate-100 align-top dark:border-slate-800">
            <td className="py-2.5 pr-2">{p.ten}<br /><code className="rounded bg-slate-100 px-1.5 text-xs dark:bg-slate-800">{p.id}</code></td>
            <td className="space-x-1 py-2.5">{p.hien ? <The_nho mau="xanh">Đang hiện</The_nho> : <The_nho mau="xam">Đang ẩn</The_nho>}{!p.daKiemTra && <The_nho mau="vang">Chờ kiểm tra</The_nho>}{!p.xaPhuongId && <The_nho mau="vang">Chưa gắn xã</The_nho>}</td>
            <td className="whitespace-nowrap py-2.5 text-right"><button type="button" className={nutVien} onClick={() => sua(p)}>Sửa</button>{' '}
              <button type="button" className={nutVien} onClick={() => anHien.mutate(p)}>{p.hien ? 'Ẩn' : 'Hiện'}</button></td></tr>)}</tbody></table></div>
      </The>
    </div>
  </>);
}
