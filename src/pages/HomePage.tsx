import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Map, BarChart3, MapPin, Star, Users, Activity, Search, Leaf, Landmark, Tent, BedDouble, UtensilsCrossed, Gift } from 'lucide-react';
import Canh from '../components/du-lich/Canh';
import Tranh from '../components/du-lich/Tranh';
import DemSo from '../components/du-lich/DemSo';
import BanDo from '../components/du-lich/BanDo';
import ChiTiet from '../components/du-lich/ChiTiet';
import { layDiaDiem, layThongKe } from '../services/api';
import { LOAI, LICH_TRINH, giamChuyenDong } from '../utils/hangSo';
import { useHienDan } from '../hooks/useHienDan';
import type { Loai } from '../utils/kieu';

const IC_LOAI: Record<Loai, typeof Leaf> = { 'thien-nhien': Leaf, 'di-tich': Landmark, 'vui-choi': Tent, 'luu-tru': BedDouble, 'am-thuc': UtensilsCrossed, 'dac-san': Gift };
const DauMuc = ({ tieuDe, moTa }: { tieuDe: string; moTa: string }) => (
  <div className="mb-5"><h2 className="text-2xl font-extrabold">{tieuDe}</h2><p className="mt-1 text-sm text-slate-500">{moTa}</p></div>);

