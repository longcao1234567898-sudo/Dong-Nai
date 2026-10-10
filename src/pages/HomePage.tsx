import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Map, BarChart3, MapPin, Star, Users, Activity, Search, Leaf, Landmark, Tent, BedDouble, UtensilsCrossed, Gift, AlertTriangle, CalendarDays, Phone, Route, Plus } from 'lucide-react';
import Canh from '../components/du-lich/Canh';
import Tranh from '../components/du-lich/Tranh';
import DemSo from '../components/du-lich/DemSo';
import BanDo from '../components/du-lich/BanDo';
import ChiTiet from '../components/du-lich/ChiTiet';
import { layDiaDiem, layThongKe, layLoTrinh, layTinTuc, anhUrl } from '../services/api';
import { LOAI, giamChuyenDong } from '../utils/hangSo';
import { useNN } from '../i18n/NgonNgu';
import { useHienDan } from '../hooks/useHienDan';
import type { Loai } from '../utils/kieu';

const IC_LOAI: Record<Loai, typeof Leaf> = { 'thien-nhien': Leaf, 'di-tich': Landmark, 'vui-choi': Tent, 'luu-tru': BedDouble, 'am-thuc': UtensilsCrossed, 'dac-san': Gift };
const DauMuc = ({ tieuDe, moTa }: { tieuDe: string; moTa: string }) => (
  <div className="mb-5"><h2 className="text-2xl font-extrabold">{tieuDe}</h2><p className="mt-1 text-sm text-slate-500">{moTa}</p></div>);

