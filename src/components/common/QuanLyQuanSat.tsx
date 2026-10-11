/**
 * Quản lý điểm quan sát 360° của một địa điểm (trong mục Địa điểm → Sửa).
 *
 * Cán bộ chụp ảnh 360° tại chỗ (máy ảnh 360° như Insta360, Ricoh Theta; hoặc chế
 * độ ảnh toàn cảnh / Photo Sphere của điện thoại), đặt tên vị trí rồi tải lên.
 * Ảnh thu nhỏ ngay trên trình duyệt về ngang 4096px — cỡ lớn nhất nhiều điện thoại
 * hiển thị được. Ảnh tỉ lệ 2:1 tự nhận là 360° trọn vòng; ảnh panorama thường thì
 * cán bộ chọn góc chụp ngang.
 */
import { lazy, Suspense, useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Orbit, Trash2, ArrowUp, ArrowDown, Loader2, Eye, X, Compass, MapPin } from 'lucide-react';
import { adminFetch, adminLayBlob } from '../../services/adminService';
import { nutVien, nutChinh } from './KhoiQt';
import type { KhungXem360Ref } from '../du-lich/KhungXem360';
import { KhungGoogle360 } from '../du-lich/QuanSat360';

const KhungXem360 = lazy(() => import('../du-lich/KhungXem360'));
interface QS { id: number; ten: string; tenEn: string | null; nguon: 'anh' | 'google'; googleUrl: string | null; rong: number | null; cao: number | null; gocNgang: number; huongDau: number; kichThuoc: number }
const TOI_DA = 10, CANH_NGANG = 4096;
const GOC = [[360, '360° trọn vòng'], [270, '270°'], [180, '180° (nửa vòng)'], [120, '120°'], [90, '90°']] as const;