export default function HomePage() {
  const { data: ds = [], isLoading, isError } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const nam = String(new Date().getFullYear());
  const { data: tk } = useQuery({ queryKey: ['thong-ke', nam], queryFn: () => layThongKe(nam) });
  const [loai, setLoai] = useState<Loai | null>(null);
  const [tuKhoa, setTuKhoa] = useState('');
  const [chon, setChon] = useState<string | null>(null);
  const [tam, setTam] = useState<[number, number] | null>(null);
  const [tuyen, setTuyen] = useState<number | null>(null);
  const khuBanDo = useRef<HTMLElement>(null);
  useHienDan([isLoading]);

  const cuonToiBanDo = () => khuBanDo.current?.scrollIntoView({ behavior: giamChuyenDong() ? 'auto' : 'smooth' });
  const loc = useMemo(() => { const q = tuKhoa.trim().toLowerCase();
    return ds.filter((p) => (!loai || p.loai === loai) && (!q || p.ten.toLowerCase().includes(q) || (p.diaChi || '').toLowerCase().includes(q))); }, [ds, loai, tuKhoa]);
  const dem = useMemo(() => ds.reduce<Record<string, number>>((a, p) => ({ ...a, [p.loai]: (a[p.loai] || 0) + 1 }), {}), [ds]);
  const dg = ds.reduce((s, p) => s + p.soDanhGia, 0);
  const saoChung = dg ? ds.reduce((s, p) => s + (p.saoTb || 0) * p.soDanhGia, 0) / dg : null;
  const khachNam = (tk?.thang || []).reduce((s, t) => s + t.noiDia + t.quocTe, 0);
  const xepHang = [...ds].filter((p) => p.soDanhGia && p.saoTb !== null).sort((a, b) => (b.saoTb! - a.saoTb!) || b.soDanhGia - a.soDanhGia).slice(0, 8);
  const diemTuyen = tuyen !== null ? LICH_TRINH[tuyen].ids.map((id) => ds.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p) : [];
  const moDiem = (id: string) => { const p = ds.find((x) => x.id === id); if (p) setTam([p.lat, p.lng]); setChon(id); };
  const pChon = ds.find((p) => p.id === chon);

  return (
    <div className="animate-page">
      {/* ---------- Mở đầu ---------- */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,theme(colors.primary.50),transparent_70%)] pb-40 pt-12 text-center dark:bg-none">
        <Canh />
        <div className="container-page relative z-10">
          <h1 className="text-gradient text-4xl font-extrabold tracking-tight sm:text-6xl">DU LỊCH ĐỒNG NAI</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">Rừng nguyên sinh, hồ lớn, thác nước và những di tích bên dòng sông Đồng Nai — tra cứu, chỉ đường và xem đánh giá của du khách.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={cuonToiBanDo} className="btn-shine animate-glow flex min-w-[220px] items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 text-left text-white shadow-soft transition-transform hover:-translate-y-0.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><Map className="h-5 w-5" /></span><span><b className="block">Khám phá bản đồ</b><small className="text-xs opacity-85">{ds.length} điểm đến</small></span></button>
            <Link to="/thong-ke" className="flex min-w-[220px] items-center gap-3 rounded-2xl bg-gradient-to-r from-secondary-500 to-secondary-600 px-6 py-3 text-left text-white shadow-soft transition-transform hover:-translate-y-0.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><BarChart3 className="h-5 w-5" /></span><span><b className="block">Xem thống kê</b><small className="text-xs opacity-85">Lượt khách và đánh giá</small></span></Link>
          </div>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {[{ ic: MapPin, gt: <DemSo gt={ds.length} />, nhan: 'điểm đến', nen: 'bg-primary-100 text-primary-600' },
              { ic: Star, gt: saoChung ? saoChung.toFixed(1) : '–', nhan: 'sao trung bình', nen: 'bg-amber-100 text-amber-600' },
              { ic: Users, gt: <DemSo gt={dg} />, nhan: 'đánh giá của du khách', nen: 'bg-blue-100 text-secondary-500' },
              { ic: Activity, gt: <DemSo gt={khachNam} />, nhan: `lượt khách năm ${nam}`, nen: 'bg-primary-100 text-primary-600' }].map((c, i) => (
              <div key={i} className="card-lift flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-soft dark:bg-slate-900">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.nen}`}><c.ic className="h-5 w-5" /></span>
                <span><b className="block text-lg font-extrabold">{c.gt}</b><small className="text-xs leading-tight text-slate-500">{c.nhan}</small></span></div>))}
          </div>
        </div>
      </section>

      {isError && <p className="container-page py-10 text-center text-slate-500">Chưa tải được dữ liệu. Kiểm tra kết nối rồi tải lại trang.</p>}

      {/* ---------- Nổi bật ---------- */}
      <section className="hien-dan container-page pt-12">
        <DauMuc tieuDe="Điểm đến nổi bật" moTa="Những nơi được giới thiệu nhiều nhất." />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {isLoading ? [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />) :
            ds.filter((p) => p.noiBat).slice(0, 8).map((p) => (
              <button key={p.id} type="button" onClick={() => moDiem(p.id)} className="card-lift overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <Tranh loai={p.loai} />
                <span className="block p-4"><small className="text-xs text-slate-500">{LOAI[p.loai]?.ten}</small><b className="block">{p.ten}</b>
                  <span className="text-sm font-bold text-amber-600">{p.saoTb ? <>★ {p.saoTb.toFixed(1)} <small className="font-medium text-slate-400">({p.soDanhGia} đánh giá)</small></> : <small className="font-medium text-slate-400">Chưa có đánh giá</small>}</span></span>
              </button>))}
        </div>
      </section>

      {/* ---------- Chủ đề ---------- */}
      <section className="hien-dan container-page pt-12">
        <DauMuc tieuDe="Khám phá theo chủ đề" moTa="Chọn một chủ đề, bản đồ bên dưới sẽ lọc theo." />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-3">
          {(Object.keys(LOAI) as Loai[]).filter((k) => dem[k]).map((k) => { const Ic = IC_LOAI[k]; return (
            <button key={k} type="button" onClick={() => { setLoai(k); cuonToiBanDo(); }} className="card-lift flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900">
              <span className="icon-pop grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: LOAI[k].mau }}><Ic className="h-5 w-5" /></span>
              <b className="text-sm">{LOAI[k].ten}</b><small className="text-xs text-slate-500">{dem[k]} điểm đến</small></button>); })}
        </div>
      </section>

      {/* ---------- Bản đồ ---------- */}
      <section ref={khuBanDo} className="hien-dan container-page pt-12" style={{ scrollMarginTop: 80 }}>
        <DauMuc tieuDe="Bản đồ điểm đến" moTa="Bấm vào một điểm để xem chi tiết và đánh giá. Điểm có vòng sáng là điểm nổi bật." />
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <BanDo ds={loc} tuyen={diemTuyen} tam={tam} onChon={moDiem} />
          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo loại">
              {[null, ...(Object.keys(LOAI) as Loai[]).filter((k) => dem[k])].map((k) => (
                <button key={k || 'tat-ca'} type="button" aria-pressed={loai === k} onClick={() => setLoai(k)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold ${loai === k ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                  {k && <span className="h-2 w-2 rounded-full" style={{ background: LOAI[k].mau }} />}{k ? LOAI[k].ten : 'Tất cả'}</button>))}
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-primary-500 dark:border-slate-700">
              <Search className="h-4 w-4 text-slate-400" /><input type="search" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} placeholder="Tìm theo tên hoặc địa chỉ"
                aria-label="Tìm địa điểm" className="min-h-[42px] w-full bg-transparent text-sm outline-none" /></label>
            <ul className="max-h-[470px] divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
              {loc.map((p) => <li key={p.id}><button type="button" onClick={() => moDiem(p.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-xl px-2 py-2.5 text-left hover:bg-primary-50 dark:hover:bg-slate-800">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: LOAI[p.loai]?.mau }} />
                <span className="min-w-0"><b className="block text-sm font-semibold">{p.ten}</b><small className="text-xs text-slate-500">{p.diaChi}</small></span>
                <span className="whitespace-nowrap text-[13px] font-bold text-amber-600">{p.saoTb ? <>★ {p.saoTb.toFixed(1)} <small className="text-slate-400">({p.soDanhGia})</small></> : <small className="font-medium text-slate-400">Chưa có đánh giá</small>}</span>
              </button></li>)}
              {!isLoading && !loc.length && <li className="py-6 text-center text-sm text-slate-500">Không có địa điểm nào khớp. Thử bỏ bớt bộ lọc.</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Lịch trình ---------- */}
      <section className="hien-dan container-page pt-12">
        <DauMuc tieuDe="Gợi ý lịch trình" moTa="Bấm vào một lịch trình, bản đồ sẽ vẽ tuyến đi qua các điểm." />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {LICH_TRINH.map((t, i) => (
            <button key={i} type="button" aria-pressed={tuyen === i} onClick={() => { setTuyen(tuyen === i ? null : i); if (tuyen !== i) cuonToiBanDo(); }}
              className={`card-lift rounded-2xl border-[1.5px] bg-white p-5 text-left shadow-soft dark:bg-slate-900 ${tuyen === i ? 'border-secondary-500' : 'border-slate-200 dark:border-slate-800'}`}>
              <span className="flex items-center justify-between gap-2"><b>{t.ten}</b><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-secondary-500">{t.tg}</span></span>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.mo}</p>
              <ol className="mt-3 space-y-1.5">{t.ids.map((id) => ds.find((p) => p.id === id)).filter(Boolean).map((p, k) => (
                <li key={p!.id} className="flex items-center gap-2.5 text-sm"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-700">{k + 1}</span>{p!.ten}</li>))}</ol>
            </button>))}
        </div>
      </section>

      {/* ---------- Xếp hạng ---------- */}
      <section className="hien-dan container-page pb-16 pt-12">
        <DauMuc tieuDe="Được du khách chấm cao nhất" moTa="Xếp theo số sao trung bình, chỉ tính các điểm đã có đánh giá." />
        <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-3 shadow-soft dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {xepHang.map((p, i) => <li key={p.id}><button type="button" onClick={() => moDiem(p.id)}
            className="grid w-full grid-cols-[32px_1fr_52px] items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-primary-50 sm:grid-cols-[32px_1fr_170px_52px] dark:hover:bg-slate-800">
            <span className={`text-center font-extrabold ${['text-amber-600', 'text-slate-500', 'text-amber-800'][i] || 'text-slate-400'}`}>{i + 1}</span>
            <span><b className="block text-sm">{p.ten}</b><small className="text-xs text-slate-500">{p.soDanhGia} đánh giá</small></span>
            <span className="hidden h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:block"><span className="thanh-mo block h-full rounded-full bg-gradient-to-r from-accent-500 to-amber-600" style={{ width: `${(p.saoTb! / 5) * 100}%` }} /></span>
            <span className="text-right font-extrabold text-amber-600">{p.saoTb!.toFixed(1)}</span></button></li>)}
          {!xepHang.length && <li className="py-6 text-center text-sm text-slate-500">Chưa có đánh giá nào để xếp hạng. Hãy là người đầu tiên đánh giá một điểm đến.</li>}
        </ol>
      </section>

      {pChon && <ChiTiet p={pChon} onDong={() => setChon(null)} />}
    </div>
  );
}
