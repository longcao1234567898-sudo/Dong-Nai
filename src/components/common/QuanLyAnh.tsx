/**
 * Quản lý ảnh một địa điểm: thêm, tìm trên Wikimedia, chỉnh (xoay, điểm lấy nét,
 * thay ảnh), chú thích, đổi thứ tự, xoá. Ảnh được THU NHỎ NGAY TRÊN TRÌNH DUYỆT
 * (cạnh dài tối đa 1600px, JPEG) trước khi gửi: ảnh điện thoại 5–10 MB còn khoảng
 * 300 KB, tải lên nhanh trên mạng 4G, không làm phình cơ sở dữ liệu.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Trash2, ArrowLeft, ArrowRight, Loader2, Search, X, RotateCcw, RotateCw, Crosshair, Replace, Star, Download } from 'lucide-react';
import { adminFetch, adminLayBlob } from '../../services/adminService';
import { anhUrl } from '../../services/api';
import { ANH_MAC_DINH } from '../../utils/anhMacDinh';
import { nutVien, nutChinh } from './KhoiQt';

interface Anh { id: number; rong: number | null; cao: number | null; chuThich: string | null; tieuDiemX: number; tieuDiemY: number; kichThuoc: number }
const CANH_DAI = 1600;
/** Số ảnh tối đa mỗi điểm — khớp TOI_DA_ANH ở server/src/routes/noi-dung.js. */
const TOI_DA = 20;

async function thuNho(tep: Blob, goc: 0 | 90 | -90 = 0): Promise<{ blob: Blob; rong: number; cao: number }> {
  /* imageOrientation: xoay đúng chiều ảnh chụp dọc từ điện thoại (thông tin EXIF). */
  const bm = await createImageBitmap(tep, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const tl = Math.min(1, CANH_DAI / Math.max(bm.width, bm.height));
  const w = Math.round(bm.width * tl), h = Math.round(bm.height * tl);
  const dung = goc !== 0;   // xoay 90°: đổi chiều ngang, dọc
  const c = document.createElement('canvas'); c.width = dung ? h : w; c.height = dung ? w : h;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2); ctx.rotate((goc * Math.PI) / 180); ctx.drawImage(bm, -w / 2, -h / 2, w, h);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.84));
  if (!blob) throw new Error('Không xử lý được ảnh này.');
  return { blob, rong: c.width, cao: c.height };
}
const guiMoi = (diaDiemId: string, x: { blob: Blob; rong: number; cao: number }, chuThich = '') =>
  adminFetch<{ id: number }>(`/dia-diem/${encodeURIComponent(diaDiemId)}/anh?${new URLSearchParams({ rong: String(x.rong), cao: String(x.cao), chuThich })}`,
    { method: 'POST', body: x.blob, headers: { 'Content-Type': 'image/jpeg' } });
const thayTep = (id: number, x: { blob: Blob; rong: number; cao: number }) =>
  adminFetch<{ id: number }>(`/anh/${id}/tep?${new URLSearchParams({ rong: String(x.rong), cao: String(x.cao) })}`,
    { method: 'PUT', body: x.blob, headers: { 'Content-Type': 'image/jpeg' } });

/* ------------------------------------------------------------------
   CHỈNH MỘT ẢNH: xoay, chọn điểm lấy nét, thay bằng ảnh khác.
   Điểm lấy nét: ảnh bị cắt cho vừa khung (thẻ ngang, ảnh đầu trang, màn
   điện thoại) thì phần này luôn nằm trong khung — bấm vào ảnh để chọn.
   ------------------------------------------------------------------ */
