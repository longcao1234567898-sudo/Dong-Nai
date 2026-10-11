import { useEffect, useRef, useState, type CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MapPin, Star, Phone, Globe, Clock, Loader2, ExternalLink, MessageSquareWarning, Flag, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { HienSao, KhungAnh } from './GiaoDien';
import { layDanhGia, layDanhGiaCuaToi, guiDanhGia, baoDanhGia, anhUrl } from '../../services/api';
import { LOAI, VUNG, TIEU_CHI, DI_CUNG, webAnToan } from '../../utils/hangSo';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem, TieuChi } from '../../utils/kieu';

const SAO = 'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z';

/** Ô chọn sao: rê chuột xem trước, phím mũi tên đổi sao, sao vừa chọn nảy nhẹ. */
function ChonSao({ gt, onChon, nho = false, ten }: { gt: number; onChon: (n: number) => void; nho?: boolean; ten: string }) {
  const { t } = useNN();
  const [tro, setTro] = useState(0);
  const [nay, setNay] = useState(0);
  const hien = tro || gt, co = nho ? 26 : 36;
  return (
    <div role="radiogroup" aria-label={ten} className="flex gap-1" onMouseLeave={() => setTro(0)}
      onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChon(Math.min(5, (gt || 0) + 1)); } if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChon(Math.max(1, (gt || 1) - 1)); } }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={n === gt} aria-label={`${n} ${t('sao')}`} tabIndex={n === (gt || 1) ? 0 : -1}
          onMouseEnter={() => setTro(n)} onClick={() => { onChon(n); setNay(n); }}
          className={`chon-sao grid place-items-center rounded-lg ${nay === n ? 'vua-chon' : ''}`} style={{ width: co + 6, height: co + 6 }} onAnimationEnd={() => setNay(0)}>
          <svg width={co} height={co} viewBox="0 0 24 24" aria-hidden="true">
            <path d={SAO} strokeWidth={1.5} strokeLinejoin="round" style={{ fill: n <= hien ? 'rgb(var(--c-gold))' : 'transparent', stroke: n <= hien ? 'rgb(var(--c-star))' : 'rgb(var(--c-line-strong))', transition: 'fill .12s, stroke .12s' }} />
          </svg>
        </button>))}
    </div>);
}
const Thanh = ({ phan, i = 0, mau = 'bg-gold' }: { phan: number; i?: number; mau?: string }) => (
  <div className="h-2 overflow-hidden rounded-full bg-line/70">
    <div className={`thanh-sao h-full rounded-full ${mau}`} style={{ width: `${Math.round(phan * 100)}%`, '--i': i } as CSSProperties} />
  </div>);

