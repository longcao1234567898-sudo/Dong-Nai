/** Ảnh của một tin (tối đa 10, ảnh đầu là ảnh bìa ở băng chuyền tin nổi bật và thẻ tin). Ảnh tự thu nhỏ trên trình duyệt. */
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Trash2, ArrowLeft, ArrowRight, Loader2, Star } from 'lucide-react';
import { adminFetch, adminLayBlob } from '../../services/adminService';
import { thuNho } from './QuanLyAnh';
import { nutVien } from './KhoiQt';

interface A { id: number; rong: number | null; cao: number | null; chuThich: string | null }
const TOI_DA = 10;

/* Ảnh của tin đang ẩn không mở được qua đường công khai — đọc qua đường cán bộ. */
function AnhNho({ id, alt }: { id: number; alt: string }) {
  const { data: src } = useQuery({ queryKey: ['qt-anh-tin-tep', id], queryFn: async () => URL.createObjectURL(await adminLayBlob(`/anh-tin/${id}/tep`)), staleTime: Infinity });
  return src ? <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800" />;
}

export default function QuanLyAnhTin({ tinId }: { tinId: number }) {
  const qc = useQueryClient();
  const chonTep = useRef<HTMLInputElement>(null);
  const [dang, setDang] = useState(0);
  const { data: ds = [] } = useQuery({ queryKey: ['qt-anh-tin', tinId], queryFn: () => adminFetch<A[]>(`/tin-tuc/${tinId}/anh`) });
  const lamMoi = () => { qc.invalidateQueries({ queryKey: ['qt-anh-tin', tinId] }); qc.invalidateQueries({ queryKey: ['qt-tin-tuc'] }); qc.invalidateQueries({ queryKey: ['tin-tuc'] }); };
  const doi = useMutation({ mutationFn: ({ id, body }: { id: number; body: object }) => adminFetch(`/anh-tin/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: lamMoi });
  const xoa = useMutation({ mutationFn: (id: number) => adminFetch(`/anh-tin/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('Đã xoá ảnh.'); lamMoi(); } });
  const taiLen = async (tep: FileList | null) => {
    for (const f of Array.from(tep || []).slice(0, TOI_DA - ds.length)) {
      setDang((n) => n + 1);
      try {
        const x = await thuNho(f);
        await adminFetch(`/tin-tuc/${tinId}/anh?${new URLSearchParams({ rong: String(x.rong), cao: String(x.cao) })}`, { method: 'POST', body: x.blob, headers: { 'Content-Type': 'image/jpeg' } });
      } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
      setDang((n) => n - 1);
    }
    lamMoi(); if (chonTep.current) chonTep.current.value = '';
  };
  const doiCho = (i: number, j: number) => { doi.mutate({ id: ds[i].id, body: { thuTu: j + 1 } }); doi.mutate({ id: ds[j].id, body: { thuTu: i + 1 } }); };
  const lenDau = (i: number) => ds.forEach((a, k) => doi.mutate({ id: a.id, body: { thuTu: k === i ? 1 : k < i ? k + 2 : k + 1 } }));
  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">Ảnh của tin ({ds.length}/{TOI_DA})</b>
        <button type="button" className={nutVien + ' gap-1.5'} disabled={ds.length >= TOI_DA || dang > 0} onClick={() => chonTep.current?.click()}>
          {dang ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}{dang ? 'Đang tải lên…' : 'Thêm ảnh'}</button>
        <input ref={chonTep} type="file" accept="image/*" multiple hidden onChange={(e) => taiLen(e.target.files)} /></div>
      <p className="mt-1 text-xs text-slate-500">Ảnh đầu tiên là ảnh bìa (băng chuyền tin nổi bật, thẻ tin). Chỉ đăng ảnh tự chụp hoặc được phép dùng.</p>
      {ds.length > 0 && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{ds.map((a, i) => (
        <figure key={a.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="relative"><AnhNho id={a.id} alt={a.chuThich || ''} />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">Ảnh bìa</span>}</div>
          <figcaption className="space-y-1 p-1.5">
            <button type="button" className="block w-full truncate text-left text-xs text-slate-600 hover:text-primary-700 dark:text-slate-300"
              onClick={() => { const c = window.prompt('Chú thích ảnh:', a.chuThich || ''); if (c !== null) doi.mutate({ id: a.id, body: { chuThich: c } }); }}>{a.chuThich || '+ chú thích'}</button>
            <div className="flex gap-1">
              {i > 0 && <button type="button" className={nutVien} onClick={() => lenDau(i)} aria-label="Đặt làm ảnh bìa" title="Đặt làm ảnh bìa"><Star className="h-3 w-3" /></button>}
              <button type="button" className={nutVien} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label="Lên trước"><ArrowLeft className="h-3 w-3" /></button>
              <button type="button" className={nutVien} disabled={i === ds.length - 1} onClick={() => doiCho(i, i + 1)} aria-label="Ra sau"><ArrowRight className="h-3 w-3" /></button>
              <button type="button" className={nutVien + ' ml-auto'} onClick={() => window.confirm('Xoá ảnh này?') && xoa.mutate(a.id)} aria-label="Xoá"><Trash2 className="h-3 w-3" /></button></div>
          </figcaption></figure>))}</div>}
    </div>);
}
