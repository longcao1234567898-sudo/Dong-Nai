import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MapPin, Star, Phone, Globe, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Turnstile, { captchaEnabled } from '../common/Turnstile';
import { layDanhGia, layDanhGiaCuaToi, guiDanhGia } from '../../services/api';
import { LOAI, TIEU_CHI, DI_CUNG, saoChu, webAnToan } from '../../utils/hangSo';
import type { DiaDiem, TieuChi } from '../../utils/kieu';

function HangSao({ gt, onChon, nho = false, ten }: { gt: number; onChon: (n: number) => void; nho?: boolean; ten: string }) {
  return (
    <div role="radiogroup" aria-label={ten} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={n === gt} aria-label={`${n} sao`} onClick={() => onChon(n)}
          className={`${nho ? 'text-2xl' : 'text-[34px]'} leading-none transition-transform hover:scale-110 ${n <= gt ? 'text-accent-500' : 'text-slate-300 dark:text-slate-600'}`}>★</button>
      ))}
    </div>
  );
}
const Thanh = ({ phan, mau = 'from-accent-500 to-amber-600' }: { phan: number; mau?: string }) => (
  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
    <div className={`thanh-mo h-full rounded-full bg-gradient-to-r ${mau}`} style={{ width: `${Math.round(phan * 100)}%` }} />
  </div>
);
const metaDg = (ten: string | null, diCung: string | null, thoiDiem: string | null) =>
  [ten || 'Du khách', diCung && DI_CUNG[diCung] ? 'đi cùng ' + DI_CUNG[diCung].toLowerCase() : '',
   thoiDiem && /^\d{4}-\d{2}$/.test(thoiDiem) ? `đi tháng ${Number(thoiDiem.slice(5))}/${thoiDiem.slice(0, 4)}` : ''].filter(Boolean).join(', ');

