import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MapPin, Star, Phone, Globe, Clock, Loader2, ExternalLink, MessageSquareWarning, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import Turnstile, { captchaEnabled } from '../common/Turnstile';
import { layDanhGia, layDanhGiaCuaToi, guiDanhGia, baoDanhGia, anhUrl } from '../../services/api';
import { LOAI, TIEU_CHI, DI_CUNG, saoChu, webAnToan } from '../../utils/hangSo';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem, TieuChi } from '../../utils/kieu';

function HangSao({ gt, onChon, nho = false, ten }: { gt: number; onChon: (n: number) => void; nho?: boolean; ten: string }) {
  const { t } = useNN();
  return (
    <div role="radiogroup" aria-label={ten} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={n === gt} aria-label={`${n} ${t('sao')}`} onClick={() => onChon(n)}
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

function FormDanhGia({ p, onXong }: { p: DiaDiem; onXong: () => void }) {
  const qc = useQueryClient();
  const { t, nn } = useNN();
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
    onSuccess: () => { toast.success(t('daGuiDanhGia')); qc.invalidateQueries({ queryKey: ['dia-diem'] }); qc.invalidateQueries({ queryKey: ['danh-gia', p.id] }); qc.invalidateQueries({ queryKey: ['cua-toi', p.id] }); onXong(); },
    onError: (e: Error) => { setLoi(e.message); setToken(''); setKhoaXm((k) => k + 1); },
  });
  const nop = () => {
    setLoi('');
    if (!sao) return setLoi(t('chonSao'));
    if (captchaEnabled && !token) return setLoi(t('tichXacMinh'));
    gui.mutate();
  };
  const oNhap = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-900';
  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{cu ? t('suaDanhGia') : t('danhGiaChung')}</p>
      <HangSao gt={sao} onChon={setSao} ten={t('danhGiaChung')} />
      <p className="mb-1 mt-3 text-xs text-slate-500">{t('chamTieuChi')}</p>
      {TIEU_CHI.map(([k, vi, en]) => (
        <div key={k} className="grid grid-cols-[96px_1fr] items-center gap-2">
          <span className="text-sm">{nn === 'en' ? en : vi}</span><HangSao nho gt={Number(tc[k] || 0)} ten={nn === 'en' ? en : vi} onChon={(n) => setTc((x) => ({ ...x, [k]: n }))} />
        </div>
      ))}
      <p className="mb-1 mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('diCungAi')}</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(DI_CUNG).map(([k, [vi, en]]) => (
          <button key={k} type="button" aria-pressed={diCung === k} onClick={() => setDiCung(diCung === k ? '' : k)}
            className={`min-h-[34px] rounded-full border px-3 text-sm ${diCung === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{nn === 'en' ? en : vi}</button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('diVaoThang')}
          <input type="month" value={thang} onChange={(e) => setThang(e.target.value)} className={oNhap} /></label>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('tenHienThi')}
          <input maxLength={40} value={ten} onChange={(e) => setTen(e.target.value)} placeholder={t('khongBatBuoc')} className={oNhap} /></label>
      </div>
      <label className="mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('nhanXet')}
        <textarea maxLength={500} rows={3} value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} placeholder={t('nhanXetGoiY')} className={oNhap} /></label>
      {captchaEnabled && <div className="mt-3"><Turnstile key={khoaXm} onToken={setToken} /></div>}
      {loi && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{loi}</div>}
      <button type="button" onClick={nop} disabled={gui.isPending}
        className="mt-3 flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white hover:bg-primary-700 disabled:opacity-60">
        {gui.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{gui.isPending ? t('dangGui') : t('guiDanhGia')}
      </button>
    </div>
  );
}

/** Dải ảnh: trang riêng hiện lớn, cửa sổ nổi hiện hàng ảnh nhỏ. Bấm ảnh mở ảnh gốc. */
export function DaiAnh({ p, lon = false }: { p: DiaDiem; lon?: boolean }) {
  const { chon } = useNN();
  if (!p.anh?.length) return null;
  return (
    <div className={lon ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : 'mt-3 flex gap-2 overflow-x-auto pb-1'}>
      {p.anh.map((a, i) => (
        <a key={a.id} href={anhUrl(a.id)} target="_blank" rel="noopener noreferrer" className={`block overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${lon ? (i === 0 ? 'col-span-2 row-span-2' : '') : 'h-28 shrink-0'}`}
          style={!lon && a.rong && a.cao ? { aspectRatio: `${a.rong} / ${a.cao}` } : undefined}>
          <img src={anhUrl(a.id)} alt={a.chuThich || chon(p.ten, p.tenEn)} loading="lazy" width={a.rong || undefined} height={a.cao || undefined}
            className={`h-full w-full object-cover ${lon ? 'aspect-[4/3]' : ''}`} />
        </a>))}
    </div>);
}

/** Nội dung chi tiết một địa điểm — dùng chung cho cửa sổ nổi và trang riêng. */
export function ThongTinDiaDiem({ p, trangRieng = false }: { p: DiaDiem; trangRieng?: boolean }) {
  const { t, nn, chon, ngay } = useNN();
  const [sx, setSx] = useState('moi'); const [viet, setViet] = useState(false);
  const [daBao, setDaBao] = useState<number[]>([]);
  const { data: dg = [], isLoading } = useQuery({ queryKey: ['danh-gia', p.id, sx], queryFn: () => layDanhGia(p.id, sx) });
  const bao = useMutation({ mutationFn: (id: number) => baoDanhGia(id), onSuccess: (_r, id) => { setDaBao((d) => [...d, id]); toast.success(t('daBao')); },
    onError: (e: Error) => toast.error(e.message) });
  const web = webAnToan(p.web), sdt = String(p.sdt || '').replace(/[^0-9+]/g, '');
  const tc = TIEU_CHI.filter(([k]) => p.tieuChi[k] !== null);
  const metaDg = (ten: string | null, diCung: string | null, thoiDiem: string | null) => [ten || t('duKhach'),
    diCung && DI_CUNG[diCung] ? (nn === 'en' ? 'with ' : 'đi cùng ') + DI_CUNG[diCung][nn === 'en' ? 1 : 0].toLowerCase() : '',
    thoiDiem && /^\d{4}-\d{2}$/.test(thoiDiem) ? (nn === 'en' ? `visited ${thoiDiem.slice(5)}/${thoiDiem.slice(0, 4)}` : `đi tháng ${Number(thoiDiem.slice(5))}/${thoiDiem.slice(0, 4)}`) : '']
    .filter(Boolean).join(', ');
  const nut2 = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-200 px-4 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';
  return (<>
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">
      <span className="h-2 w-2 rounded-full" style={{ background: LOAI[p.loai]?.mau }} />{nn === 'en' ? LOAI[p.loai]?.en : LOAI[p.loai]?.ten}</span>
    {trangRieng ? <h1 id="ct-ten" className="mt-2 text-3xl font-extrabold">{chon(p.ten, p.tenEn)}</h1> : <h2 id="ct-ten" className="mt-2 text-2xl font-extrabold">{chon(p.ten, p.tenEn)}</h2>}
    {trangRieng && nn === 'en' && p.tenEn && <p className="text-sm text-slate-500">{p.ten}</p>}
    {!trangRieng && <DaiAnh p={p} />}
    {chon(p.moTa, p.moTaEn) && <p className="mt-2 text-slate-600 dark:text-slate-300">{chon(p.moTa, p.moTaEn)}</p>}
    <dl className="mt-3 space-y-1.5 text-sm">
      {p.diaChi && <div className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /><dd>{p.diaChi}</dd></div>}
      {p.gioMo && <div className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-slate-400" /><dd>{p.gioMo}</dd></div>}
      {sdt && <div className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" /><dd><a className="text-primary-600" href={`tel:${sdt}`}>{p.sdt}</a></dd></div>}
      {web && <div className="flex gap-2"><Globe className="h-4 w-4 shrink-0 text-slate-400" /><dd><a className="text-primary-600" href={web} target="_blank" rel="noopener noreferrer">{web.replace(/^https?:\/\//, '')}</a></dd></div>}
    </dl>
    <div className="mt-4 flex flex-wrap gap-2">
      <a className="btn-shine inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 font-bold text-white hover:bg-primary-700" target="_blank" rel="noopener noreferrer"
        href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}><MapPin className="h-4 w-4" />{t('chiDuong')}</a>
      <button type="button" onClick={() => setViet((v) => !v)} className={nut2}><Star className="h-4 w-4" />{viet ? t('dongFormDanhGia') : t('vietDanhGia')}</button>
      {!trangRieng && <Link to={`/dia-diem/${p.id}`} className={nut2}><ExternalLink className="h-4 w-4" />{t('xemTrangRieng')}</Link>}
      <Link to={`/phan-anh?diem=${encodeURIComponent(p.id)}`} className={nut2}><MessageSquareWarning className="h-4 w-4" />{t('guiPhanAnhDiemNay')}</Link>
    </div>
    {viet && <FormDanhGia p={p} onXong={() => setViet(false)} />}
    {p.soDanhGia > 0 && p.saoTb !== null ? (<>
      <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
        <div><b className="block text-4xl font-extrabold leading-none text-amber-600">{p.saoTb.toFixed(1)}</b>
          <span className="text-sm font-bold text-amber-600">{saoChu(p.saoTb)}</span><small className="block text-xs text-slate-500">{p.soDanhGia} {t('danhGia')}</small></div>
        <div className="grid grid-cols-[auto_1fr_22px] items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
          {p.phanBo.map((c, i) => [<span key={'a' + i}>{5 - i} {t('sao')}</span>, <Thanh key={'b' + i} phan={c / p.soDanhGia} />, <span key={'c' + i}>{c}</span>])}
        </div>
      </div>
      {tc.length > 0 && <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2.5 text-sm">
        {tc.map(([k, vi, en]) => <div key={k}><div className="mb-1 flex justify-between"><span>{nn === 'en' ? en : vi}</span><b>{Number(p.tieuChi[k]).toFixed(1)}</b></div>
          <Thanh phan={Number(p.tieuChi[k]) / 5} mau="from-primary-600 to-primary-500" /></div>)}
      </div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">{t('duKhachNoiGi')}</h3>
        <div className="flex gap-1.5">{[['moi', t('moiNhat')], ['cao', t('saoCao')], ['thap', t('saoThap')]].map(([k, ten]) => (
          <button key={k} type="button" aria-pressed={sx === k} onClick={() => setSx(k)}
            className={`min-h-[34px] rounded-full border px-3 text-sm ${sx === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}>{ten}</button>))}</div>
      </div>
      {isLoading ? <p className="py-6 text-center text-sm text-slate-500">{t('dangTaiDanhGia')}</p> : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {dg.map((x) => <li key={x.id} className="py-3">
            <div className="flex justify-between text-xs text-slate-500"><span className="font-bold text-amber-600">{saoChu(x.sao)}</span><span>{ngay(x.luc)}</span></div>
            <div className="mt-0.5 text-xs text-slate-400">{metaDg(x.ten, x.diCung, x.thoiDiem)}</div>
            {x.nhanXet && <p className="mt-1 text-sm">{x.nhanXet}</p>}
            {x.nhanXet && <button type="button" disabled={daBao.includes(x.id) || bao.isPending} onClick={() => bao.mutate(x.id)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 disabled:hover:text-slate-400"><Flag className="h-3 w-3" />{daBao.includes(x.id) ? t('daBao') : t('baoViPham')}</button>}
          </li>)}
        </ul>)}
    </>) : <p className="mt-5 text-sm text-slate-500">{t('chuaCoDanhGiaNao')}</p>}
  </>);
}

export default function ChiTiet({ p, onDong }: { p: DiaDiem; onDong: () => void }) {
  const { t } = useNN();
  const dongRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { dongRef.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && onDong(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onDong]);
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/55 md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="ct-ten"
      onClick={(e) => e.target === e.currentTarget && onDong()}>
      <div className="animate-page max-h-[88vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] dark:bg-slate-900 md:rounded-3xl">
        <button ref={dongRef} type="button" onClick={onDong} aria-label={t('dong')} className="float-right grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><X className="h-5 w-5" /></button>
        <ThongTinDiaDiem p={p} />
      </div>
    </div>
  );
}
