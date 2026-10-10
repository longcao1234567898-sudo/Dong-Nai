/** Thống kê từ phụ lục — số khách theo xã, dự án, cơ sở lưu trú, tiến độ chốt, cảnh báo số liệu. */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { AlertTriangle, Download, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminFetch, adminTaiXuong } from '../../services/adminService';
import { TieuDeQt, The, o, nutVien } from '../../components/common/KhoiQt';
import { useCauHinh, nhoChon, type KyBC } from '../../utils/phuLuc';
import { so } from '../../utils/hangSo';

interface TK {
  ky: KyBC; kySoSanh: KyBC | null;
  khach: { quocTe: number; noiDia: number; ssQuocTe: number | null; ssNoiDia: number | null;
    theoXa: { xa: string; quocTe: number | null; noiDia: number | null; ssQuocTe: number | null; ssNoiDia: number | null }[] };
  duAn: { theoTrangThai: { trangThai: string; so: number; von: number }[]; theoQuocGia: { quocGia: string; so: number; von: number }[] };
  luuTru: { hang: string; so: number }[];
  nop: { soXa: number; daChot: number };
  vuViec: { ketQua: string; so: number }[];
  viPham: { theoLoai: { loai: string; so: number }[]; theoQuocTich: { quocTich: string; so: number }[] };
  vanDong: { soLuot: number; soNguoi: number; soMoHinh: number };
  lucLuong: { tongQuanSo: number; soCanBoCacTo: number; trinhDo: { trinhDo: string; so: number }[] };
  danCu: { danSo: number; coSoTonGiao: number; tinDo: number };
  canhBao: string[];
}

/* Màu đã kiểm bằng công cụ đo độ phân biệt (kể cả người mù màu) trên cả nền
   sáng và nền tối. Nội địa / quốc tế; kỳ chính / kỳ so sánh. */
const MAU = { sang: { noiDia: '#059669', quocTe: '#2563eb', ky: '#2563eb', ss: '#d97706', mot: '#059669', nen: '#ffffff', luoi: '#e2e8f0', chu: '#64748b' },
  toi: { noiDia: '#059669', quocTe: '#3b82f6', ky: '#3b82f6', ss: '#d97706', mot: '#059669', nen: '#0f172a', luoi: '#1e293b', chu: '#94a3b8' } };

function useCheDoToi() {
  const [toi, setToi] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const mo = new MutationObserver(() => setToi(document.documentElement.classList.contains('dark')));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return toi;
}