function FormDanhGia({ p, onXong }: { p: DiaDiem; onXong: () => void }) {
  const qc = useQueryClient();
  const { data: cu } = useQuery({ queryKey: ['cua-toi', p.id], queryFn: () => layDanhGiaCuaToi(p.id) });
  const [sao, setSao] = useState(0);
  const [tc, setTc] = useState<Partial<TieuChi>>({});
  const [diCung, setDiCung] = useState('');
  const [thang, setThang] = useState(new Date().toISOString().slice(0, 7));
  const [ten, setTen] = useState(''); const [nhanXet, setNhanXet] = useState('');
  const [token, setToken] = useState(''); const [khoaXm, setKhoaXm] = useState(0); const [loi, setLoi] = useState('');
  useEffect(() => { if (cu) { setSao(cu.sao); setTc(cu.tieuChi || {}); setDiCung(cu.diCung || ''); setThang(cu.thoiDiem || thang); setTen(cu.ten || ''); setNhanXet(cu.nhanXet || ''); } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cu]);
  const gui = useMutation({
    mutationFn: () => guiDanhGia({ diaDiemId: p.id, sao, tieuChi: tc, diCung: diCung || null, thoiDiem: thang || null, nhanXet: nhanXet.trim() || null, ten: ten.trim() || null, captchaToken: token || undefined }),
    onSuccess: () => { toast.success('Đã gửi đánh giá. Cảm ơn bạn đã chia sẻ.'); qc.invalidateQueries({ queryKey: ['dia-diem'] }); qc.invalidateQueries({ queryKey: ['danh-gia', p.id] }); qc.invalidateQueries({ queryKey: ['cua-toi', p.id] }); onXong(); },
    onError: (e: Error) => { setLoi(e.message); setToken(''); setKhoaXm((k) => k + 1); },
  });
  const nop = () => {
    setLoi('');
    if (!sao) return setLoi('Chọn số sao đánh giá chung trước khi gửi.');
    if (captchaEnabled && !token) return setLoi('Vui lòng tích ô "Tôi không phải là người máy".');
    gui.mutate();
  };
  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{cu ? 'Sửa đánh giá của bạn' : 'Đánh giá chung'}</p>
      <HangSao gt={sao} onChon={setSao} ten="Đánh giá chung" />
      <p className="mb-1 mt-3 text-xs text-slate-500">Chấm thêm từng tiêu chí (không bắt buộc)</p>
      {TIEU_CHI.map(([k, t]) => (
        <div key={k} className="grid grid-cols-[96px_1fr] items-center gap-2">
          <span className="text-sm">{t}</span><HangSao nho gt={Number(tc[k] || 0)} ten={t} onChon={(n) => setTc((x) => ({ ...x, [k]: n }))} />
        </div>
      ))}
      <p className="mb-1 mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Bạn đi cùng ai</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(DI_CUNG).map(([k, t]) => (
          <button key={k} type="button" aria-pressed={diCung === k} onClick={() => setDiCung(diCung === k ? '' : k)}
            className={`min-h-[34px] rounded-full border px-3 text-sm ${diCung === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{t}</button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Đi vào tháng
          <input type="month" value={thang} onChange={(e) => setThang(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-900" /></label>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tên hiển thị
          <input maxLength={40} value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Không bắt buộc" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-900" /></label>
      </div>
      <label className="mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nhận xét
        <textarea maxLength={500} rows={3} value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} placeholder="Cảnh quan, dịch vụ, đường đi…"
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-900" /></label>
      {captchaEnabled && <div className="mt-3"><Turnstile key={khoaXm} onToken={setToken} /></div>}
      {loi && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{loi}</div>}
      <button type="button" onClick={nop} disabled={gui.isPending}
        className="mt-3 flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white hover:bg-primary-700 disabled:opacity-60">
        {gui.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{gui.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
      </button>
    </div>
  );
}

export default function ChiTiet({ p, onDong }: { p: DiaDiem; onDong: () => void }) {
  const [sx, setSx] = useState('moi'); const [viet, setViet] = useState(false);
  const { data: dg = [], isLoading } = useQuery({ queryKey: ['danh-gia', p.id, sx], queryFn: () => layDanhGia(p.id, sx) });
  const dongRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { dongRef.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && onDong(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onDong]);
  const web = webAnToan(p.web), sdt = String(p.sdt || '').replace(/[^0-9+]/g, '');
  const tc = TIEU_CHI.filter(([k]) => p.tieuChi[k] !== null);
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/55 md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="ct-ten"
      onClick={(e) => e.target === e.currentTarget && onDong()}>
      <div className="animate-page max-h-[88vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] dark:bg-slate-900 md:rounded-3xl">
        <button ref={dongRef} type="button" onClick={onDong} aria-label="Đóng" className="float-right grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><X className="h-5 w-5" /></button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">
          <span className="h-2 w-2 rounded-full" style={{ background: LOAI[p.loai]?.mau }} />{LOAI[p.loai]?.ten}</span>
        <h2 id="ct-ten" className="mt-2 text-2xl font-extrabold">{p.ten}</h2>
        {p.moTa && <p className="mt-2 text-slate-600 dark:text-slate-300">{p.moTa}</p>}
        <dl className="mt-3 space-y-1.5 text-sm">
          {p.diaChi && <div className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /><dd>{p.diaChi}</dd></div>}
          {p.gioMo && <div className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-slate-400" /><dd>{p.gioMo}</dd></div>}
          {sdt && <div className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" /><dd><a className="text-primary-600" href={`tel:${sdt}`}>{p.sdt}</a></dd></div>}
          {web && <div className="flex gap-2"><Globe className="h-4 w-4 shrink-0 text-slate-400" /><dd><a className="text-primary-600" href={web} target="_blank" rel="noopener noreferrer">{web.replace(/^https?:\/\//, '')}</a></dd></div>}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-shine inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white hover:bg-primary-700" target="_blank" rel="noopener noreferrer"
            href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}><MapPin className="h-4 w-4" />Chỉ đường</a>
          <button type="button" onClick={() => setViet((v) => !v)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-200 px-5 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <Star className="h-4 w-4" />{viet ? 'Đóng form đánh giá' : 'Viết đánh giá'}</button>
        </div>
        {viet && <FormDanhGia p={p} onXong={() => setViet(false)} />}
        {p.soDanhGia > 0 && p.saoTb !== null ? (<>
          <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <div><b className="block text-4xl font-extrabold leading-none text-amber-600">{p.saoTb.toFixed(1)}</b>
              <span className="text-sm font-bold text-amber-600">{saoChu(p.saoTb)}</span><small className="block text-xs text-slate-500">{p.soDanhGia} đánh giá</small></div>
            <div className="grid grid-cols-[auto_1fr_22px] items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
              {p.phanBo.map((c, i) => [<span key={'a' + i}>{5 - i} sao</span>, <Thanh key={'b' + i} phan={c / p.soDanhGia} />, <span key={'c' + i}>{c}</span>])}
            </div>
          </div>
          {tc.length > 0 && <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2.5 text-sm">
            {tc.map(([k, t]) => <div key={k}><div className="mb-1 flex justify-between"><span>{t}</span><b>{Number(p.tieuChi[k]).toFixed(1)}</b></div>
              <Thanh phan={Number(p.tieuChi[k]) / 5} mau="from-primary-600 to-primary-500" /></div>)}
          </div>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold">Du khách nói gì</h3>
            <div className="flex gap-1.5">{[['moi', 'Mới nhất'], ['cao', 'Sao cao'], ['thap', 'Sao thấp']].map(([k, t]) => (
              <button key={k} type="button" aria-pressed={sx === k} onClick={() => setSx(k)}
                className={`min-h-[34px] rounded-full border px-3 text-sm ${sx === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}>{t}</button>))}</div>
          </div>
          {isLoading ? <p className="py-6 text-center text-sm text-slate-500">Đang tải đánh giá…</p> : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {dg.map((x) => <li key={x.id} className="py-3">
                <div className="flex justify-between text-xs text-slate-500"><span className="font-bold text-amber-600">{saoChu(x.sao)}</span><span>{new Date(x.luc).toLocaleDateString('vi-VN')}</span></div>
                <div className="mt-0.5 text-xs text-slate-400">{metaDg(x.ten, x.diCung, x.thoiDiem)}</div>
                {x.nhanXet && <p className="mt-1 text-sm">{x.nhanXet}</p>}</li>)}
            </ul>)}
        </>) : <p className="mt-5 text-sm text-slate-500">Chưa có đánh giá nào. Bạn có thể là người đầu tiên.</p>}
      </div>
    </div>
  );
}