export default function HomePage() {
  const { t, nn, chon: dich, ngay } = useNN();   // dich: lấy bản tiếng Anh nếu có
  const { data: ds = [], isLoading, isError, error } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const { data: loTrinh = [] } = useQuery({ queryKey: ['lo-trinh'], queryFn: layLoTrinh });
  const { data: tin = [] } = useQuery({ queryKey: ['tin-tuc'], queryFn: layTinTuc });
  const canhBao = tin.filter((x) => x.loai === 'canh-bao');
  const suKien = tin.filter((x) => x.loai === 'su-kien' || x.loai === 'thong-bao').slice(0, 3);
  const lienHe = tin.filter((x) => x.loai === 'lien-he');
  const tenLoai = (k: Loai) => (nn === 'en' ? LOAI[k]?.en : LOAI[k]?.ten);
  const nam = String(new Date().getFullYear());
  const { data: tk } = useQuery({ queryKey: ['thong-ke', nam], queryFn: () => layThongKe(nam) });
  const [loai, setLoai] = useState<Loai | null>(null);
  const [tuKhoa, setTuKhoa] = useState('');
  const [chon, setChon] = useState<string | null>(null);
  const [tam, setTam] = useState<[number, number] | null>(null);
  const [tuyen, setTuyen] = useState<number | null>(null);   // mã lộ trình đang vẽ trên bản đồ
  const khuBanDo = useRef<HTMLElement>(null);
  /* Theo dõi lại khi tin tức, lộ trình tải xong: các khối đó mới xuất hiện SAU lần
     theo dõi đầu, không theo dõi lại thì chúng ẩn mãi (lớp hien-dan bắt đầu ở độ mờ 0). */
  useHienDan([isLoading, tin.length, loTrinh.length]);

  const cuonToiBanDo = () => khuBanDo.current?.scrollIntoView({ behavior: giamChuyenDong() ? 'auto' : 'smooth' });
  const loc = useMemo(() => { const q = tuKhoa.trim().toLowerCase();
    return ds.filter((p) => (!loai || p.loai === loai) && (!q || p.ten.toLowerCase().includes(q) || (p.tenEn || '').toLowerCase().includes(q) || (p.diaChi || '').toLowerCase().includes(q))); }, [ds, loai, tuKhoa]);
  const dem = useMemo(() => ds.reduce<Record<string, number>>((a, p) => ({ ...a, [p.loai]: (a[p.loai] || 0) + 1 }), {}), [ds]);
  const dg = ds.reduce((s, p) => s + p.soDanhGia, 0);
  const saoChung = dg ? ds.reduce((s, p) => s + (p.saoTb || 0) * p.soDanhGia, 0) / dg : null;
  const khachNam = (tk?.thang || []).reduce((s, t) => s + t.noiDia + t.quocTe, 0);
  const xepHang = [...ds].filter((p) => p.soDanhGia && p.saoTb !== null).sort((a, b) => (b.saoTb! - a.saoTb!) || b.soDanhGia - a.soDanhGia).slice(0, 8);
  const diemTuyen = tuyen !== null ? (loTrinh.find((l) => l.id === tuyen)?.diem || []).map((d) => ds.find((p) => p.id === d.id)).filter((p): p is NonNullable<typeof p> => !!p) : [];
  const moDiem = (id: string) => { const p = ds.find((x) => x.id === id); if (p) setTam([p.lat, p.lng]); setChon(id); };
  const pChon = ds.find((p) => p.id === chon);

  return (
    <div className="animate-page">
      {/* ---------- Cảnh báo đang có hiệu lực (do cán bộ đăng) ---------- */}
      {canhBao.map((c) => <div key={c.id} role="alert" className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
        <div className="container-page flex items-start gap-2 py-2.5 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>{dich(c.tieuDe, c.tieuDeEn)}</b>{dich(c.noiDung, c.noiDungEn) && <> — {dich(c.noiDung, c.noiDungEn)}</>}</span></div></div>)}
      {/* ---------- Mở đầu ---------- */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,theme(colors.primary.50),transparent_70%)] pb-40 pt-12 text-center dark:bg-none">
        <Canh />
        <div className="container-page relative z-10">
          <h1 className="text-gradient text-4xl font-extrabold tracking-tight sm:text-6xl">{t('heroTieuDe')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">{t('heroMoTa')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={cuonToiBanDo} className="btn-shine animate-glow flex min-w-[220px] items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 text-left text-white shadow-soft transition-transform hover:-translate-y-0.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><Map className="h-5 w-5" /></span><span><b className="block">{t('khamPhaBanDo')}</b><small className="text-xs opacity-85">{ds.length} {t('diemDen')}</small></span></button>
            <Link to="/thong-ke" className="flex min-w-[220px] items-center gap-3 rounded-2xl bg-gradient-to-r from-secondary-500 to-secondary-600 px-6 py-3 text-left text-white shadow-soft transition-transform hover:-translate-y-0.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><BarChart3 className="h-5 w-5" /></span><span><b className="block">{t('xemThongKe')}</b><small className="text-xs opacity-85">{t('luotKhachVaDanhGia')}</small></span></Link>
          </div>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {[{ ic: MapPin, gt: <DemSo gt={ds.length} />, nhan: t('diemDen'), nen: 'bg-primary-100 text-primary-600' },
              { ic: Star, gt: saoChung ? saoChung.toFixed(1) : '–', nhan: t('saoTrungBinh'), nen: 'bg-amber-100 text-amber-600' },
              { ic: Users, gt: <DemSo gt={dg} />, nhan: t('danhGiaCuaDuKhach'), nen: 'bg-blue-100 text-secondary-500' },
              { ic: Activity, gt: <DemSo gt={khachNam} />, nhan: t('luotKhachNam', { nam }), nen: 'bg-primary-100 text-primary-600' }].map((c, i) => (
              <div key={i} className="card-lift flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-soft dark:bg-slate-900">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.nen}`}><c.ic className="h-5 w-5" /></span>
                <span><b className="block text-lg font-extrabold">{c.gt}</b><small className="text-xs leading-tight text-slate-500">{c.nhan}</small></span></div>))}
          </div>
        </div>
      </section>

      {isError && <div className="container-page pt-10"><div className="mx-auto max-w-xl rounded-2xl bg-amber-50 px-5 py-4 text-center text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
        <b className="block">{t('chuaTaiDuoc')}</b>{(error as Error)?.message}</div></div>}

      {/* ---------- Sự kiện, thông báo ---------- */}
      {suKien.length > 0 && <section className="hien-dan container-page pt-12">
        <DauMuc tieuDe={t('tinTuc')} moTa={t('tinTucMoTa')} />
        <div className="grid gap-3 md:grid-cols-3">{suKien.map((x) => (
          <Link key={x.id} to="/tin-tuc" className="card-lift rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center gap-1.5 text-xs font-bold text-secondary-500"><CalendarDays className="h-3.5 w-3.5" />
              {x.loai === 'su-kien' ? t('suKien') : t('thongBao')}{x.tuNgay ? ` · ${ngay(x.tuNgay)}` : ''}{x.denNgay && x.denNgay !== x.tuNgay ? ` – ${ngay(x.denNgay)}` : ''}</span>
            <b className="mt-1 block">{dich(x.tieuDe, x.tieuDeEn)}</b>
            {dich(x.noiDung, x.noiDungEn) && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{dich(x.noiDung, x.noiDungEn)}</p>}</Link>))}</div>
      </section>}

      {/* ---------- Nổi bật ---------- */}
      <section className="hien-dan container-page pt-12">
        <DauMuc tieuDe={t('noiBat')} moTa={t('noiBatMoTa')} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {isLoading ? [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />) :
            ds.filter((p) => p.noiBat).slice(0, 8).map((p) => (
              <button key={p.id} type="button" onClick={() => moDiem(p.id)} className="card-lift overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-soft dark:border-slate-800 dark:bg-slate-900">
                {p.anh?.[0] ? <img src={anhUrl(p.anh[0].id)} alt="" loading="lazy" className="block h-36 w-full object-cover" /> : <Tranh loai={p.loai} />}
                <span className="block p-4"><small className="text-xs text-slate-500">{tenLoai(p.loai)}</small><b className="block">{dich(p.ten, p.tenEn)}</b>
                  <span className="text-sm font-bold text-amber-600">{p.saoTb ? <>★ {p.saoTb.toFixed(1)} <small className="font-medium text-slate-400">({p.soDanhGia} {t('danhGia')})</small></> : <small className="font-medium text-slate-400">{t('chuaCoDanhGia')}</small>}</span></span>
              </button>))}
        </div>
      </section>

      {/* ---------- Chủ đề ---------- */}
      <section className="hien-dan container-page pt-12">
        <DauMuc tieuDe={t('chuDe')} moTa={t('chuDeMoTa')} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-3">
          {(Object.keys(LOAI) as Loai[]).filter((k) => dem[k]).map((k) => { const Ic = IC_LOAI[k]; return (
            <button key={k} type="button" onClick={() => { setLoai(k); cuonToiBanDo(); }} className="card-lift flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900">
              <span className="icon-pop grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: LOAI[k].mau }}><Ic className="h-5 w-5" /></span>
              <b className="text-sm">{tenLoai(k)}</b><small className="text-xs text-slate-500">{dem[k]} {t('diemDen')}</small></button>); })}
        </div>
      </section>

      {/* ---------- Bản đồ ---------- */}
      <section ref={khuBanDo} className="hien-dan container-page pt-12" style={{ scrollMarginTop: 80 }}>
        <DauMuc tieuDe={t('banDo')} moTa={t('banDoMoTa')} />
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <BanDo ds={loc} tuyen={diemTuyen} tam={tam} onChon={moDiem} />
          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('chuDe')}>
              {[null, ...(Object.keys(LOAI) as Loai[]).filter((k) => dem[k])].map((k) => (
                <button key={k || 'tat-ca'} type="button" aria-pressed={loai === k} onClick={() => setLoai(k)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold ${loai === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                  {k && <span className="h-2 w-2 rounded-full" style={{ background: LOAI[k].mau }} />}{k ? tenLoai(k) : t('tatCa')}</button>))}
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-primary-500 dark:border-slate-700">
              <Search className="h-4 w-4 text-slate-400" /><input type="search" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} placeholder={t('timDiaDiem')}
                aria-label={t('timDiaDiem')} className="min-h-[42px] w-full bg-transparent text-sm outline-none" /></label>
            <ul className="max-h-[470px] divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
              {loc.map((p) => <li key={p.id}><button type="button" onClick={() => moDiem(p.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-xl px-2 py-2.5 text-left hover:bg-primary-50 dark:hover:bg-slate-800">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: LOAI[p.loai]?.mau }} />
                <span className="min-w-0"><b className="block text-sm font-semibold">{dich(p.ten, p.tenEn)}</b><small className="text-xs text-slate-500">{p.diaChi}</small></span>
                <span className="whitespace-nowrap text-[13px] font-bold text-amber-600">{p.saoTb ? <>★ {p.saoTb.toFixed(1)} <small className="text-slate-400">({p.soDanhGia})</small></> : <small className="font-medium text-slate-400">{t('chuaCoDanhGia')}</small>}</span>
              </button></li>)}
              {!isLoading && !loc.length && <li className="py-6 text-center text-sm text-slate-500">{t('khongKhop')}</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Lộ trình (cán bộ quản lý trong cơ sở dữ liệu) ---------- */}
      <section className="hien-dan container-page pt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-2xl font-extrabold">{t('goiYLoTrinh')}</h2><p className="mt-1 text-sm text-slate-500">{t('goiYLoTrinhMoTa')}</p></div>
          <Link to="/tu-tao-lo-trinh" className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border-2 border-secondary-500 px-4 text-sm font-bold text-secondary-500 hover:bg-blue-50 dark:hover:bg-slate-800"><Plus className="h-4 w-4" />{t('tuTaoLoTrinh')}</Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {loTrinh.map((lt) => (
            <div key={lt.id} className={`card-lift flex flex-col rounded-2xl border-[1.5px] bg-white p-5 shadow-soft dark:bg-slate-900 ${tuyen === lt.id ? 'border-secondary-500' : 'border-slate-200 dark:border-slate-800'}`}>
              <span className="flex items-center justify-between gap-2"><b>{dich(lt.ten, lt.tenEn)}</b>{lt.thoiGian && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-secondary-500">{lt.thoiGian}</span>}</span>
              {dich(lt.moTa, lt.moTaEn) && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{dich(lt.moTa, lt.moTaEn)}</p>}
              <ol className="mt-3 flex-1 space-y-1.5">{lt.diem.map((d) => ds.find((p) => p.id === d.id)).filter(Boolean).map((p, k) => (
                <li key={p!.id} className="flex items-center gap-2.5 text-sm"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-700">{k + 1}</span>{dich(p!.ten, p!.tenEn)}</li>))}</ol>
              <div className="mt-4 flex gap-2">
                <Link to={`/lo-trinh/${lt.id}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-secondary-500 px-4 text-sm font-bold text-white hover:opacity-90"><Route className="h-4 w-4" />{t('loTrinh')}</Link>
                <button type="button" aria-pressed={tuyen === lt.id} onClick={() => { setTuyen(tuyen === lt.id ? null : lt.id); if (tuyen !== lt.id) cuonToiBanDo(); }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-slate-700"><Map className="h-4 w-4" />{t('banDo')}</button>
              </div>
            </div>))}
        </div>
      </section>

      {/* ---------- Xếp hạng ---------- */}
      <section className="hien-dan container-page pb-12 pt-12">
        <DauMuc tieuDe={t('xepHang')} moTa={t('xepHangMoTa')} />
        <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-3 shadow-soft dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {xepHang.map((p, i) => <li key={p.id}><button type="button" onClick={() => moDiem(p.id)}
            className="grid w-full grid-cols-[32px_1fr_52px] items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-primary-50 sm:grid-cols-[32px_1fr_170px_52px] dark:hover:bg-slate-800">
            <span className={`text-center font-extrabold ${['text-amber-600', 'text-slate-500', 'text-amber-800'][i] || 'text-slate-400'}`}>{i + 1}</span>
            <span><b className="block text-sm">{dich(p.ten, p.tenEn)}</b><small className="text-xs text-slate-500">{p.soDanhGia} {t('danhGia')}</small></span>
            <span className="hidden h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:block"><span className="thanh-mo block h-full rounded-full bg-gradient-to-r from-accent-500 to-amber-600" style={{ width: `${(p.saoTb! / 5) * 100}%` }} /></span>
            <span className="text-right font-extrabold text-amber-600">{p.saoTb!.toFixed(1)}</span></button></li>)}
          {!xepHang.length && <li className="py-6 text-center text-sm text-slate-500">{t('chuaXepHang')}</li>}
        </ol>
      </section>

      {/* ---------- Số điện thoại cần biết ---------- */}
      {lienHe.length > 0 && <section className="hien-dan container-page pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><Phone className="h-5 w-5" />{t('soCanBiet')}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{lienHe.map((x) => (
            <a key={x.id} href={`tel:${String(x.noiDung || '').replace(/[^0-9+]/g, '')}`} className="rounded-xl bg-slate-50 px-3 py-2.5 hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-slate-700">
              <b className="block text-xl font-extrabold text-primary-700 dark:text-primary-400">{x.noiDung}</b><small className="text-xs text-slate-600 dark:text-slate-300">{dich(x.tieuDe, x.tieuDeEn)}</small></a>))}</div>
          <p className="mt-3 text-sm"><Link to="/khach-quoc-te" className="font-semibold text-primary-600">{t('khachQuocTe')} →</Link></p>
        </div>
      </section>}

      {pChon && <ChiTiet p={pChon} onDong={() => setChon(null)} />}
    </div>
  );
}
