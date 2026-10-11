/**
 * Quản lý ảnh một địa điểm. Ảnh được THU NHỎ NGAY TRÊN TRÌNH DUYỆT (cạnh dài
 * tối đa 1600px, JPEG) trước khi gửi: ảnh điện thoại 5–10 MB còn khoảng
 * 300 KB, tải lên nhanh trên mạng 4G, không làm phình cơ sở dữ liệu.
 */
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Trash2, ArrowLeft, ArrowRight, Loader2, Search, X } from 'lucide-react';
import { adminFetch } from '../../services/adminService';
import { anhUrl } from '../../services/api';
import { nutVien } from './KhoiQt';

interface Anh { id: number; rong: number | null; cao: number | null; chuThich: string | null; kichThuoc: number }
const CANH_DAI = 1600;

async function thuNho(tep: Blob): Promise<{ blob: Blob; rong: number; cao: number }> {
  /* imageOrientation: xoay đúng chiều ảnh chụp dọc từ điện thoại (thông tin EXIF). */
  const bm = await createImageBitmap(tep, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const tl = Math.min(1, CANH_DAI / Math.max(bm.width, bm.height));
  const rong = Math.round(bm.width * tl), cao = Math.round(bm.height * tl);
  const c = document.createElement('canvas'); c.width = rong; c.height = cao;
  c.getContext('2d')!.drawImage(bm, 0, 0, rong, cao);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.82));
  if (!blob) throw new Error('Không xử lý được ảnh này.');
  return { blob, rong, cao };
}

/* ------------------------------------------------------------------
   TÌM ẢNH TRÊN WIKIMEDIA COMMONS — chạy ngay trên trình duyệt cán bộ.
   Chỉ hiện ảnh CC0 hoặc phạm vi công cộng: loại không bắt buộc ghi tác
   giả, vì trang người dân không hiện dòng tác giả. Cán bộ xem tận mắt
   rồi mới chọn — đúng địa điểm, đủ đẹp mới dùng.
   ------------------------------------------------------------------ */
interface UngVien { ten: string; nho: string; lon: string; rong: number; cao: number; giayPhep: string; trang: string }
const GIAY_PHEP_DUOC = /^(cc0|public domain|pd\b|pd-|cc-zero|no restrictions)/i;
async function timCommons(q: string): Promise<UngVien[]> {
  const ts = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `${q} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '40', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600' });
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${ts}`);
  if (!r.ok) throw new Error('Không kết nối được Wikimedia Commons.');
  const kq = await r.json();
  return Object.values((kq.query?.pages || {}) as Record<string, { title: string; imageinfo?: { thumburl: string; width: number; height: number; mime: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }>)
    .map((t) => { const ii = t.imageinfo?.[0]; if (!ii) return null;
      const gp = String(ii.extmetadata?.LicenseShortName?.value || '').replace(/<[^>]+>/g, '');
      return { ten: t.title, lon: ii.thumburl, nho: ii.thumburl.replace(/\/1600px-/, '/400px-'), rong: ii.width, cao: ii.height, giayPhep: gp, trang: ii.descriptionurl, mime: ii.mime }; })
    .filter((a): a is UngVien & { mime: string } => !!a && a.mime === 'image/jpeg' && Math.max(a.rong, a.cao) >= 1000 && GIAY_PHEP_DUOC.test(a.giayPhep));
}