/* trong: câu báo khi chưa có số liệu — vẽ thay biểu đồ, không đặt trong ResponsiveContainer (nó chỉ nhận biểu đồ). */
const Khung = ({ tieuDe, moTa, cao = 280, trong, children }: { tieuDe: string; moTa: string; cao?: number; trong?: string | false; children: React.ReactElement }) => (
  <The className="!p-4"><h2 className="text-[15px] font-bold">{tieuDe}</h2><p className="mb-2 text-xs text-slate-500">{moTa}</p>
    {trong ? <div className="grid h-32 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500 dark:bg-slate-800/50">{trong}</div>
      : <div style={{ height: cao }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>}</The>);

export default function AdminThongKe() {
  const { data: ch } = useCauHinh();
  const toi = useCheDoToi(), m = toi ? MAU.toi : MAU.sang;
  const [kyId, setKyId] = useState<number | null>(null);
  const [ssId, setSsId] = useState<number>(0);
  useEffect(() => {
    if (!ch || kyId) return;
    const nho = Number(nhoChon('ky')), homNay = new Date().toISOString().slice(0, 10);
    setKyId(ch.ky.find((k) => k.id === nho)?.id || ch.ky.find((k) => k.tuNgay <= homNay)?.id || ch.ky[0]?.id || null);
  }, [ch, kyId]);
  const { data: tk, isLoading, error } = useQuery({ queryKey: ['qt-thong-ke', kyId, ssId], enabled: !!kyId,
    queryFn: () => adminFetch<TK>(`/bao-cao/thong-ke?ky=${kyId}${ssId ? `&kySoSanh=${ssId}` : ''}`) });

  const truc = { fontSize: 12, fill: m.chu };
  const goiY = { contentStyle: { borderRadius: 12, border: `1px solid ${m.luoi}`, background: m.nen, fontSize: 13 }, cursor: { fill: toi ? '#ffffff14' : '#0f172a0d' } };
  const tong = tk ? tk.khach.quocTe + tk.khach.noiDia : 0;
  const tongSs = tk && tk.khach.ssQuocTe !== null ? tk.khach.ssQuocTe + Number(tk.khach.ssNoiDia) : null;
  const khachXa = (tk?.khach.theoXa || []).filter((x) => x.quocTe !== null).map((x) => ({ ...x, ten: x.xa.replace(/^(Xã|Phường|Đặc khu) /, '') }));
  const soSanh = (tk?.khach.theoXa || []).map((x) => ({ ten: x.xa.replace(/^(Xã|Phường|Đặc khu) /, ''),
    ky: x.quocTe === null ? null : Number(x.quocTe) + Number(x.noiDia), ss: x.ssQuocTe === null ? null : Number(x.ssQuocTe) + Number(x.ssNoiDia) }));
  const caoNgang = (n: number) => Math.max(160, n * 34 + 60);

  return (<>
    <TieuDeQt tieuDe="Thống kê phụ lục" moTa="Tổng hợp từ số liệu các xã/phường đã nhập. Chọn kỳ so sánh để xem tăng giảm." />
    <The className="mb-4"><div className="flex flex-wrap items-end gap-3">
      <label className="w-full text-sm font-semibold sm:w-auto">Kỳ báo cáo<select className={o + ' sm:min-w-[220px]'} value={kyId ?? ''} onChange={(e) => { setKyId(Number(e.target.value)); nhoChon('ky', e.target.value); }}>
        {ch?.ky.map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}</select></label>
      <label className="w-full text-sm font-semibold sm:w-auto">So sánh với<select className={o + ' sm:min-w-[220px]'} value={ssId} onChange={(e) => setSsId(Number(e.target.value))}>
        <option value={0}>— Không so sánh —</option>{ch?.ky.filter((k) => k.id !== kyId).map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}</select></label>
      <button type="button" className={nutVien + ' min-h-[44px] gap-1.5 px-3 text-sm'} disabled={!kyId}
        onClick={() => adminTaiXuong(`/bao-cao/xuat?ky=${kyId}${ssId ? `&kySoSanh=${ssId}` : ''}&dinhDang=xlsx`, 'phu-luc.xlsx').catch((e: Error) => toast.error(e.message))}>
        <Download className="h-4 w-4" />Tải phụ lục Excel</button>
    </div></The>

    {error && <The><p className="text-sm text-red-700">{(error as Error).message}</p></The>}
    {isLoading && <p className="py-10 text-center text-slate-500">Đang tải…</p>}
    {tk && <>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          [so(tong), `lượt khách — ${tk.ky.ten}`, tongSs !== null && tongSs > 0 ? `${tong >= tongSs ? '▲' : '▼'} ${Math.abs(Math.round((tong - tongSs) / tongSs * 100))}% so với ${tk.kySoSanh?.ten}` : ''],
          [tong ? `${Math.round(tk.khach.quocTe / tong * 100)}%` : '–', 'là khách quốc tế', `${so(tk.khach.quocTe)} lượt`],
          [so(tk.duAn.theoTrangThai.reduce((s, r) => s + r.so, 0)), 'dự án đầu tư du lịch', `${so(Math.round(tk.duAn.theoTrangThai.reduce((s, r) => s + r.von, 0)))} tỷ đồng vốn`],
          [`${tk.nop.daChot}/${tk.nop.soXa}`, 'xã/phường đã chốt báo cáo', tk.ky.hanNop ? `hạn nộp ${tk.ky.hanNop.split('-').reverse().join('/')}` : ''],
        ].map(([gt, nhan, phu], i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <b className="block text-2xl font-extrabold tabular-nums">{gt}</b><small className="text-xs text-slate-500">{nhan}</small>
            {phu && <small className="mt-0.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{phu}</small>}</div>))}
      </div>

      {tk.canhBao.length > 0 && <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
        <b className="mb-1 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Cần xem lại</b>
        <ul className="list-disc space-y-0.5 pl-5">{tk.canhBao.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2"><Khung tieuDe="Khách du lịch theo xã/phường" moTa={`Kỳ ${tk.ky.ten}. Chỉ hiện xã/phường đã nhập số liệu.`} cao={caoNgang(khachXa.length)} trong={!khachXa.length && 'Chưa có xã/phường nào nhập số khách kỳ này.'}>
          <BarChart data={khachXa} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" tick={truc} tickFormatter={(v) => so(v)} /><YAxis type="category" dataKey="ten" tick={truc} width={120} />
            <Tooltip {...goiY} formatter={(v) => so(Number(v))} /><Legend />
            <Bar dataKey="noiDia" name="Nội địa" stackId="k" fill={m.noiDia} stroke={m.nen} strokeWidth={2} maxBarSize={24} />
            <Bar dataKey="quocTe" name="Quốc tế" stackId="k" fill={m.quocTe} stroke={m.nen} strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={24} />
          </BarChart></Khung></div>

        {tk.kySoSanh && <div className="lg:col-span-2"><Khung tieuDe="Tổng số khách: so sánh hai kỳ" moTa={`${tk.ky.ten} so với ${tk.kySoSanh.ten}.`} cao={caoNgang(soSanh.length)} trong={!soSanh.length && 'Chưa có số liệu để so sánh.'}>
          <BarChart data={soSanh} layout="vertical" margin={{ left: 8, right: 16 }} barGap={2}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" tick={truc} tickFormatter={(v) => so(v)} /><YAxis type="category" dataKey="ten" tick={truc} width={120} />
            <Tooltip {...goiY} formatter={(v) => (v === null ? 'Chưa có' : so(Number(v)))} /><Legend />
            <Bar dataKey="ky" name={tk.ky.ten} fill={m.ky} radius={[0, 4, 4, 0]} maxBarSize={14} />
            <Bar dataKey="ss" name={tk.kySoSanh.ten} fill={m.ss} radius={[0, 4, 4, 0]} maxBarSize={14} />
          </BarChart></Khung></div>}

        <Khung tieuDe="Dự án theo tình trạng" moTa="Số dự án; rê chuột để xem tổng vốn." cao={260}>
          <BarChart data={tk.duAn.theoTrangThai} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" allowDecimals={false} tick={truc} /><YAxis type="category" dataKey="trangThai" tick={truc} width={150} />
            <Tooltip {...goiY} formatter={(v, _n, p) => [`${v} dự án · ${so(Math.round((p.payload as { von: number }).von))} tỷ đồng`, 'Số dự án']} />
            <Bar dataKey="so" name="Số dự án" fill={m.mot} radius={[0, 4, 4, 0]} maxBarSize={22} /></BarChart></Khung>

        <Khung tieuDe="Vốn đầu tư theo quốc gia" moTa="Tỷ đồng, cộng các dự án đã ghi vốn." cao={260} trong={!tk.duAn.theoQuocGia.length && 'Chưa có dự án.'}>
          <BarChart data={tk.duAn.theoQuocGia} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" tick={truc} tickFormatter={(v) => so(v)} /><YAxis type="category" dataKey="quocGia" tick={truc} width={110} />
            <Tooltip {...goiY} formatter={(v, _n, p) => [`${so(Number(v))} tỷ đồng · ${(p.payload as { so: number }).so} dự án`, 'Vốn']} />
            <Bar dataKey="von" name="Vốn (tỷ đồng)" fill={m.mot} radius={[0, 4, 4, 0]} maxBarSize={26} /></BarChart></Khung>

        <Khung tieuDe="Resort, khu nghỉ dưỡng theo hạng" moTa="Số cơ sở ở mỗi hạng sao." cao={240}>
          <BarChart data={tk.luuTru} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" allowDecimals={false} tick={truc} /><YAxis type="category" dataKey="hang" tick={truc} width={110} interval={0} />
            <Tooltip {...goiY} /><Bar dataKey="so" name="Số cơ sở" fill={m.mot} radius={[0, 4, 4, 0]} maxBarSize={22} /></BarChart></Khung>

        <The className="!p-4"><h2 className="text-[15px] font-bold">Bảng số khách theo xã/phường</h2><p className="mb-2 text-xs text-slate-500">Cùng số liệu với biểu đồ, dạng bảng.</p>
          <div className="max-h-[300px] overflow-auto"><table className="w-full text-[13px] tabular-nums"><thead className="sticky top-0 bg-white dark:bg-slate-900"><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
            <th className="py-1.5">Xã/phường</th><th className="text-right">Quốc tế</th><th className="text-right">Nội địa</th><th className="text-right">Tổng</th>{tk.kySoSanh && <th className="text-right">Kỳ so sánh</th>}</tr></thead>
            <tbody>{tk.khach.theoXa.map((x) => <tr key={x.xa} className="border-b border-slate-100 dark:border-slate-800"><td className="py-1.5 pr-2">{x.xa}</td>
              <td className="text-right">{x.quocTe === null ? '—' : so(x.quocTe)}</td><td className="text-right">{x.noiDia === null ? '—' : so(x.noiDia)}</td>
              <td className="text-right font-bold">{x.quocTe === null ? '—' : so(Number(x.quocTe) + Number(x.noiDia))}</td>
              {tk.kySoSanh && <td className="text-right">{x.ssQuocTe === null ? '—' : so(Number(x.ssQuocTe) + Number(x.ssNoiDia))}</td>}</tr>)}
              {!tk.khach.theoXa.length && <tr><td colSpan={5} className="py-4 text-center text-slate-500">Chưa có số liệu.</td></tr>}</tbody></table></div></The>
      </div>

      {/* ---------- An ninh, trật tự (bảng 4–10): thông tin nhạy cảm ---------- */}
      <h2 className="mb-1 mt-8 flex items-center gap-2 text-lg font-extrabold"><EyeOff className="h-5 w-5" />An ninh, trật tự trong hoạt động du lịch</h2>
      <p className="mb-3 text-sm text-slate-500">Từ bảng 4 đến bảng 10 — thông tin nhạy cảm, việc xem trang này đã được ghi nhật ký.</p>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          [so(tk.lucLuong.tongQuanSo), 'tổng quân số công an các xã', `${so(tk.lucLuong.soCanBoCacTo)} cán bộ trong các tổ (bảng 7)`],
          [so(tk.vanDong.soLuot), 'lượt vận động quần chúng', `${so(tk.vanDong.soNguoi)} người · ${so(tk.vanDong.soMoHinh)} mô hình`],
          [so(tk.viPham.theoLoai.reduce((a, r) => a + r.so, 0)), 'lượt vi phạm của khách nước ngoài', `trong kỳ ${tk.ky.ten}`],
          [so(tk.danCu.danSo), 'dân số các xã đã báo cáo', `${so(tk.danCu.coSoTonGiao)} cơ sở tôn giáo · ${so(tk.danCu.tinDo)} tín đồ`],
        ].map(([gt, nhan, phu], i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <b className="block text-2xl font-extrabold tabular-nums">{gt}</b><small className="text-xs text-slate-500">{nhan}</small>
            <small className="mt-0.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{phu}</small></div>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Khung tieuDe="Vụ việc an ninh, trật tự theo kết quả giải quyết" moTa="Mọi vụ việc trong danh mục bảng 4." cao={200} trong={!tk.vuViec.some((r) => r.so) && 'Chưa có vụ việc.'}>
          <BarChart data={tk.vuViec} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" allowDecimals={false} tick={truc} /><YAxis type="category" dataKey="ketQua" tick={truc} width={130} />
            <Tooltip {...goiY} /><Bar dataKey="so" name="Số vụ việc" fill={m.mot} radius={[0, 4, 4, 0]} maxBarSize={24} /></BarChart></Khung>
        <Khung tieuDe="Vi phạm của khách nước ngoài theo loại" moTa={`Số lượt, trong kỳ ${tk.ky.ten}.`} cao={200} trong={!tk.viPham.theoLoai.some((r) => r.so) && 'Không có vi phạm trong kỳ.'}>
          <BarChart data={tk.viPham.theoLoai.map((r) => ({ ...r, loai: r.loai.replace(/ \(.*\)$/, '') }))} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" allowDecimals={false} tick={truc} /><YAxis type="category" dataKey="loai" tick={truc} width={150} />
            <Tooltip {...goiY} /><Bar dataKey="so" name="Số lượt" fill={m.mot} radius={[0, 4, 4, 0]} maxBarSize={24} /></BarChart></Khung>
        <Khung tieuDe="Vi phạm theo quốc tịch" moTa={`Mọi loại vi phạm, trong kỳ ${tk.ky.ten}.`} cao={caoNgang(tk.viPham.theoQuocTich.length)} trong={!tk.viPham.theoQuocTich.length && 'Không có vi phạm trong kỳ.'}>
          <BarChart data={tk.viPham.theoQuocTich} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={m.luoi} /><XAxis type="number" allowDecimals={false} tick={truc} /><YAxis type="category" dataKey="quocTich" tick={truc} width={100} />
            <Tooltip {...goiY} /><Bar dataKey="so" name="Số lượt" fill={m.mot} radius={[0, 4, 4, 0]} maxBarSize={22} /></BarChart></Khung>
        <Khung tieuDe="Trình độ cán bộ các tổ" moTa={`Bảng 7, kỳ ${tk.ky.ten}.`} cao={220} trong={!tk.lucLuong.trinhDo.some((r) => r.so) && 'Chưa nhập trình độ.'}>
          <BarChart data={tk.lucLuong.trinhDo} margin={{ right: 8 }}>
            <CartesianGrid vertical={false} stroke={m.luoi} /><XAxis dataKey="trinhDo" tick={{ ...truc, fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} tick={truc} width={36} />
            <Tooltip {...goiY} /><Bar dataKey="so" name="Số cán bộ" fill={m.mot} radius={[4, 4, 0, 0]} maxBarSize={40} /></BarChart></Khung>
      </div>
    </>}
  </>);
}
