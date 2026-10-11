import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import { layThongKe } from '../services/api';
import DemSo from '../components/du-lich/DemSo';
import { TIEU_CHI, so } from '../utils/hangSo';
import { useNN } from '../i18n/NgonNgu';

const Khung = ({ tieuDe, moTa, rong = false, children }: { tieuDe: string; moTa: string; rong?: boolean; children: React.ReactElement }) => (
  <div className={`hien-dan rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 ${rong ? 'md:col-span-2' : ''}`}>
    <h2 className="text-[15px] font-bold">{tieuDe}</h2><p className="mb-2 text-xs text-slate-500">{moTa}</p>
    <div className="h-[270px]"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
  </div>);
const truc = { fontSize: 12, fill: '#64748b' };

const CHU: Record<string, [string, string]> = {
  tieuDe: ['Khách đến và đánh giá', 'Visitors and reviews'], moTa: ['Số liệu lượt khách do cán bộ nhập; đánh giá do du khách gửi.', 'Visitor numbers are entered by officials; reviews come from visitors.'],
  nam: ['Năm', 'Year'], luotNam: ['lượt khách trong năm', 'visits this year'], luotQt: ['lượt khách quốc tế', 'international visits'], dg: ['đánh giá của du khách', 'visitor reviews'],
  saoTb: ['số sao trung bình', 'average rating'], theoThang: ['Lượt khách theo tháng', 'Visits by month'], theoThangMoTa: ['Khách trong nước và quốc tế, cộng mọi địa điểm.', 'Domestic and international, all places combined.'],
  tiLe: ['Tỉ lệ khách trong nước và quốc tế', 'Domestic vs international'], trongNam: ['Trong năm đã chọn.', 'In the selected year.'], chuaCo: ['Chưa có số liệu', 'No data yet'],
  top: ['Địa điểm đón nhiều khách nhất', 'Most visited places'], topMoTa: ['Tổng lượt khách trong năm đã chọn.', 'Total visits in the selected year.'], luot: ['Lượt khách', 'Visits'],
  tieuChi: ['Điểm từng tiêu chí', 'Score by aspect'], tieuChiMoTa: ['Trung bình các tiêu chí du khách đã chấm.', 'Average of the aspects visitors rated.'], diem: ['Điểm', 'Score'],
  phanBo: ['Du khách chấm bao nhiêu sao', 'How many stars visitors gave'], phanBoMoTa: ['Số đánh giá ở mỗi mức từ 1 đến 5 sao.', 'Number of reviews at each level, 1 to 5 stars.'], soDg: ['Số đánh giá', 'Reviews'],
  saoDiaDiem: ['Số sao trung bình theo địa điểm', 'Average rating by place'], saoDiaDiemMoTa: ['Chỉ tính địa điểm đã có đánh giá.', 'Rated places only.'], saoTbNgan: ['Sao trung bình', 'Average'],
  dgThang: ['Số đánh giá theo tháng', 'Reviews by month'], dgThangMoTa: ['Mười hai tháng gần nhất.', 'Last twelve months.'], danhGia: ['Đánh giá', 'Reviews'],
  chuaTai: ['Chưa tải được thống kê', 'Could not load statistics'], dangTai: ['Đang tải thống kê…', 'Loading statistics…'],
};

