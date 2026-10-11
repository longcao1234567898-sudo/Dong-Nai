/** Khối "Đánh giá của du khách": tổng hợp thật từ máy chủ + nhận xét mới nhất. Không có đánh giá thì nói thẳng. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PenLine, X } from 'lucide-react';
import { HienSao, TieuDeKhoi } from '../du-lich/GiaoDien';
import { layDanhGiaMoiNhat } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';
import { TIEU_CHI, DI_CUNG } from '../../utils/hangSo';
import { cheDoMinhHoa, napMinhHoa } from '../../minh-hoa/cheDo';
import type { DanhGiaMoi, DiaDiem, ThongKe, TieuChi } from '../../utils/kieu';

type TongHop = { so: number; saoTb: number | null; tieuChi: TieuChi; phanBo: number[] };   // phanBo: [1..5] sao

function TheNhanXet({ x }: { x: DanhGiaMoi }) {
  const { t, nn, chon } = useNN();
  const [mo, setMo] = useState(false);
  const dai = x.nhanXet.length > 180;
  const meta = [x.ten || t('anDanh'), x.diCung && DI_CUNG[x.diCung] ? DI_CUNG[x.diCung][nn === 'en' ? 1 : 0] : null,
    x.thoiDiem && /^\d{4}-\d{2}$/.test(x.thoiDiem) ? `${Number(x.thoiDiem.slice(5))}/${x.thoiDiem.slice(0, 4)}` : null].filter(Boolean).join(', ');
  return (
    <article className="the relative flex h-full flex-col p-5">
      {x.minhHoa && <span className="absolute right-4 top-4 rounded-full bg-[#FCEFC7] px-2 py-0.5 text-[11px] font-semibold text-[#192522]">Minh hoạ</span>}
      <HienSao gt={x.sao} co={15} />
      <Link to={`/dia-diem/${x.diaDiemId}`} className="mt-2 w-fit text-[13px] font-semibold text-action underline-offset-2 hover:underline">{chon(x.tenDiem, x.tenDiemEn)}</Link>
      <p className={`mt-2 flex-1 whitespace-pre-line text-[15.5px] leading-relaxed ${dai && !mo ? 'line-clamp-4' : ''}`}>{x.nhanXet}</p>
      {dai && <button type="button" onClick={() => setMo((m) => !m)} className="mt-1 w-fit text-sm font-semibold text-action">{mo ? t('anBot') : t('xemThem')}</button>}
      <p className="mt-4 border-t border-line/70 pt-3 text-[13px] text-muted">{meta}</p>
    </article>);
}

function ChonDiem({ ds, onChon, onDong }: { ds: DiaDiem[]; onChon: (id: string) => void; onDong: () => void }) {
  const { t, chon } = useNN();
  const dong = useRef<HTMLButtonElement>(null);
  useEffect(() => { dong.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && onDong(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onDong]);
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-[#0C2925]/60 md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="chon-diem-dg"
      onClick={(e) => e.target === e.currentTarget && onDong()}>
      <div className="animate-page the max-h-[80vh] w-full max-w-lg overflow-auto rounded-b-none p-6 md:rounded-b-[16px]">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 id="chon-diem-dg" className="tieu-de-vua">{t('chonDiemDanhGia')}</h2>
          <button ref={dong} type="button" onClick={onDong} aria-label={t('dong')} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-sunken"><X className="h-5 w-5" /></button></div>
        <ul className="-mx-2">{ds.map((p) => (
          <li key={p.id}><button type="button" onClick={() => onChon(p.id)} className="flex w-full items-baseline justify-between gap-3 rounded-xl px-2 py-3 text-left hover:bg-sunken">
            <span className="font-medium">{chon(p.ten, p.tenEn)}</span><span className="shrink-0 text-[13px] text-muted">{p.xa || ''}</span></button></li>))}</ul>
      </div>
    </div>);
}

export default function DanhGiaKhach({ ds, tk, onViet }: { ds: DiaDiem[]; tk: ThongKe | undefined; onViet: (id: string) => void }) {
  const { t, nn } = useNN();
  const [chonDiem, setChonDiem] = useState(false);
  const { data: moi = [] } = useQuery({ queryKey: ['danh-gia-moi'], queryFn: () => layDanhGiaMoiNhat(6) });
  const { data: minhHoa } = useQuery({ queryKey: ['minh-hoa'], queryFn: napMinhHoa, enabled: cheDoMinhHoa, staleTime: Infinity });

  /* Chế độ minh hoạ: cả khối dùng dữ liệu minh hoạ (không trộn với thật), tổng hợp tính lại từ chính nó. */
  const dg: TongHop | null = minhHoa ? (() => {
    const ds2 = minhHoa.danhGia, tb = (f: (x: (typeof ds2)[number]) => number) => ds2.reduce((s, x) => s + f(x), 0) / ds2.length;
    return { so: ds2.length, saoTb: tb((x) => x.sao), phanBo: [1, 2, 3, 4, 5].map((n) => ds2.filter((x) => x.sao === n).length),
      tieuChi: { canhQuan: tb((x) => x.tieuChi.canhQuan || 0), dichVu: tb((x) => x.tieuChi.dichVu || 0), veSinh: tb((x) => x.tieuChi.veSinh || 0), giaCa: tb((x) => x.tieuChi.giaCa || 0) } };
  })() : tk?.danhGia || null;
  const the = minhHoa ? minhHoa.danhGia.filter((x) => x.nhanXet).slice(0, 6) : moi;
  const so = (n: number, le = 1) => n.toLocaleString(nn === 'en' ? 'en' : 'vi', { minimumFractionDigits: le, maximumFractionDigits: le });
  const nutViet = <button type="button" className="nut nut-chinh" onClick={() => setChonDiem(true)}><PenLine className="h-4 w-4" />{t('vietDanhGia')}</button>;

  return (
    <section id="danh-gia" className="border-t border-line/60 bg-sunken/50 py-20 sm:py-28">
      <div className="container-page">
        <TieuDeKhoi tieuDe={t('danhGiaTieuDe')} moTa={t('danhGiaMoTa')} />
        {!dg || !dg.so ? (
          <div className="hien-dan the flex flex-wrap items-center justify-between gap-5 p-7 sm:p-9">
            <div className="max-w-xl"><p className="tieu-de-vua">{t('danhGiaTrong')}</p>
              <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{t('danhGiaTrongMoi', { n: ds.length })}</p></div>
            {nutViet}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <aside className="hien-dan lg:col-span-4">
              <div className="the p-6 lg:sticky lg:top-24">
                <div className="flex items-end gap-4">
                  <b className="so-lon">{dg.saoTb !== null ? so(dg.saoTb) : '–'}</b>
                  <span className="pb-1"><HienSao gt={dg.saoTb || 0} co={20} /><span className="mt-1 block text-sm text-muted">{dg.so} {t('danhGia')}</span></span>
                </div>
                <ul className="mt-6 space-y-2">{[5, 4, 3, 2, 1].map((n, i) => { const c = dg.phanBo[n - 1] || 0; return (
                  <li key={n} className="grid grid-cols-[2.2rem_1fr_2rem] items-center gap-3 text-sm" role="img" aria-label={`${n} ${t('sao')}: ${c} ${t('danhGia')}`}>
                    <span className="text-ink-2">{n} ★</span>
                    <span className="h-2 overflow-hidden rounded-full bg-line/70"><span className="thanh-sao block h-full rounded-full bg-gold" style={{ width: `${(c / dg.so) * 100}%`, '--i': i } as CSSProperties} /></span>
                    <span className="text-right tabular-nums text-muted">{c}</span></li>); })}</ul>
                {TIEU_CHI.some(([k]) => dg.tieuChi[k]) && <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line/70 pt-5 text-sm">
                  {TIEU_CHI.filter(([k]) => dg.tieuChi[k]).map(([k, vi, en]) => (
                    <div key={k} className="flex items-baseline justify-between gap-2"><dt className="text-ink-2">{nn === 'en' ? en : vi}</dt><dd className="font-semibold tabular-nums">{so(Number(dg.tieuChi[k]))}</dd></div>))}
                </dl>}
                <div className="mt-6">{nutViet}</div>
              </div>
            </aside>
            <div className="lg:col-span-8">
              {the.length > 0 && <h3 className="hien-dan mb-4 text-sm font-semibold text-ink-2">{t('nhanXetMoi')}</h3>}
              <div className="grid gap-4 sm:grid-cols-2">{the.map((x, i) => <div key={x.id} className="hien-dan" style={{ '--i': i % 2 } as CSSProperties}><TheNhanXet x={x} /></div>)}</div>
            </div>
          </div>)}
      </div>
      {chonDiem && <ChonDiem ds={ds} onDong={() => setChonDiem(false)} onChon={(id) => { setChonDiem(false); onViet(id); }} />}
    </section>);
}