function TimAnh({ tenGoiY, onDung, onDong }: { tenGoiY: string; onDung: (a: UngVien) => Promise<void>; onDong: () => void }) {
  const [q, setQ] = useState(tenGoiY);
  const [dangDung, setDangDung] = useState('');
  const tim = useMutation({ mutationFn: () => timCommons(q.trim()), onError: (e: Error) => toast.error(e.message) });
  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className="flex items-center justify-between gap-2"><b className="text-sm">Tìm ảnh trên Wikimedia Commons</b>
        <button type="button" className={nutVien} onClick={onDong} aria-label="Đóng"><X className="h-3.5 w-3.5" /></button></div>
      <p className="mt-1 text-xs text-slate-500">Chỉ hiện ảnh CC0 hoặc phạm vi công cộng (dùng tự do, không phải ghi tác giả). Xem kỹ đúng địa điểm rồi mới bấm Dùng ảnh này.</p>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) tim.mutate(); }}>
        <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên địa điểm, có thể thêm tiếng Anh" />
        <button type="submit" className={nutVien + ' gap-1.5 px-3'} disabled={tim.isPending}>{tim.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}Tìm</button>
      </form>
      {tim.data && !tim.data.length && <p className="mt-2 text-sm text-slate-500">Không có ảnh CC0 hoặc phạm vi công cộng cho từ khoá này. Thử tên không dấu, tên tiếng Anh, hoặc tên ngắn hơn.</p>}
      {!!tim.data?.length && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{tim.data.map((a) => (
        <figure key={a.ten} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <a href={a.trang} target="_blank" rel="noopener noreferrer"><img src={a.nho} alt={a.ten} loading="lazy" className="aspect-[4/3] w-full object-cover" /></a>
          <figcaption className="space-y-1 p-1.5 text-[11px] text-slate-500"><span className="block truncate" title={a.ten}>{a.ten.replace(/^File:/, '')}</span>
            <span className="block">{a.rong}×{a.cao}, {a.giayPhep}</span>
            <button type="button" className={nutVien + ' w-full justify-center'} disabled={!!dangDung}
              onClick={async () => { setDangDung(a.ten); try { await onDung(a); } finally { setDangDung(''); } }}>
              {dangDung === a.ten ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Dùng ảnh này'}</button></figcaption></figure>))}</div>}
    </div>);
}

export default function QuanLyAnh({ diaDiemId, dangHien, tenGoiY = '' }: { diaDiemId: string; dangHien: boolean; tenGoiY?: string }) {
  const [moTim, setMoTim] = useState(false);
  const qc = useQueryClient();
  const chonTep = useRef<HTMLInputElement>(null);
  const [dangTai, setDangTai] = useState(0);
  const { data: ds = [] } = useQuery({ queryKey: ['qt-anh', diaDiemId], queryFn: () => adminFetch<Anh[]>(`/dia-diem/${encodeURIComponent(diaDiemId)}/anh`) });
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-anh', diaDiemId] }); qc.invalidateQueries({ queryKey: ['dia-diem'] }); };
  const doi = useMutation({ mutationFn: ({ id, body }: { id: number; body: object }) => adminFetch(`/anh/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: lamMoi });
  const xoa = useMutation({ mutationFn: (id: number) => adminFetch(`/anh/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('Đã xoá ảnh.'); lamMoi(); } });

  const taiLen = async (tep: FileList | null) => {
    for (const f of Array.from(tep || [])) {
      setDangTai((n) => n + 1);
      try {
        const { blob, rong, cao } = await thuNho(f);
        const chuThich = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 200);
        await adminFetch(`/dia-diem/${encodeURIComponent(diaDiemId)}/anh?${new URLSearchParams({ rong: String(rong), cao: String(cao), chuThich })}`,
          { method: 'POST', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
      } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
      setDangTai((n) => n - 1);
    }
    lamMoi();
    if (chonTep.current) chonTep.current.value = '';
  };
  /* Ảnh Commons: tải về trình duyệt, thu nhỏ như ảnh tự chọn, rồi gửi lên máy chủ như thường. */
  const dungAnh = async (a: UngVien) => {
    try {
      const r = await fetch(a.lon); if (!r.ok) throw new Error('Không tải được ảnh.');
      const { blob, rong, cao } = await thuNho(await r.blob());
      await adminFetch(`/dia-diem/${encodeURIComponent(diaDiemId)}/anh?${new URLSearchParams({ rong: String(rong), cao: String(cao), chuThich: '' })}`,
        { method: 'POST', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
      toast.success('Đã thêm ảnh.'); lamMoi();
    } catch (e) { toast.error((e as Error).message); }
  };
  const doiCho = (i: number, j: number) => { doi.mutate({ id: ds[i].id, body: { thuTu: j + 1 } }); doi.mutate({ id: ds[j].id, body: { thuTu: i + 1 } }); };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">Ảnh ({ds.length}/8)</b>
        <button type="button" className={nutVien + ' gap-1.5'} disabled={ds.length >= 8 || dangTai > 0} onClick={() => chonTep.current?.click()}>
          {dangTai ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}{dangTai ? 'Đang tải lên…' : 'Thêm ảnh'}</button>
        <button type="button" className={nutVien + ' gap-1.5'} disabled={ds.length >= 8} onClick={() => setMoTim((m) => !m)}><Search className="h-3.5 w-3.5" />Tìm ảnh trên Wikimedia</button>
        <input ref={chonTep} type="file" accept="image/*" multiple hidden onChange={(e) => taiLen(e.target.files)} /></div>
      {moTim && <TimAnh tenGoiY={tenGoiY} onDung={dungAnh} onDong={() => setMoTim(false)} />}
      <p className="mt-1 text-xs text-slate-500">Ảnh đầu tiên làm ảnh đại diện. Chỉ đăng ảnh tự chụp hoặc được phép dùng.{!dangHien && ' Địa điểm đang ẩn nên ảnh chưa xem trước được.'}</p>
      {ds.length > 0 && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{ds.map((a, i) => (
        <figure key={a.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <img src={anhUrl(a.id)} alt={a.chuThich || ''} className="aspect-[4/3] w-full bg-slate-100 object-cover dark:bg-slate-800" loading="lazy" />
          <figcaption className="space-y-1 p-1.5">
            <button type="button" className="block w-full truncate text-left text-xs text-slate-600 hover:text-primary-700 dark:text-slate-300" title="Sửa chú thích"
              onClick={() => { const c = window.prompt('Chú thích ảnh (người dân thấy):', a.chuThich || ''); if (c !== null) doi.mutate({ id: a.id, body: { chuThich: c } }); }}>{a.chuThich || '+ chú thích'}</button>
            <div className="flex gap-1"><button type="button" className={nutVien} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label="Lên trước"><ArrowLeft className="h-3 w-3" /></button>
              <button type="button" className={nutVien} disabled={i === ds.length - 1} onClick={() => doiCho(i, i + 1)} aria-label="Ra sau"><ArrowRight className="h-3 w-3" /></button>
              <button type="button" className={nutVien + ' ml-auto'} onClick={() => window.confirm('Xoá ảnh này?') && xoa.mutate(a.id)} aria-label="Xoá"><Trash2 className="h-3 w-3" /></button></div>
          </figcaption></figure>))}</div>}
    </div>);
}