function FormDanhGia({ p, onXong }: { p: DiaDiem; onXong: () => void }) {
  const qc = useQueryClient();
  const { t, nn } = useNN();
  const { data: cu } = useQuery({ queryKey: ['cua-toi', p.id], queryFn: () => layDanhGiaCuaToi(p.id) });
  const [sao, setSao] = useState(0);
  const [tc, setTc] = useState<Partial<TieuChi>>({});
  const [diCung, setDiCung] = useState('');
  const [thang, setThang] = useState(new Date().toISOString().slice(0, 7));
  const [ten, setTen] = useState(''); const [nhanXet, setNhanXet] = useState('');
  const [loi, setLoi] = useState('');
  useEffect(() => { if (cu) { setSao(cu.sao); setTc(cu.tieuChi || {}); setDiCung(cu.diCung || ''); setThang(cu.thoiDiem || thang); setTen(cu.ten || ''); setNhanXet(cu.nhanXet || ''); } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cu]);
  const gui = useMutation({
    mutationFn: () => guiDanhGia({ diaDiemId: p.id, sao, tieuChi: tc, diCung: diCung || null, thoiDiem: thang || null, nhanXet: nhanXet.trim() || null, ten: ten.trim() || null }),
    onSuccess: () => { toast.success(t('daGuiDanhGia')); ['dia-diem', 'danh-gia-moi', 'thong-ke'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ['danh-gia', p.id] }); qc.invalidateQueries({ queryKey: ['cua-toi', p.id] }); onXong(); },
    onError: (e: Error) => setLoi(e.message),
  });
  const nop = () => {
    setLoi('');
    if (!sao) return setLoi(t('chonSao'));
    gui.mutate();
  };
  const nhan = 'text-sm font-semibold text-ink-2';
  return (
    <div className="animate-page mt-4 rounded-2xl border border-line bg-sunken/60 p-5">
      <p className="mb-1 text-[15px] font-semibold">{cu ? t('suaDanhGia') : t('danhGiaChung')}</p>
      <ChonSao gt={sao} onChon={setSao} ten={t('danhGiaChung')} />
      <p className="mb-1 mt-4 text-[13px] text-muted">{t('chamTieuChi')}</p>
      {TIEU_CHI.map(([k, vi, en]) => (
        <div key={k} className="grid grid-cols-[100px_1fr] items-center gap-2">
          <span className="text-sm">{nn === 'en' ? en : vi}</span><ChonSao nho gt={Number(tc[k] || 0)} ten={nn === 'en' ? en : vi} onChon={(n) => setTc((x) => ({ ...x, [k]: n }))} />
        </div>))}
      <p className={`mb-1.5 mt-4 ${nhan}`}>{t('diCungAi')}</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(DI_CUNG).map(([k, [vi, en]]) => (
          <button key={k} type="button" className="chip" aria-pressed={diCung === k} onClick={() => setDiCung(diCung === k ? '' : k)}>{nn === 'en' ? en : vi}</button>))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={nhan}>{t('diVaoThang')}<input type="month" value={thang} onChange={(e) => setThang(e.target.value)} className="o-nhap mt-1 font-normal" /></label>
        <label className={nhan}>{t('tenHienThi')}<input maxLength={40} value={ten} onChange={(e) => setTen(e.target.value)} placeholder={t('khongBatBuoc')} className="o-nhap mt-1 font-normal" /></label>
      </div>
      <label className={`mt-3 block ${nhan}`}>{t('nhanXet')}
        <textarea maxLength={500} rows={3} value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} placeholder={t('nhanXetGoiY')} className="o-nhap mt-1 font-normal" /></label>
      {loi && <div role="alert" className="mt-3 rounded-xl bg-[#FDECEA] px-4 py-3 text-sm text-[#B42318]">{loi}</div>}
      <button type="button" onClick={nop} disabled={gui.isPending} className="nut nut-chinh mt-4">
        {gui.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{gui.isPending ? t('dangGui') : t('guiDanhGia')}</button>
    </div>);
}

/** Dải ảnh: trang riêng hiện lớn, cửa sổ nổi hiện hàng ảnh nhỏ. Bấm ảnh mở ảnh gốc. */
export function DaiAnh({ p, lon = false }: { p: DiaDiem; lon?: boolean }) {
  const { chon } = useNN();
  if (!p.anh?.length) return null;
  return (
    <div className={lon ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : 'khong-thanh-cuon mt-3 flex gap-2 overflow-x-auto pb-1'}>
      {p.anh.map((a, i) => (
        <a key={a.id} href={anhUrl(a.id)} target="_blank" rel="noopener noreferrer" className={`block overflow-hidden rounded-xl bg-sunken ${lon ? (i === 0 ? 'col-span-2 row-span-2' : '') : 'h-28 shrink-0'}`}
          style={!lon && a.rong && a.cao ? { aspectRatio: `${a.rong} / ${a.cao}` } : undefined}>
          <img src={anhUrl(a.id)} alt={a.chuThich || chon(p.ten, p.tenEn)} loading="lazy" width={a.rong || undefined} height={a.cao || undefined}
            className={`h-full w-full object-cover ${lon ? 'aspect-[4/3]' : ''}`} />
        </a>))}
    </div>);
}