async function thuNho360(tep: Blob) {
  const bm = await createImageBitmap(tep, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const tl = Math.min(1, CANH_NGANG / bm.width);
  const c = document.createElement('canvas'); c.width = Math.round(bm.width * tl); c.height = Math.round(bm.height * tl);
  c.getContext('2d')!.drawImage(bm, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Không xử lý được ảnh này.');
  return { blob, rong: c.width, cao: c.height };
}

function XemTruoc({ q, onDong, onLuuHuong }: { q: QS; onDong: () => void; onLuuHuong: (h: number) => void }) {
  const [src, setSrc] = useState('');
  const ref = useRef<KhungXem360Ref>(null);
  const google = q.nguon === 'google';
  useEffect(() => {
    let url = ''; let huy = false;
    if (!google) adminLayBlob(`/quan-sat/${q.id}/anh`).then((b) => { if (!huy) { url = URL.createObjectURL(b); setSrc(url); } }).catch((e: Error) => toast.error(e.message));
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onDong(); window.addEventListener('keydown', k);
    return () => { huy = true; if (url) URL.revokeObjectURL(url); window.removeEventListener('keydown', k); };
  }, [q.id, onDong, google]);
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Xem trước: ${q.ten}`}>
      <div className="w-full max-w-5xl rounded-2xl bg-white p-4 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-2"><b>Xem trước: {q.ten}</b>
          <button type="button" className={nutVien} onClick={onDong} aria-label="Đóng"><X className="h-4 w-4" /></button></div>
        {google && q.googleUrl ? <KhungGoogle360 url={q.googleUrl} nhan={q.ten} className="aspect-[16/9]" />
          : src ? <Suspense fallback={<div className="aspect-[16/9] rounded-[20px] bg-slate-800" />}>
          <KhungXem360 ref={ref} src={src} gocNgang={q.gocNgang} huongDau={q.huongDau} rong={q.rong} cao={q.cao} className="aspect-[16/9]" />
        </Suspense> : <div className="grid aspect-[16/9] place-items-center rounded-[20px] bg-slate-800"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}
        {google ? <p className="mt-3 text-xs text-slate-500">Ảnh 360° của Google Maps mở theo hướng đã chọn khi lấy mã nhúng. Muốn đổi hướng mở đầu: xoay ảnh trên Google Maps tới hướng muốn, lấy lại mã nhúng, xoá điểm này rồi thêm lại.</p>
        : <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={nutChinh} onClick={() => { const h = ref.current?.huongDangNhin(); if (h !== null && h !== undefined) onLuuHuong(h); }}>
            <Compass className="h-4 w-4" />Lấy hướng đang nhìn làm hướng mở đầu</button>
          <span className="text-xs text-slate-500">Xoay tới cảnh đẹp nhất (ví dụ mặt hồ, cổng chùa) rồi bấm — du khách mở ra sẽ nhìn đúng hướng đó.</span>
        </div>}
      </div>
    </div>);
}

export default function QuanLyQuanSat({ diaDiemId }: { diaDiemId: string }) {
  const qc = useQueryClient();
  const chonTep = useRef<HTMLInputElement>(null);
  const [ten, setTen] = useState('');
  const [gocMoi, setGocMoi] = useState(180);
  const [dang, setDang] = useState(false);
  const [xem, setXem] = useState<QS | null>(null);
  const [tenG, setTenG] = useState(''); const [maG, setMaG] = useState('');
  const { data: ds = [] } = useQuery({ queryKey: ['qt-quan-sat', diaDiemId], queryFn: () => adminFetch<QS[]>(`/dia-diem/${encodeURIComponent(diaDiemId)}/quan-sat`) });
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-quan-sat', diaDiemId] }); qc.invalidateQueries({ queryKey: ['dia-diem'] }); };
  const doi = useMutation({ mutationFn: ({ id, body }: { id: number; body: object }) => adminFetch(`/quan-sat/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: lamMoi,
    onError: (e: Error) => toast.error(e.message) });
  const xoa = useMutation({ mutationFn: (id: number) => adminFetch(`/quan-sat/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('Đã xoá điểm quan sát.'); lamMoi(); } });

  const taiLen = async (f: File | undefined) => {
    if (!f) return;
    if (!ten.trim()) { toast.error('Đặt tên vị trí trước, ví dụ "Đỉnh núi" hay "Cổng chính".'); if (chonTep.current) chonTep.current.value = ''; return; }
    setDang(true);
    try {
      const x = await thuNho360(f);
      /* Tỉ lệ gần 2:1 là ảnh 360° trọn vòng; còn lại dùng góc cán bộ chọn. */
      const goc = Math.abs(x.rong / x.cao - 2) < 0.06 ? 360 : gocMoi;
      await adminFetch(`/dia-diem/${encodeURIComponent(diaDiemId)}/quan-sat?${new URLSearchParams({ ten: ten.trim(), rong: String(x.rong), cao: String(x.cao), gocNgang: String(goc) })}`,
        { method: 'POST', body: x.blob, headers: { 'Content-Type': 'image/jpeg' } });
      toast.success(goc === 360 ? 'Đã thêm điểm quan sát 360°.' : `Đã thêm điểm quan sát (ảnh ${goc}°).`);
      setTen(''); lamMoi();
    } catch (e) { toast.error((e as Error).message); }
    setDang(false);
    if (chonTep.current) chonTep.current.value = '';
  };
  const themGoogle = useMutation({
    mutationFn: () => adminFetch(`/dia-diem/${encodeURIComponent(diaDiemId)}/quan-sat-google`, { method: 'POST', body: JSON.stringify({ ten: tenG.trim(), ma: maG }) }),
    onSuccess: () => { toast.success('Đã thêm điểm quan sát từ Google Maps.'); setTenG(''); setMaG(''); lamMoi(); },
    onError: (e: Error) => toast.error(e.message) });
  const doiCho = (i: number, j: number) => { doi.mutate({ id: ds[i].id, body: { thuTu: j + 1 } }); doi.mutate({ id: ds[j].id, body: { thuTu: i + 1 } }); };
  const o = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <b className="flex items-center gap-1.5 text-sm"><Orbit className="h-4 w-4" />Điểm quan sát 360° ({ds.length}/{TOI_DA})</b>
      <p className="mt-1 text-xs text-slate-500">Hai cách: lấy ảnh 360° có sẵn trên Google Maps (mục bên dưới), hoặc tự chụp ảnh 360° tại một vị trí của địa điểm (máy ảnh 360°, hoặc chế độ toàn cảnh / Photo Sphere của điện thoại). Du khách đứng "tại chỗ" đó, kéo để nhìn xung quanh. Ảnh tỉ lệ 2:1 tự nhận là 360° trọn vòng.</p>
      {ds.length < TOI_DA && <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input className={o} value={ten} onChange={(e) => setTen(e.target.value)} maxLength={120} placeholder="Tên vị trí, ví dụ: Đỉnh núi, Cổng chính, Bến thuyền" />
        <select className={o} value={gocMoi} onChange={(e) => setGocMoi(Number(e.target.value))} title="Chỉ dùng khi ảnh không phải tỉ lệ 2:1" aria-label="Góc chụp ngang (ảnh panorama thường)">
          {GOC.map(([g, nhan]) => <option key={g} value={g}>Ảnh thường: {nhan}</option>)}</select>
        <button type="button" className={nutVien + ' gap-1.5'} disabled={dang} onClick={() => chonTep.current?.click()}>
          {dang ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Orbit className="h-3.5 w-3.5" />}{dang ? 'Đang tải lên…' : 'Chọn ảnh 360°'}</button>
        <input ref={chonTep} type="file" accept="image/*" hidden onChange={(e) => taiLen(e.target.files?.[0])} />
      </div>}
      {ds.length < TOI_DA && <details className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
        <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold"><MapPin className="h-4 w-4" />Lấy ảnh 360° từ Google Maps (Street View, ảnh 360° người dùng đăng)</summary>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-slate-600 dark:text-slate-300">
          <li>Mở Google Maps trên máy tính, tìm địa điểm. Kéo hình người vàng vào chỗ có đường xanh (Street View), hoặc bấm vào một ảnh 360° trong mục Ảnh của địa điểm.</li>
          <li>Xoay tới hướng muốn du khách nhìn đầu tiên.</li>
          <li>Bấm ⋮ hoặc Chia sẻ → <b>Chia sẻ hoặc nhúng hình ảnh</b> → thẻ <b>Nhúng bản đồ</b> → <b>Sao chép HTML</b>, dán vào ô dưới.</li>
          <li>Chỗ nào Google Maps không có ảnh 360° thì bỏ qua — trang không hiện mục 360° cho điểm đó.</li>
        </ol>
        <input className={o + ' mt-2'} value={tenG} onChange={(e) => setTenG(e.target.value)} maxLength={120} placeholder="Tên vị trí, ví dụ: Cổng chính, Bờ hồ" />
        <textarea className={o + ' mt-2 font-mono text-xs'} rows={3} value={maG} onChange={(e) => setMaG(e.target.value)} placeholder={'<iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>'} />
        <button type="button" className={nutVien + ' mt-2 gap-1.5'} disabled={themGoogle.isPending || !tenG.trim() || !maG.trim()} onClick={() => themGoogle.mutate()}>
          {themGoogle.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}Thêm từ Google Maps</button>
      </details>}
      {ds.length > 0 && <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">{ds.map((q, i) => (
        <li key={q.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
          <input className={o + ' max-w-[16rem] flex-1'} defaultValue={q.ten} aria-label="Tên vị trí"
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== q.ten) doi.mutate({ id: q.id, body: { ten: v } }); }} />
          <input className={o + ' max-w-[12rem]'} defaultValue={q.tenEn || ''} placeholder="Tên tiếng Anh" aria-label="Tên tiếng Anh"
            onBlur={(e) => { if (e.target.value.trim() !== (q.tenEn || '')) doi.mutate({ id: q.id, body: { tenEn: e.target.value.trim() } }); }} />
          <span className="text-xs text-slate-500">{q.nguon === 'google' ? 'Google Maps' : `${q.gocNgang}°, ${q.rong}×${q.cao}, ${Math.round(q.kichThuoc / 1024)} KB`}</span>
          <div className="ml-auto flex gap-1">
            <button type="button" className={nutVien + ' gap-1'} onClick={() => setXem(q)}><Eye className="h-3 w-3" />{q.nguon === 'google' ? 'Xem' : 'Xem, đặt hướng'}</button>
            <button type="button" className={nutVien} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label="Lên trên"><ArrowUp className="h-3 w-3" /></button>
            <button type="button" className={nutVien} disabled={i === ds.length - 1} onClick={() => doiCho(i, i + 1)} aria-label="Xuống dưới"><ArrowDown className="h-3 w-3" /></button>
            <button type="button" className={nutVien} onClick={() => window.confirm(`Xoá điểm quan sát "${q.ten}"?`) && xoa.mutate(q.id)} aria-label="Xoá"><Trash2 className="h-3 w-3" /></button>
          </div>
        </li>))}</ul>}
      {xem && <XemTruoc q={xem} onDong={() => setXem(null)} onLuuHuong={(h) => { doi.mutate({ id: xem.id, body: { huongDau: h } }); toast.success(`Đã lưu hướng mở đầu (${h}°).`); setXem(null); }} />}
    </div>);
}
