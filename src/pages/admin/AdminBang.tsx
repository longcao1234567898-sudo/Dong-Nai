/**
 * Một trang dùng chung cho MỌI bảng phụ lục — vẽ theo cấu hình máy chủ gửi
 * về (server/src/lib/phu-luc.js), nên thêm bảng mới không phải viết trang mới.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Download, Upload, History, X, Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { adminFetch, adminTaiXuong, adminTaiLen } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nhan, nutChinh, nutVien } from '../../components/common/KhoiQt';
import { useCauHinh, hienO, nhoChon, ngayVn, type BangPL, type Truong, type Dong } from '../../utils/phuLuc';

interface NopXa { xaPhuongId: number; ten: string; trangThai: 'dang-nhap' | 'da-chot'; soDong: Record<string, number>; khongPhatSinh: string[] }
interface KetQuaNhap { soDong: number; them: number; capNhat: number; khongDoi: number; loi: { dong: number; loi: string }[]; cotBoQua: string[];
  xemTruoc?: (Record<string, unknown> & { dong: number; xa: string; trangThai: string })[]; error?: string }
interface LS { hanhDong: string; cu: Record<string, unknown> | null; moi: Record<string, unknown> | null; luc: string; canBo: string | null }

const HANH_DONG: Record<string, string> = { them: 'Thêm', sua: 'Sửa', xoa: 'Xoá', 'khoi-phuc': 'Khôi phục', 'nhap-excel': 'Nhập từ Excel' };
const loiHop = 'mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300';
const vangHop = 'rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';

function ONhap({ t, gt, onDoi }: { t: Truong; gt: unknown; onDoi: (v: unknown) => void }) {
  if (t.kieu === 'co') return (
    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-[18px] w-[18px] accent-primary-600" checked={!!gt} onChange={(e) => onDoi(e.target.checked)} />{t.nhan}</label>);
  const nhanO = <>{t.nhan}{t.batBuoc && <span className="text-red-600"> *</span>}</>;
  if (t.kieu === 'chon') return (
    <label className={nhan}>{nhanO}<select className={o} value={String(gt ?? '')} onChange={(e) => onDoi(e.target.value)}>
      {!t.batBuoc && <option value="">— Chưa chọn —</option>}{t.chon!.map(([g, n]) => <option key={g} value={String(g)}>{n}</option>)}</select></label>);
  if (t.kieu === 'chu' && t.dong) return <label className={nhan}>{nhanO}<textarea className={o} rows={t.dong} maxLength={t.max} value={String(gt ?? '')} onChange={(e) => onDoi(e.target.value)} /></label>;
  return (
    <label className={nhan}>{nhanO}
      <input className={o} value={String(gt ?? '')} onChange={(e) => onDoi(e.target.value)} maxLength={t.max || 40}
        type={t.kieu === 'ngay' ? 'date' : 'text'} inputMode={t.kieu === 'so' ? 'decimal' : t.kieu === 'nguyen' || t.kieu === 'nam' ? 'numeric' : undefined}
        placeholder={t.kieu === 'so' ? (t.m2 ? 'Ví dụ 50,47 (ghi m2 thì tự đổi ra ha)' : 'Ví dụ 1.854,4') : t.kieu === 'nguyen' ? 'Ví dụ 250.000' : t.kieu === 'nam' ? 'Ví dụ 2026' : undefined} /></label>);
}

function LichSu({ cfg, id, onDong }: { cfg: BangPL; id: number; onDong: () => void }) {
  const { data: ds = [], isLoading } = useQuery({ queryKey: ['qt-lich-su', cfg.key, id], queryFn: () => adminFetch<LS[]>(`/bao-cao/bang/${cfg.key}/${id}/lich-su`) });
  const { data: ch } = useCauHinh();
  const tenTruong = (k: string) => (k === 'xa_phuong_id' ? 'Xã/phường' : cfg.truong.find((t) => t.k === k)?.nhan || k);
  const hien = (k: string, v: unknown) => (k === 'xa_phuong_id' ? ch?.xaPhuong.find((x) => x.id === v)?.ten || String(v) : (() => { const t = cfg.truong.find((x) => x.k === k); return t ? hienO(t, v) || '(trống)' : String(v); })());
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/55 md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Lịch sử sửa" onClick={(e) => e.target === e.currentTarget && onDong()}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-white p-6 dark:bg-slate-900 md:rounded-3xl">
        <button type="button" onClick={onDong} aria-label="Đóng" className="float-right grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><X className="h-5 w-5" /></button>
        <h2 className="text-xl font-extrabold">Lịch sử sửa</h2><p className="text-sm text-slate-500">Mới nhất ở trên. Lịch sử không xoá được.</p>
        {isLoading ? <p className="py-6 text-center text-sm text-slate-500">Đang tải…</p> : (
          <ol className="mt-3 space-y-3">{ds.map((x, i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="flex flex-wrap justify-between gap-2"><b>{HANH_DONG[x.hanhDong] || x.hanhDong}</b><small className="text-slate-500">{x.canBo || '—'} · {new Date(x.luc).toLocaleString('vi-VN')}</small></div>
              {x.hanhDong !== 'xoa' && x.moi && <ul className="mt-1.5 space-y-0.5">{Object.entries(x.moi).map(([k, v]) => (
                <li key={k}><span className="text-slate-500">{tenTruong(k)}:</span> {x.cu && k in x.cu && <><s className="text-slate-400">{hien(k, x.cu[k])}</s> → </>}<b>{hien(k, v)}</b></li>))}</ul>}
            </li>))}
            {!ds.length && <li className="py-6 text-center text-sm text-slate-500">Chưa có lịch sử.</li>}</ol>)}
      </div>
    </div>);
}

function NhapExcel({ cfg, kyId, xaLoc, onXong }: { cfg: BangPL; kyId: number | null; xaLoc: number; onXong: () => void }) {
  const [tep, setTep] = useState<File | null>(null);
  const [kq, setKq] = useState<KetQuaNhap | null>(null);
  const [loi, setLoi] = useState('');
  const qs = `?${new URLSearchParams({ ...(kyId ? { ky: String(kyId) } : {}), ...(xaLoc ? { xa: String(xaLoc) } : {}) })}`;
  const kiem = useMutation({ mutationFn: (f: File) => adminTaiLen<KetQuaNhap>(`/bao-cao/bang/${cfg.key}/nhap${qs}&thu=1`, f),
    onSuccess: (r) => { setKq(r); setLoi(''); }, onError: (e: Error) => { setKq(null); setLoi(e.message); } });
  const luu = useMutation({ mutationFn: () => adminTaiLen<KetQuaNhap>(`/bao-cao/bang/${cfg.key}/nhap${qs}`, tep!),
    onSuccess: (r) => { toast.success(`Đã lưu: thêm ${r.them}, cập nhật ${r.capNhat} dòng.`); onXong(); }, onError: (e: Error) => setLoi(e.message) });
  const cot = cfg.truong.filter((t) => t.kieu !== 'tinh').slice(0, 5);
  return (
    <The className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[17px] font-bold">Nhập từ tệp Excel</h2>
        <button type="button" className={nutVien} onClick={onXong}>Đóng</button></div>
      <p className="mt-1 text-[13px] text-slate-500">Bước 1: chọn tệp → máy kiểm tra từng dòng, chưa lưu gì. Bước 2: không còn lỗi thì bấm Lưu. Còn một dòng lỗi là không lưu dòng nào.
        {cfg.theoKy && ' Số liệu vào kỳ đang chọn ở trên.'}{xaLoc ? ' Dòng để trống cột xã/phường sẽ vào xã/phường đang chọn.' : ''}</p>
      <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:font-semibold file:text-primary-700"
        onChange={(e) => { const f = e.target.files?.[0] || null; setTep(f); setKq(null); setLoi(''); if (f) kiem.mutate(f); }} />
      {kiem.isPending && <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang kiểm tra tệp…</p>}
      {loi && <div className={loiHop}>{loi}</div>}
      {kq && <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2 text-sm"><The_nho mau="xam">{kq.soDong} dòng trong tệp</The_nho><The_nho mau="xanh">Thêm mới {kq.them}</The_nho>
          <The_nho mau="xanh">Cập nhật {kq.capNhat}</The_nho>{kq.khongDoi > 0 && <The_nho mau="xam">Không đổi {kq.khongDoi}</The_nho>}{kq.loi.length > 0 && <The_nho mau="vang">Lỗi {kq.loi.length}</The_nho>}</div>
        {kq.cotBoQua.length > 0 && <div className={vangHop}>Không nhận ra các cột: <b>{kq.cotBoQua.join(', ')}</b> — các cột này bị bỏ qua.</div>}
        {kq.loi.length > 0 && <div className={loiHop + ' mt-0'}><b className="block">Sửa các dòng sau trong tệp rồi chọn lại tệp:</b>
          <ul className="mt-1 max-h-56 list-disc overflow-auto pl-5">{kq.loi.map((l, i) => <li key={i}>Dòng {l.dong}: {l.loi}</li>)}</ul></div>}
        {!!kq.xemTruoc?.length && <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
          <th className="py-1.5">Dòng</th><th>Xã/phường</th>{cot.map((t) => <th key={t.k}>{t.nhan}</th>)}<th></th></tr></thead>
          <tbody>{kq.xemTruoc.map((r) => <tr key={r.dong} className="border-b border-slate-100 dark:border-slate-800"><td className="py-1.5">{r.dong}</td><td>{r.xa}</td>
            {cot.map((t) => <td key={t.k} className="pr-2">{hienO(t, r[t.k])}</td>)}
            <td>{r.trangThai === 'them' ? <The_nho mau="xanh">Mới</The_nho> : r.trangThai === 'cap-nhat' ? <The_nho mau="vang">Cập nhật</The_nho> : <The_nho mau="xam">Không đổi</The_nho>}</td></tr>)}</tbody></table>
          {kq.xemTruoc.length < kq.them + kq.capNhat + kq.khongDoi && <p className="mt-1 text-xs text-slate-500">Chỉ hiện {kq.xemTruoc.length} dòng đầu.</p>}</div>}
        <button type="button" className={nutChinh} disabled={!!kq.loi.length || !(kq.them + kq.capNhat) || luu.isPending} onClick={() => luu.mutate()}>
          {luu.isPending ? 'Đang lưu…' : `Lưu ${kq.them + kq.capNhat} dòng vào hệ thống`}</button>
      </div>}
    </The>);
}

export default function AdminBang() {
  const { bang: key = '' } = useParams();
  const qc = useQueryClient();
  const { data: ch, isLoading: dangTai } = useCauHinh();
  const cfg = ch?.bang.find((b) => b.key === key);
  const [kyId, setKyId] = useState<number | null>(null);
  const [xaLoc, setXaLoc] = useState<number>(() => Number(nhoChon('xa')) || 0);
  const [daXoa, setDaXoa] = useState(false);
  const [tuKhoa, setTuKhoa] = useState('');
  const [sua, setSua] = useState<{ id: number | null; xa: number; gt: Record<string, unknown> } | null>(null);
  const [loiForm, setLoiForm] = useState('');
  const [moNhap, setMoNhap] = useState(false);
  const [xemLs, setXemLs] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* Kỳ mặc định: kỳ đã chọn lần trước, không có thì kỳ mới nhất đã bắt đầu. */
  useEffect(() => {
    if (!ch || kyId) return;
    const nho = Number(nhoChon('ky')), homNay = new Date().toISOString().slice(0, 10);
    setKyId(ch.ky.find((k) => k.id === nho)?.id || ch.ky.find((k) => k.tuNgay <= homNay)?.id || ch.ky[0]?.id || null);
  }, [ch, kyId]);
  useEffect(() => { setSua(null); setMoNhap(false); setDaXoa(false); }, [key]);

  const ky = ch?.ky.find((k) => k.id === kyId) || null;
  const canKy = !!cfg?.theoKy;
  const qs = new URLSearchParams({ ...(canKy && kyId ? { ky: String(kyId) } : {}), ...(xaLoc ? { xa: String(xaLoc) } : {}), ...(daXoa ? { daXoa: '1' } : {}) }).toString();
  const { data: ds = [], isLoading } = useQuery({ queryKey: ['qt-bang', key, qs], enabled: !!cfg && (!canKy || !!kyId),
    queryFn: () => adminFetch<Dong[]>(`/bao-cao/bang/${key}?${qs}`) });
  const { data: nop } = useQuery({ queryKey: ['qt-nop', kyId], enabled: !!kyId && !!cfg && !cfg.dan,
    queryFn: () => adminFetch<{ ds: NopXa[] }>(`/bao-cao/nop?ky=${kyId}`) });

  const lamMoi = () => { ['qt-bang', 'qt-nop', 'qt-thong-ke', 'qt-tong-quan', 'qt-lich-su'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  const luu = useMutation({
    mutationFn: () => adminFetch(sua!.id ? `/bao-cao/bang/${key}/${sua!.id}` : `/bao-cao/bang/${key}`, { method: sua!.id ? 'PUT' : 'POST',
      body: JSON.stringify({ ...sua!.gt, xa_phuong_id: sua!.xa, ...(canKy ? { ky_id: kyId } : {}) }) }),
    onSuccess: () => { toast.success(sua!.id ? 'Đã lưu thay đổi.' : 'Đã thêm dòng.'); setSua(null); setLoiForm(''); lamMoi(); },
    onError: (e: Error) => setLoiForm(e.message) });
  const xoa = useMutation({ mutationFn: (r: Dong) => adminFetch(`/bao-cao/bang/${key}/${r.id}${daXoa ? '/khoi-phuc' : ''}`, { method: daXoa ? 'POST' : 'DELETE' }),
    onSuccess: () => { toast.success(daXoa ? 'Đã khôi phục.' : 'Đã xoá. Xem lại ở "Dòng đã xoá" nếu cần khôi phục.'); lamMoi(); }, onError: (e: Error) => toast.error(e.message) });
  const kps = useMutation({ mutationFn: (co: boolean) => adminFetch('/bao-cao/khong-phat-sinh', { method: 'PUT', body: JSON.stringify({ kyId, xaPhuongId: xaLoc, bang: key, co }) }),
    onSuccess: () => lamMoi(), onError: (e: Error) => toast.error(e.message) });

  const tenXa = (id: number) => ch?.xaPhuong.find((x) => x.id === id)?.ten || '?';
  const cotHien = useMemo(() => { if (!cfg) return []; const c = cfg.truong.filter((t) => t.chinh || t.kieu === 'tinh'); return c.length ? c : cfg.truong.slice(0, 4); }, [cfg]);
  const loc = useMemo(() => { const q = tuKhoa.trim().toLowerCase(); if (!q || !cfg) return ds;
    return ds.filter((r) => [tenXa(r.xa_phuong_id), ...cfg.truong.map((t) => hienO(t, r[t.k]))].join(' ').toLowerCase().includes(q)); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [ds, tuKhoa, cfg, ch]);

  if (dangTai) return <p className="py-10 text-center text-slate-500">Đang tải…</p>;
  if (!cfg || !ch) return <The><p>Không có bảng này. <Link className="text-primary-600" to="/quan-tri/bao-cao">Về Báo cáo kỳ</Link></p></The>;

  const nopXa = nop?.ds.find((n) => n.xaPhuongId === xaLoc);
  const daChot = canKy && nopXa?.trangThai === 'da-chot';
  const khoa = canKy && !!ky?.khoa;
  const coKps = !!nopXa?.khongPhatSinh.includes(key);
  const chuaNhap = canKy && cfg.motDongMoiXa && nop ? nop.ds.filter((n) => !n.soDong[key] && !n.khongPhatSinh.includes(key) && n.trangThai !== 'da-chot') : [];
  const moForm = (r?: Dong, xa?: number) => {
    const gt: Record<string, unknown> = {};
    for (const t of cfg.truong) if (t.kieu !== 'tinh') gt[t.k] = r ? (t.kieu === 'co' ? !!r[t.k] : r[t.k] ?? '') : t.kieu === 'co' ? false : t.batBuoc && t.chon ? String(t.chon[0][0]) : '';
    setSua({ id: r?.id ?? null, xa: r?.xa_phuong_id ?? xa ?? xaLoc ?? 0, gt }); setLoiForm(''); setMoNhap(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const tong = cfg.truong.filter((t) => t.tong && cotHien.includes(t));

  return (<>
    <TieuDeQt tieuDe={`Bảng ${cfg.so}. ${cfg.ten}`} moTa={cfg.moTa} />
    <The className="mb-4">
      <div className="flex flex-wrap items-end gap-3">
        {canKy && <label className="w-full text-sm font-semibold sm:w-auto">Kỳ báo cáo<select className={o + ' sm:min-w-[220px]'} value={kyId ?? ''} onChange={(e) => { setKyId(Number(e.target.value)); nhoChon('ky', e.target.value); setSua(null); }}>
          {ch.ky.map((k) => <option key={k.id} value={k.id}>{k.ten}{k.khoa ? ' (đã khoá)' : ''}</option>)}</select></label>}
        <label className="w-full text-sm font-semibold sm:w-auto">Xã/phường<select className={o + ' sm:min-w-[200px]'} value={xaLoc} onChange={(e) => { setXaLoc(Number(e.target.value)); nhoChon('xa', e.target.value === '0' ? null : e.target.value); }}>
          <option value={0}>Tất cả</option>{ch.xaPhuong.filter((x) => x.hien).map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}</select></label>
        <label className="min-w-[180px] flex-1 text-sm font-semibold">Tìm<input className={o} type="search" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} placeholder="Tên, địa chỉ, quốc gia…" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={nutChinh} disabled={khoa || daChot || daXoa} onClick={() => moForm()}><Plus className="h-4 w-4" />Thêm dòng</button>
        <button type="button" className={nutVien + ' min-h-[44px] gap-1.5 px-3 text-sm'} onClick={() => adminTaiXuong(`/bao-cao/bang/${key}/mau${kyId ? `?ky=${kyId}` : ''}`, `mau-bang-${cfg.so}.xlsx`).catch((e: Error) => toast.error(e.message))}>
          <Download className="h-4 w-4" />Tải tệp mẫu Excel</button>
        <button type="button" className={nutVien + ' min-h-[44px] gap-1.5 px-3 text-sm'} disabled={khoa} onClick={() => { setMoNhap((m) => !m); setSua(null); }}><Upload className="h-4 w-4" />Nhập từ Excel</button>
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary-600" checked={daXoa} onChange={(e) => setDaXoa(e.target.checked)} />Xem dòng đã xoá</label>
      </div>
      {khoa && <div className={vangHop + ' mt-3 flex items-center gap-2'}><Lock className="h-4 w-4 shrink-0" />Kỳ "{ky?.ten}" đã khoá — chỉ xem, không sửa được. Mở khoá ở mục <Link className="font-bold underline" to="/quan-tri/bao-cao">Báo cáo kỳ</Link>.</div>}
      {!khoa && daChot && <div className={vangHop + ' mt-3 flex items-center gap-2'}><CheckCircle2 className="h-4 w-4 shrink-0" />{nopXa?.ten} đã chốt báo cáo kỳ này. Muốn sửa, bấm "Mở lại" ở mục <Link className="font-bold underline" to="/quan-tri/bao-cao">Báo cáo kỳ</Link>.</div>}
      {canKy && xaLoc > 0 && !khoa && !daChot && !ds.length && !daXoa && (
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-[18px] w-[18px] accent-primary-600" checked={coKps} disabled={kps.isPending} onChange={(e) => kps.mutate(e.target.checked)} />
          Xác nhận {nopXa?.ten} <b>không phát sinh</b> số liệu bảng này trong kỳ (khác với chưa nhập)</label>)}
      {chuaNhap.length > 0 && !xaLoc && !daXoa && <div className="mt-3 text-sm"><span className="text-slate-500">Chưa có số liệu kỳ này ({chuaNhap.length}): </span>
        {chuaNhap.map((n) => <button key={n.xaPhuongId} type="button" disabled={khoa} onClick={() => moForm(undefined, n.xaPhuongId)} className="m-0.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">+ {n.ten}</button>)}</div>}
    </The>

    {moNhap && <NhapExcel cfg={cfg} kyId={canKy ? kyId : null} xaLoc={xaLoc} onXong={() => { setMoNhap(false); lamMoi(); }} />}

    {sua && <div ref={formRef} style={{ scrollMarginTop: 90 }}><The className="mb-4">
      <h2 className="text-[17px] font-bold">{sua.id ? 'Sửa dòng' : 'Thêm dòng'}{canKy && ky ? ` — ${ky.ten}` : ''}</h2>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <label className={nhan}>Xã/phường <span className="text-red-600">*</span><select className={o} value={sua.xa} disabled={!!sua.id && canKy} onChange={(e) => setSua({ ...sua, xa: Number(e.target.value) })}>
          <option value={0}>— Chọn xã/phường —</option>{ch.xaPhuong.filter((x) => x.hien || x.id === sua.xa).map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}</select></label>
        {cfg.truong.filter((t) => t.kieu !== 'tinh').map((t) => (
          <div key={t.k} className={t.dong || (t.kieu === 'chu' && (t.max || 0) > 200) ? 'sm:col-span-2' : ''}>
            <ONhap t={t} gt={sua.gt[t.k]} onDoi={(v) => setSua({ ...sua, gt: { ...sua.gt, [t.k]: v } })} /></div>))}
      </div>
      {loiForm && <div className={loiHop}>{loiForm}</div>}
      <div className="mt-4 flex gap-2"><button type="button" className={nutChinh} disabled={luu.isPending || !sua.xa} onClick={() => luu.mutate()}>{luu.isPending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" className={nutVien + ' min-h-[44px] px-4 text-sm'} onClick={() => { setSua(null); setLoiForm(''); }}>Huỷ</button></div>
    </The></div>}

    <The>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-[17px] font-bold">{daXoa ? 'Dòng đã xoá' : 'Danh sách'} ({loc.length})</h2>
        {!daXoa && canKy && !cfg.motDongMoiXa && <small className="text-slate-500">Kỳ {ky?.ten}</small>}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-[13.5px]">
        <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
          {!xaLoc && <th className="py-2 pr-2">Xã/phường</th>}{cotHien.map((t) => <th key={t.k} className={`py-2 pr-2 ${['so', 'nguyen', 'tinh'].includes(t.kieu) ? 'text-right' : ''}`}>{t.nhan}</th>)}
          <th className="pr-2">Cập nhật</th><th></th></tr></thead>
        <tbody>
          {isLoading && <tr><td colSpan={9} className="py-6 text-center text-slate-500">Đang tải…</td></tr>}
          {loc.map((r) => <tr key={r.id} className="border-b border-slate-100 align-top dark:border-slate-800">
            {!xaLoc && <td className="py-2.5 pr-2">{tenXa(r.xa_phuong_id)}</td>}
            {cotHien.map((t) => <td key={t.k} className={`py-2.5 pr-2 ${['so', 'nguyen', 'tinh'].includes(t.kieu) ? 'text-right tabular-nums' : ''} ${t.kieu === 'tinh' ? 'font-bold' : ''}`}>{hienO(t, r[t.k])}</td>)}
            <td className="whitespace-nowrap py-2.5 pr-2 text-xs text-slate-500">{r.nguoi_sua || '—'}<br />{ngayVn(String(r.xoa_luc || r.updated_at))}</td>
            <td className="whitespace-nowrap py-2.5 text-right">
              {!daXoa && <button type="button" className={nutVien} disabled={khoa || (canKy && nop?.ds.find((n) => n.xaPhuongId === r.xa_phuong_id)?.trangThai === 'da-chot')} onClick={() => moForm(r)}>Sửa</button>}{' '}
              <button type="button" className={nutVien} onClick={() => setXemLs(r.id)} aria-label="Lịch sử"><History className="h-3.5 w-3.5" /></button>{' '}
              <button type="button" className={nutVien} disabled={khoa} onClick={() => (daXoa || window.confirm('Xoá dòng này? Dòng xoá vẫn khôi phục được.')) && xoa.mutate(r)}>{daXoa ? 'Khôi phục' : 'Xoá'}</button></td>
          </tr>)}
          {!isLoading && !loc.length && <tr><td colSpan={9} className="py-6 text-center text-slate-500">{daXoa ? 'Không có dòng nào đã xoá.' : 'Chưa có dòng nào. Bấm "Thêm dòng" hoặc nhập từ Excel.'}</td></tr>}
          {!daXoa && tong.length > 0 && loc.length > 1 && <tr className="bg-slate-50 font-bold dark:bg-slate-800/50">
            {!xaLoc && <td className="py-2.5 pr-2">Tổng cộng</td>}{cotHien.map((t, i) => <td key={t.k} className="py-2.5 pr-2 text-right tabular-nums">
              {t.tong ? hienO(t, loc.reduce((s, r) => s + Number(r[t.k] || 0), 0)) : (xaLoc && i === 0 ? 'Tổng cộng' : '')}</td>)}<td colSpan={2}></td></tr>}
        </tbody></table></div>
    </The>
    {xemLs !== null && <LichSu cfg={cfg} id={xemLs} onDong={() => setXemLs(null)} />}
    {!canKy && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><AlertTriangle className="h-3.5 w-3.5" />Đây là danh mục sống: sửa lúc nào cũng được, mọi thay đổi đều lưu lịch sử.</p>}
  </>);
}