/** Nội dung chi tiết một địa điểm — dùng chung cho cửa sổ nổi và trang riêng. */
export function ThongTinDiaDiem({ p, trangRieng = false, vietNgay = false, giua }: { p: DiaDiem; trangRieng?: boolean; vietNgay?: boolean; giua?: ReactNode }) {
  const { t, nn, chon, ngay } = useNN();
  const [sx, setSx] = useState('moi'); const [viet, setViet] = useState(vietNgay);
  const [daBao, setDaBao] = useState<number[]>([]);
  const { data: dg = [], isLoading } = useQuery({ queryKey: ['danh-gia', p.id, sx], queryFn: () => layDanhGia(p.id, sx) });
  const bao = useMutation({ mutationFn: (id: number) => baoDanhGia(id), onSuccess: (_r, id) => { setDaBao((d) => [...d, id]); toast.success(t('daBao')); },
    onError: (e: Error) => toast.error(e.message) });
  const web = webAnToan(p.web), sdt = String(p.sdt || '').replace(/[^0-9+]/g, '');
  const tc = TIEU_CHI.filter(([k]) => p.tieuChi[k] !== null);
  const so1 = (n: number) => n.toLocaleString(nn === 'en' ? 'en' : 'vi', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const metaDg = (ten: string | null, diCung: string | null, thoiDiem: string | null) => [ten || t('duKhach'),
    diCung && DI_CUNG[diCung] ? (nn === 'en' ? 'with ' : 'đi cùng ') + DI_CUNG[diCung][nn === 'en' ? 1 : 0].toLowerCase() : '',
    thoiDiem && /^\d{4}-\d{2}$/.test(thoiDiem) ? (nn === 'en' ? `visited ${thoiDiem.slice(5)}/${thoiDiem.slice(0, 4)}` : `đi tháng ${Number(thoiDiem.slice(5))}/${thoiDiem.slice(0, 4)}`) : '']
    .filter(Boolean).join(', ');
  const khuVuc = [p.xa, p.vung ? VUNG[p.vung][nn === 'en' ? 'en' : 'ten'] : null].filter(Boolean).join(', ');
  return (<>
    <p className="text-[13px] font-medium text-muted">{nn === 'en' ? LOAI[p.loai]?.en : LOAI[p.loai]?.ten}{khuVuc && `, ${khuVuc}`}</p>
    {trangRieng ? <h1 id="ct-ten" className="tieu-de-muc mt-1">{chon(p.ten, p.tenEn)}</h1> : <h2 id="ct-ten" className="tieu-de-vua mt-1">{chon(p.ten, p.tenEn)}</h2>}
    {trangRieng && nn === 'en' && p.tenEn && <p className="text-sm text-muted">{p.ten}</p>}
    {!trangRieng && <DaiAnh p={p} />}
    {chon(p.moTa, p.moTaEn) && <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-2">{chon(p.moTa, p.moTaEn)}</p>}
    <dl className="mt-4 space-y-1.5 text-[15px]">
      {p.diaChi && <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><dd>{p.diaChi}</dd></div>}
      {p.gioMo && <div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><dd>{p.gioMo}</dd></div>}
      {sdt && <div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><dd><a className="text-action" href={`tel:${sdt}`}>{p.sdt}</a></dd></div>}
      {web && <div className="flex gap-2"><Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><dd><a className="text-action" href={web} target="_blank" rel="noopener noreferrer">{web.replace(/^https?:\/\//, '')}</a></dd></div>}
    </dl>
    <div className="mt-5 flex flex-wrap gap-2">
      <a className="nut nut-chinh" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}><Navigation className="h-4 w-4" />{t('chiDuong')}</a>
      <button type="button" onClick={() => setViet((v) => !v)} aria-expanded={viet} className="nut nut-vien"><Star className="h-4 w-4" />{viet ? t('dongFormDanhGia') : t('vietDanhGia')}</button>
      {!trangRieng && <Link to={`/dia-diem/${p.id}`} className="nut nut-vien"><ExternalLink className="h-4 w-4" />{t('xemTrangRieng')}</Link>}
      <Link to={`/phan-anh?diem=${encodeURIComponent(p.id)}`} className="nut nut-vien"><MessageSquareWarning className="h-4 w-4" />{t('guiPhanAnhDiemNay')}</Link>
    </div>
    {viet && <FormDanhGia p={p} onXong={() => setViet(false)} />}
    {/* Trang riêng: bộ ảnh và bài chi tiết nằm giữa thông tin chung và phần đánh giá. */}
    {giua}
    {p.soDanhGia > 0 && p.saoTb !== null ? (<>
      <div className="da-hien mt-6 grid grid-cols-[auto_1fr] items-center gap-6 rounded-2xl bg-sunken/70 p-5">
        <div><b className="so-lon block">{so1(p.saoTb)}</b><span className="mt-1 block"><HienSao gt={p.saoTb} co={18} /></span>
          <small className="mt-1 block text-[13px] text-muted">{p.soDanhGia} {t('danhGia')}</small></div>
        <div className="grid grid-cols-[auto_1fr_22px] items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted">
          {p.phanBo.map((c, i) => [<span key={'a' + i}>{5 - i} {t('sao')}</span>, <Thanh key={'b' + i} i={i} phan={c / p.soDanhGia} />, <span key={'c' + i} className="tabular-nums">{c}</span>])}
        </div>
      </div>
      {tc.length > 0 && <div className="da-hien mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {tc.map(([k, vi, en], i) => <div key={k}><div className="mb-1 flex justify-between"><span>{nn === 'en' ? en : vi}</span><b className="tabular-nums">{so1(Number(p.tieuChi[k]))}</b></div>
          <Thanh i={i} phan={Number(p.tieuChi[k]) / 5} mau="bg-emerald" /></div>)}
      </div>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold">{t('duKhachNoiGi')}</h3>
        <div className="flex gap-1.5">{[['moi', t('moiNhat')], ['cao', t('saoCao')], ['thap', t('saoThap')]].map(([k, ten]) => (
          <button key={k} type="button" className="chip min-h-[36px]" aria-pressed={sx === k} onClick={() => setSx(k)}>{ten}</button>))}</div>
      </div>
      {isLoading ? <p className="py-6 text-center text-sm text-muted">{t('dangTaiDanhGia')}</p> : (
        <ul className="mt-2 divide-y divide-line/70">
          {dg.map((x) => <li key={x.id} className="py-4">
            <div className="flex items-center justify-between gap-2 text-[13px] text-muted"><HienSao gt={x.sao} co={14} /><span>{ngay(x.luc)}</span></div>
            <div className="mt-1 text-[13px] text-muted">{metaDg(x.ten, x.diCung, x.thoiDiem)}</div>
            {x.nhanXet && <p className="mt-1.5 text-[15.5px] leading-relaxed">{x.nhanXet}</p>}
            {x.nhanXet && <button type="button" disabled={daBao.includes(x.id) || bao.isPending} onClick={() => bao.mutate(x.id)}
              className="mt-1.5 inline-flex min-h-[32px] items-center gap-1 text-xs text-muted hover:text-[#B42318] disabled:hover:text-muted"><Flag className="h-3 w-3" />{daBao.includes(x.id) ? t('daBao') : t('baoViPham')}</button>}
          </li>)}
        </ul>)}
    </>) : <p className="mt-6 text-[15px] text-muted">{t('chuaCoDanhGiaNao')}</p>}
  </>);
}

export default function ChiTiet({ p, onDong, vietNgay = false }: { p: DiaDiem; onDong: () => void; vietNgay?: boolean }) {
  const { t } = useNN();
  const dongRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { dongRef.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && onDong(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onDong]);
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-[#0C2925]/60 md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="ct-ten"
      onClick={(e) => e.target === e.currentTarget && onDong()}>
      <div className="hop-thoai max-h-[90vh] w-full max-w-2xl overflow-auto rounded-t-[24px] bg-paper pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink shadow-sh-3 md:rounded-[24px]">
        <div className="relative h-44 overflow-hidden bg-sunken sm:h-56"><KhungAnh p={p} />
          <button ref={dongRef} type="button" onClick={onDong} aria-label={t('dong')} className="kinh absolute right-4 top-4 z-[3] grid h-10 w-10 place-items-center rounded-xl shadow-sh-2"><X className="h-5 w-5" /></button></div>
        <div className="p-6"><ThongTinDiaDiem p={p} vietNgay={vietNgay} /></div>
      </div>
    </div>);
}
