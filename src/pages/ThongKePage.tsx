import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import { layThongKe } from '../services/api';
import DemSo from '../components/du-lich/DemSo';
import { TIEU_CHI, so } from '../utils/hangSo';
import { useHienDan } from '../hooks/useHienDan';

const Khung = ({ tieuDe, moTa, rong = false, children }: { tieuDe: string; moTa: string; rong?: boolean; children: React.ReactElement }) => (
  <div className={`hien-dan rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 ${rong ? 'md:col-span-2' : ''}`}>
    <h2 className="text-[15px] font-bold">{tieuDe}</h2><p className="mb-2 text-xs text-slate-500">{moTa}</p>
    <div className="h-[270px]"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
  </div>);
const truc = { fontSize: 12, fill: '#64748b' };

export default function ThongKePage() {
  const [nam, setNam] = useState<string>();
  const { data: tk, isLoading, error } = useQuery({ queryKey: ['thong-ke', nam || ''], queryFn: () => layThongKe(nam) });
  useHienDan([isLoading]);
  if (error) return <div className="container-page py-20 text-center text-sm text-amber-800 dark:text-amber-200"><b className="block">Chưa tải được thống kê</b>{(error as Error).message}</div>;
  if (isLoading || !tk) return <div className="container-page py-20 text-center text-slate-500">Đang tải thống kê…</div>;
  const tongNd = tk.thang.reduce((s, t) => s + t.noiDia, 0), tongQt = tk.thang.reduce((s, t) => s + t.quocTe, 0);
  const nay = new Date();
  const th12 = Array.from({ length: 12 }, (_, i) => { const d = new Date(nay.getFullYear(), nay.getMonth() - 11 + i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return { ten: `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`, so: tk.danhGiaTheoThang.find((x) => x.thang === k)?.so || 0 }; });
  return (
    <section className="animate-page container-page py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Khách đến và đánh giá</h1><p className="text-sm text-slate-500">Số liệu lượt khách do cán bộ nhập; đánh giá do du khách gửi.</p></div>
        <label className="text-sm text-slate-500">Năm <select value={tk.nam} onChange={(e) => setNam(e.target.value)} className="ml-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
          {tk.nams.map((n) => <option key={n}>{n}</option>)}</select></label>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[<DemSo key="a" gt={tongNd + tongQt} />, 'lượt khách trong năm'], [<DemSo key="b" gt={tongQt} />, 'lượt khách quốc tế'],
          [<DemSo key="c" gt={tk.danhGia.so} />, 'đánh giá của du khách'], [tk.danhGia.saoTb ? tk.danhGia.saoTb.toFixed(1) : '–', 'số sao trung bình']].map(([gt, nhan], i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"><b className="block text-2xl font-extrabold">{gt}</b><small className="text-xs text-slate-500">{nhan}</small></div>))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Khung rong tieuDe="Lượt khách theo tháng" moTa="Khách trong nước và quốc tế, cộng mọi địa điểm.">
          <BarChart data={tk.thang.map((t) => ({ ...t, ten: 'T' + Number(t.thang.slice(5)) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="ten" tick={truc} /><YAxis tick={truc} tickFormatter={(v) => so(v)} width={64} />
            <Tooltip formatter={(v) => so(Number(v))} /><Legend /><Bar dataKey="noiDia" name="Trong nước" stackId="k" fill="#1B5E20" radius={[0, 0, 4, 4]} /><Bar dataKey="quocTe" name="Quốc tế" stackId="k" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
          </BarChart></Khung>
        <Khung tieuDe="Tỉ lệ khách trong nước và quốc tế" moTa="Trong năm đã chọn.">
          <PieChart><Pie data={tongNd + tongQt ? [{ ten: 'Trong nước', gt: tongNd }, { ten: 'Quốc tế', gt: tongQt }] : [{ ten: 'Chưa có số liệu', gt: 1 }]} dataKey="gt" nameKey="ten" innerRadius="58%" outerRadius="85%" paddingAngle={2}>
            {(tongNd + tongQt ? ['#1B5E20', '#1E3A5F'] : ['#e2e8f0']).map((m) => <Cell key={m} fill={m} />)}</Pie><Tooltip formatter={(v) => (tongNd + tongQt ? so(Number(v)) : '')} /><Legend /></PieChart></Khung>
        <Khung tieuDe="Địa điểm đón nhiều khách nhất" moTa="Tổng lượt khách trong năm đã chọn.">
          <BarChart data={tk.topDiaDiem} layout="vertical" margin={{ left: 8 }}><XAxis type="number" tick={truc} tickFormatter={(v) => so(v)} /><YAxis type="category" dataKey="ten" tick={truc} width={130} />
            <Tooltip formatter={(v) => so(Number(v))} /><Bar dataKey="tong" name="Lượt khách" fill="#059669" radius={[0, 4, 4, 0]} /></BarChart></Khung>
        <Khung tieuDe="Điểm từng tiêu chí" moTa="Trung bình các tiêu chí du khách đã chấm.">
          <RadarChart data={TIEU_CHI.map(([k, t]) => ({ t, gt: Number(tk.danhGia.tieuChi[k] || 0) }))}><PolarGrid stroke="#cbd5e1" /><PolarAngleAxis dataKey="t" tick={truc} />
            <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} /><Radar dataKey="gt" name="Điểm" stroke="#1B5E20" fill="#059669" fillOpacity={0.25} /><Tooltip /></RadarChart></Khung>
        <Khung tieuDe="Du khách chấm bao nhiêu sao" moTa="Số đánh giá ở mỗi mức từ 1 đến 5 sao.">
          <BarChart data={tk.danhGia.phanBo.map((gt, i) => ({ ten: `${i + 1} sao`, gt }))}><XAxis dataKey="ten" tick={truc} /><YAxis allowDecimals={false} tick={truc} /><Tooltip />
            <Bar dataKey="gt" name="Số đánh giá" radius={[4, 4, 0, 0]}>{['#be123c', '#ea580c', '#F59E0B', '#059669', '#1B5E20'].map((m) => <Cell key={m} fill={m} />)}</Bar></BarChart></Khung>
        <Khung tieuDe="Số sao trung bình theo địa điểm" moTa="Chỉ tính địa điểm đã có đánh giá.">
          <BarChart data={tk.saoTheoDiaDiem.map((x) => ({ ...x, ten: `${x.ten} (${x.so})`, tb: Number(x.tb.toFixed(2)) }))} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" domain={[0, 5]} tick={truc} /><YAxis type="category" dataKey="ten" tick={truc} width={150} /><Tooltip /><Bar dataKey="tb" name="Sao trung bình" fill="#F59E0B" radius={[0, 4, 4, 0]} /></BarChart></Khung>
        <Khung tieuDe="Số đánh giá theo tháng" moTa="Mười hai tháng gần nhất.">
          <AreaChart data={th12}><XAxis dataKey="ten" tick={truc} /><YAxis allowDecimals={false} tick={truc} /><Tooltip />
            <Area type="monotone" dataKey="so" name="Đánh giá" stroke="#d97706" fill="#F59E0B" fillOpacity={0.18} /></AreaChart></Khung>
      </div>
    </section>
  );
}