export default function ThongKePage() {
  const { nn, t } = useNN();
  const c = (k: string) => CHU[k][nn === 'en' ? 1 : 0];
  const [nam, setNam] = useState<string>();
  const { data: tk, isLoading, error } = useQuery({ queryKey: ['thong-ke', nam || ''], queryFn: () => layThongKe(nam) });
  if (error) return <div className="container-page py-20 text-center text-sm text-amber-800 dark:text-amber-200"><b className="block">{c('chuaTai')}</b>{(error as Error).message}</div>;
  if (isLoading || !tk) return <div className="container-page py-20 text-center text-slate-500">{c('dangTai')}</div>;
  const tongNd = tk.thang.reduce((s, t) => s + t.noiDia, 0), tongQt = tk.thang.reduce((s, t) => s + t.quocTe, 0);
  const nay = new Date();
  const th12 = Array.from({ length: 12 }, (_, i) => { const d = new Date(nay.getFullYear(), nay.getMonth() - 11 + i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return { ten: `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`, so: tk.danhGiaTheoThang.find((x) => x.thang === k)?.so || 0 }; });
  return (
    <section className="animate-page container-page py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{c('tieuDe')}</h1><p className="text-sm text-slate-500">{c('moTa')}</p></div>
        <label className="text-sm text-slate-500">{c('nam')} <select value={tk.nam} onChange={(e) => setNam(e.target.value)} className="ml-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
          {tk.nams.map((n) => <option key={n}>{n}</option>)}</select></label>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[<DemSo key="a" gt={tongNd + tongQt} />, c('luotNam')], [<DemSo key="b" gt={tongQt} />, c('luotQt')],
          [<DemSo key="c" gt={tk.danhGia.so} />, c('dg')], [tk.danhGia.saoTb ? tk.danhGia.saoTb.toFixed(1) : '–', c('saoTb')]].map(([gt, nhan], i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"><b className="block text-2xl font-extrabold">{gt}</b><small className="text-xs text-slate-500">{nhan}</small></div>))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tk.khachTheoXa && tk.khachTheoXa.ds.length > 0 && <Khung rong tieuDe={t('khachTheoXa')} moTa={t('khachTheoXaMoTa', { ky: tk.khachTheoXa.ky })}>
          <BarChart data={tk.khachTheoXa.ds.map((x) => ({ ...x, ten: x.xa.replace(/^(Xã|Phường|Đặc khu) /, '') }))} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tick={truc} tickFormatter={(v) => so(v)} /><YAxis type="category" dataKey="ten" tick={truc} width={120} />
            <Tooltip formatter={(v) => so(Number(v))} /><Legend />
            <Bar dataKey="noiDia" name={t('trongNuoc')} stackId="k" fill="#059669" stroke="#fff" strokeWidth={2} maxBarSize={24} />
            <Bar dataKey="quocTe" name={t('quocTe')} stackId="k" fill="#2563eb" stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={24} /></BarChart></Khung>}
        <Khung rong tieuDe={c('theoThang')} moTa={c('theoThangMoTa')}>
          <BarChart data={tk.thang.map((x) => ({ ...x, ten: (nn === 'en' ? 'M' : 'T') + Number(x.thang.slice(5)) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="ten" tick={truc} /><YAxis tick={truc} tickFormatter={(v) => so(v)} width={64} />
            <Tooltip formatter={(v) => so(Number(v))} /><Legend /><Bar dataKey="noiDia" name={t('trongNuoc')} stackId="k" fill="#1B5E20" radius={[0, 0, 4, 4]} /><Bar dataKey="quocTe" name={t('quocTe')} stackId="k" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
          </BarChart></Khung>
        <Khung tieuDe={c('tiLe')} moTa={c('trongNam')}>
          <PieChart><Pie data={tongNd + tongQt ? [{ ten: t('trongNuoc'), gt: tongNd }, { ten: t('quocTe'), gt: tongQt }] : [{ ten: c('chuaCo'), gt: 1 }]} dataKey="gt" nameKey="ten" innerRadius="58%" outerRadius="85%" paddingAngle={2}>
            {(tongNd + tongQt ? ['#1B5E20', '#1E3A5F'] : ['#e2e8f0']).map((m) => <Cell key={m} fill={m} />)}</Pie><Tooltip formatter={(v) => (tongNd + tongQt ? so(Number(v)) : '')} /><Legend /></PieChart></Khung>
        <Khung tieuDe={c('top')} moTa={c('topMoTa')}>
          <BarChart data={tk.topDiaDiem} layout="vertical" margin={{ left: 8 }}><XAxis type="number" tick={truc} tickFormatter={(v) => so(v)} /><YAxis type="category" dataKey="ten" tick={truc} width={130} />
            <Tooltip formatter={(v) => so(Number(v))} /><Bar dataKey="tong" name={c('luot')} fill="#059669" radius={[0, 4, 4, 0]} /></BarChart></Khung>
        <Khung tieuDe={c('tieuChi')} moTa={c('tieuChiMoTa')}>
          <RadarChart data={TIEU_CHI.map(([k, vi, en]) => ({ ten: nn === 'en' ? en : vi, gt: Number(tk.danhGia.tieuChi[k] || 0) }))}><PolarGrid stroke="#cbd5e1" /><PolarAngleAxis dataKey="ten" tick={truc} />
            <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} /><Radar dataKey="gt" name={c('diem')} stroke="#1B5E20" fill="#059669" fillOpacity={0.25} /><Tooltip /></RadarChart></Khung>
        <Khung tieuDe={c('phanBo')} moTa={c('phanBoMoTa')}>
          <BarChart data={tk.danhGia.phanBo.map((gt, i) => ({ ten: `${i + 1} ${t('sao')}`, gt }))}><XAxis dataKey="ten" tick={truc} /><YAxis allowDecimals={false} tick={truc} /><Tooltip />
            <Bar dataKey="gt" name={c('soDg')} radius={[4, 4, 0, 0]}>{['#be123c', '#ea580c', '#F59E0B', '#059669', '#1B5E20'].map((m) => <Cell key={m} fill={m} />)}</Bar></BarChart></Khung>
        <Khung tieuDe={c('saoDiaDiem')} moTa={c('saoDiaDiemMoTa')}>
          <BarChart data={tk.saoTheoDiaDiem.map((x) => ({ ...x, ten: `${x.ten} (${x.so})`, tb: Number(x.tb.toFixed(2)) }))} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" domain={[0, 5]} tick={truc} /><YAxis type="category" dataKey="ten" tick={truc} width={150} /><Tooltip /><Bar dataKey="tb" name={c('saoTbNgan')} fill="#F59E0B" radius={[0, 4, 4, 0]} /></BarChart></Khung>
        <Khung tieuDe={c('dgThang')} moTa={c('dgThangMoTa')}>
          <AreaChart data={th12}><XAxis dataKey="ten" tick={truc} /><YAxis allowDecimals={false} tick={truc} /><Tooltip />
            <Area type="monotone" dataKey="so" name={c('danhGia')} stroke="#d97706" fill="#F59E0B" fillOpacity={0.18} /></AreaChart></Khung>
      </div>
    </section>
  );
}