function ChinhAnh({ a, onXong, onDong }: { a: Anh; onXong: () => void; onDong: () => void }) {
  const [src, setSrc] = useState('');
  const [loi, setLoi] = useState('');
  const [diem, setDiem] = useState({ x: a.tieuDiemX ?? 50, y: a.tieuDiemY ?? 50 });
  const [dang, setDang] = useState('');
  const chonTep = useRef<HTMLInputElement>(null);
  const dongRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let url = ''; let huy = false;
    adminLayBlob(`/anh/${a.id}/tep`).then((b) => { if (!huy) { url = URL.createObjectURL(b); setSrc(url); } }).catch((e: Error) => setLoi(e.message));
    return () => { huy = true; if (url) URL.revokeObjectURL(url); };
  }, [a.id]);
  /* onDong đổi mỗi lần trang cha vẽ lại: giữ qua ref để không kéo tiêu điểm về nút Đóng giữa chừng. */
  const dongMoi = useRef(onDong); dongMoi.current = onDong;
  useEffect(() => { dongRef.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && dongMoi.current(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);

  const lam = async (ten: string, viec: () => Promise<void>) => {
    setDang(ten);
    try { await viec(); } catch (e) { toast.error((e as Error).message); } finally { setDang(''); }
  };
  const xoay = (goc: 90 | -90) => lam('xoay', async () => {
    const b = await adminLayBlob(`/anh/${a.id}/tep`);
    const { id } = await thayTep(a.id, await thuNho(b, goc));
    /* Điểm lấy nét xoay theo ảnh. */
    const moi = goc === 90 ? { x: 100 - diem.y, y: diem.x } : { x: diem.y, y: 100 - diem.x };
    await adminFetch(`/anh/${id}`, { method: 'PATCH', body: JSON.stringify({ tieuDiemX: Math.round(moi.x), tieuDiemY: Math.round(moi.y) }) });
    toast.success('Đã xoay ảnh.'); onXong();
  });
  const thay = (f: File | undefined) => f && lam('thay', async () => { await thayTep(a.id, await thuNho(f)); toast.success('Đã thay ảnh.'); onXong(); });
  const luuDiem = () => lam('diem', async () => {
    await adminFetch(`/anh/${a.id}`, { method: 'PATCH', body: JSON.stringify({ tieuDiemX: diem.x, tieuDiemY: diem.y }) });
    toast.success('Đã lưu điểm lấy nét.'); onXong();
  });
  const chonDiem = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDiem({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
  };
  const vt = `${diem.x}% ${diem.y}%`;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="chinh-anh"
      onClick={(e) => e.target === e.currentTarget && onDong()}>
      <div className="hop-thoai max-h-[94vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5 shadow-sh-3 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 id="chinh-anh" className="text-lg font-bold">Chỉnh ảnh</h2>
          <button ref={dongRef} type="button" className={nutVien} onClick={onDong} aria-label="Đóng"><X className="h-4 w-4" /></button></div>
        {loi && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{loi}</p>}
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm text-slate-600"><Crosshair className="h-4 w-4" />Bấm vào phần quan trọng nhất của ảnh (mặt hồ, mái đền…) để đặt điểm lấy nét.</p>
            <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              {src ? <img src={src} alt="Ảnh đang chỉnh" onClick={chonDiem} className="block max-h-[60vh] w-full cursor-crosshair object-contain" />
                : <div className="grid aspect-[3/2] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}
              {src && <span className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgb(0_0_0/.5)]"
                style={{ left: `${diem.x}%`, top: `${diem.y}%` }} aria-hidden="true" />}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={nutChinh} disabled={!!dang || !src} onClick={luuDiem}>{dang === 'diem' && <Loader2 className="h-4 w-4 animate-spin" />}Lưu điểm lấy nét</button>
              <button type="button" className={nutVien + ' min-h-[44px] gap-1.5 px-3 text-sm'} disabled={!!dang || !src} onClick={() => xoay(-90)}><RotateCcw className="h-4 w-4" />Xoay trái</button>
              <button type="button" className={nutVien + ' min-h-[44px] gap-1.5 px-3 text-sm'} disabled={!!dang || !src} onClick={() => xoay(90)}><RotateCw className="h-4 w-4" />Xoay phải</button>
              <button type="button" className={nutVien + ' min-h-[44px] gap-1.5 px-3 text-sm'} disabled={!!dang} onClick={() => chonTep.current?.click()}><Replace className="h-4 w-4" />Thay bằng ảnh khác</button>
              <input ref={chonTep} type="file" accept="image/*" hidden onChange={(e) => thay(e.target.files?.[0])} />
              {(dang === 'xoay' || dang === 'thay') && <span className="flex items-center gap-1.5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang lưu…</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Người dân sẽ thấy ảnh được cắt thế này</p>
            {src && <div className="space-y-3">{[['Thẻ địa điểm', 'aspect-[3/2] w-full'], ['Ảnh đầu trang chủ (màn rộng)', 'aspect-[16/7] w-full'], ['Ảnh đầu trang trên điện thoại', 'aspect-[9/16] w-2/5']].map(([ten, tl]) => (
              <figure key={ten}><img src={src} alt="" className={`${tl} block rounded-lg object-cover`} style={{ objectPosition: vt }} />
                <figcaption className="mt-1 text-xs text-slate-500">{ten}</figcaption></figure>))}</div>}
          </div>
        </div>
      </div>
    </div>);
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
    gsrnamespace: '6', gsrlimit: '40', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920' });
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${ts}`);
  if (!r.ok) throw new Error(r.status === 429 ? 'Wikimedia đang giới hạn lượt tìm, đợi một phút rồi thử lại.' : 'Không kết nối được Wikimedia Commons.');
  const kq = await r.json();
  return Object.values((kq.query?.pages || {}) as Record<string, { title: string; imageinfo?: { thumburl: string; width: number; height: number; mime: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }>)
    .map((t) => { const ii = t.imageinfo?.[0]; if (!ii) return null;
      const gp = String(ii.extmetadata?.LicenseShortName?.value || '').replace(/<[^>]+>/g, '');
      /* Commons chỉ phục vụ cỡ chuẩn (500, 960, 1920…): ảnh xem trước xin 500px. */
      return { ten: t.title, lon: ii.thumburl, nho: ii.thumburl.replace(/\/\d+px-/, '/500px-'), rong: ii.width, cao: ii.height, giayPhep: gp, trang: ii.descriptionurl, mime: ii.mime }; })
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
  const [chinh, setChinh] = useState<Anh | null>(null);
  const qc = useQueryClient();
  const chonTep = useRef<HTMLInputElement>(null);
  const [dangTai, setDangTai] = useState(0);
  const { data: ds = [] } = useQuery({ queryKey: ['qt-anh', diaDiemId], queryFn: () => adminFetch<Anh[]>(`/dia-diem/${encodeURIComponent(diaDiemId)}/anh`) });
  const macDinh = ANH_MAC_DINH[diaDiemId] || [];
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-anh', diaDiemId] }); qc.invalidateQueries({ queryKey: ['dia-diem'] }); };
  const doi = useMutation({ mutationFn: ({ id, body }: { id: number; body: object }) => adminFetch(`/anh/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: lamMoi });
  const xoa = useMutation({ mutationFn: (id: number) => adminFetch(`/anh/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('Đã xoá ảnh.'); lamMoi(); } });

  const taiLen = async (tep: FileList | null) => {
    for (const f of Array.from(tep || [])) {
      setDangTai((n) => n + 1);
      try {
        const chuThich = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 200);
        await guiMoi(diaDiemId, await thuNho(f), chuThich);
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
      await guiMoi(diaDiemId, await thuNho(await r.blob()));
      toast.success('Đã thêm ảnh.'); lamMoi();
    } catch (e) { toast.error((e as Error).message); }
  };
  /* Ảnh mặc định (đi kèm mã nguồn) không sửa được tại chỗ: chép vào danh sách ảnh của điểm
     để cán bộ xoay, chọn điểm lấy nét, đổi thứ tự, xoá như ảnh tự tải lên. */
  const nhapMacDinh = async () => {
    setDangTai((n) => n + 1);
    try {
      for (const m of macDinh.slice(0, TOI_DA - ds.length)) {
        const r = await fetch(m.tep); if (!r.ok) throw new Error('Không đọc được ảnh mặc định.');
        await guiMoi(diaDiemId, await thuNho(await r.blob()));
      }
      toast.success('Đã đưa ảnh mặc định vào danh sách.');
    } catch (e) { toast.error((e as Error).message); }
    setDangTai((n) => n - 1); lamMoi();
  };
  const doiCho = (i: number, j: number) => { doi.mutate({ id: ds[i].id, body: { thuTu: j + 1 } }); doi.mutate({ id: ds[j].id, body: { thuTu: i + 1 } }); };
  const lenDau = (i: number) => ds.forEach((a, k) => doi.mutate({ id: a.id, body: { thuTu: k === i ? 1 : k < i ? k + 2 : k + 1 } }));

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">Ảnh ({ds.length}/{TOI_DA})</b>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={nutVien + ' gap-1.5'} disabled={ds.length >= TOI_DA || dangTai > 0} onClick={() => chonTep.current?.click()}>
            {dangTai ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}{dangTai ? 'Đang tải lên…' : 'Thêm ảnh'}</button>
          <button type="button" className={nutVien + ' gap-1.5'} disabled={ds.length >= TOI_DA} onClick={() => setMoTim((m) => !m)}><Search className="h-3.5 w-3.5" />Tìm ảnh trên Wikimedia</button>
        </div>
        <input ref={chonTep} type="file" accept="image/*" multiple hidden onChange={(e) => taiLen(e.target.files)} /></div>
      <p className="mt-1 text-xs text-slate-500">Ảnh đầu tiên làm ảnh đại diện. Bấm Chỉnh để xoay ảnh, chọn điểm lấy nét hoặc thay ảnh. Chỉ đăng ảnh tự chụp hoặc được phép dùng.{!dangHien && ' Địa điểm đang ẩn nên ảnh nhỏ bên dưới chưa xem trước được (vẫn chỉnh được).'}</p>
      {!ds.length && macDinh.length > 0 && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <span>Trang người dân đang hiện {macDinh.length} ảnh mặc định của điểm này. Đưa vào danh sách để xoay, chọn điểm lấy nét, đổi thứ tự hoặc xoá.</span>
        <button type="button" className={nutVien + ' gap-1.5'} disabled={dangTai > 0} onClick={nhapMacDinh}><Download className="h-3.5 w-3.5" />Đưa vào danh sách</button></div>}
      {moTim && <TimAnh tenGoiY={tenGoiY} onDung={dungAnh} onDong={() => setMoTim(false)} />}
      {ds.length > 0 && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{ds.map((a, i) => (
        <figure key={a.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="relative">
            <img src={anhUrl(a.id)} alt={a.chuThich || ''} className="aspect-[4/3] w-full bg-slate-100 object-cover dark:bg-slate-800" loading="lazy"
              style={{ objectPosition: `${a.tieuDiemX ?? 50}% ${a.tieuDiemY ?? 50}%` }} />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">Ảnh đại diện</span>}
          </div>
          <figcaption className="space-y-1 p-1.5">
            <button type="button" className="block w-full truncate text-left text-xs text-slate-600 hover:text-primary-700 dark:text-slate-300" title="Sửa chú thích"
              onClick={() => { const c = window.prompt('Chú thích ảnh (người dân thấy):', a.chuThich || ''); if (c !== null) doi.mutate({ id: a.id, body: { chuThich: c } }); }}>{a.chuThich || '+ chú thích'}</button>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={nutVien + ' gap-1'} onClick={() => setChinh(a)}><Crosshair className="h-3 w-3" />Chỉnh</button>
              {i > 0 && <button type="button" className={nutVien} onClick={() => lenDau(i)} aria-label="Đặt làm ảnh đại diện" title="Đặt làm ảnh đại diện"><Star className="h-3 w-3" /></button>}
              <button type="button" className={nutVien} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label="Lên trước"><ArrowLeft className="h-3 w-3" /></button>
              <button type="button" className={nutVien} disabled={i === ds.length - 1} onClick={() => doiCho(i, i + 1)} aria-label="Ra sau"><ArrowRight className="h-3 w-3" /></button>
              <button type="button" className={nutVien + ' ml-auto'} onClick={() => window.confirm('Xoá ảnh này?') && xoa.mutate(a.id)} aria-label="Xoá"><Trash2 className="h-3 w-3" /></button></div>
          </figcaption></figure>))}</div>}
      {chinh && <ChinhAnh a={chinh} onDong={() => setChinh(null)} onXong={() => { setChinh(null); lamMoi(); }} />}
    </div>);
}
