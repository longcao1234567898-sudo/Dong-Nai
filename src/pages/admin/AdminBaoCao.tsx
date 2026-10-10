/** Báo cáo kỳ: tiến độ từng xã/phường, chốt / mở lại, khoá kỳ, tạo kỳ mới, xuất phụ lục. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Lock, Unlock, CheckCircle2, FileSpreadsheet, FileText, Plus } from 'lucide-react';
import { adminFetch, adminTaiXuong } from '../../services/adminService';
import { TieuDeQt, The, The_nho, o, nhan, nutChinh, nutVien } from '../../components/common/KhoiQt';
import { useCauHinh, nhoChon, ngayVn } from '../../utils/phuLuc';

interface NopXa { xaPhuongId: number; ten: string; trangThai: 'dang-nhap' | 'da-chot'; chotLuc: string | null; nguoiChot: string | null; lyDoMoLai: string | null;
  soDong: Record<string, number>; khongPhatSinh: string[] }

export default function AdminBaoCao() {
  const qc = useQueryClient();
  const { data: ch } = useCauHinh();
  const [kyId, setKyId] = useState<number | null>(null);
  const [kyMoi, setKyMoi] = useState({ ten: '', tuNgay: '', denNgay: '', hanNop: '' });
  const [moTaoKy, setMoTaoKy] = useState(false);
  const [xuat, setXuat] = useState({ kySoSanh: 0, xa: 0, tu: '', den: '', bang: [] as string[] });
  const [hanNop, setHanNop] = useState('');
  useEffect(() => {
    if (!ch || kyId) return;
    const nho = Number(nhoChon('ky')), homNay = new Date().toISOString().slice(0, 10);
    setKyId(ch.ky.find((k) => k.id === nho)?.id || ch.ky.find((k) => k.tuNgay <= homNay)?.id || ch.ky[0]?.id || null);
  }, [ch, kyId]);
  const ky = ch?.ky.find((k) => k.id === kyId);
  useEffect(() => { setHanNop(ky?.hanNop || ''); setXuat((x) => ({ ...x, tu: ky?.tuNgay || '', den: ky?.denNgay || '' })); }, [ky?.id, ky?.hanNop, ky?.tuNgay, ky?.denNgay]);

  const { data: nop, isLoading } = useQuery({ queryKey: ['qt-nop', kyId], enabled: !!kyId, queryFn: () => adminFetch<{ ds: NopXa[] }>(`/bao-cao/nop?ky=${kyId}`) });
  const lamMoi = () => ['qt-nop', 'qt-cau-hinh', 'qt-tong-quan', 'qt-thong-ke', 'qt-bang'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const loiToast = (e: Error) => toast.error(e.message, { duration: 7000 });
  const chot = useMutation({ mutationFn: (x: NopXa) => adminFetch(`/bao-cao/nop/${kyId}/${x.xaPhuongId}/chot`, { method: 'POST' }),
    onSuccess: () => { toast.success('Đã chốt báo cáo.'); lamMoi(); }, onError: loiToast });
  const moLai = useMutation({ mutationFn: ({ x, lyDo }: { x: NopXa; lyDo: string }) => adminFetch(`/bao-cao/nop/${kyId}/${x.xaPhuongId}/mo-lai`, { method: 'POST', body: JSON.stringify({ lyDo }) }),
    onSuccess: () => { toast.success('Đã mở lại để sửa.'); lamMoi(); }, onError: loiToast });
  const suaKy = useMutation({ mutationFn: (body: object) => adminFetch(`/bao-cao/ky/${kyId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { toast.success('Đã cập nhật kỳ.'); lamMoi(); }, onError: loiToast });
  const taoKy = useMutation({ mutationFn: () => adminFetch<{ id: number }>('/bao-cao/ky', { method: 'POST', body: JSON.stringify(kyMoi) }),
    onSuccess: (r) => { toast.success('Đã tạo kỳ báo cáo.'); setMoTaoKy(false); setKyMoi({ ten: '', tuNgay: '', denNgay: '', hanNop: '' }); setKyId(r.id); nhoChon('ky', r.id); lamMoi(); }, onError: loiToast });

  const bangDs = (ch?.bang || []).filter((b) => !b.dan);
  const soChot = nop?.ds.filter((x) => x.trangThai === 'da-chot').length || 0;
  const tai = (dinhDang: 'xlsx' | 'docx') => {
    const qs = new URLSearchParams({ ky: String(kyId), dinhDang, ...(xuat.kySoSanh ? { kySoSanh: String(xuat.kySoSanh) } : {}), ...(xuat.xa ? { xa: String(xuat.xa) } : {}),
      ...(xuat.tu ? { tu: xuat.tu } : {}), ...(xuat.den ? { den: xuat.den } : {}), ...(xuat.bang.length ? { bang: xuat.bang.join(',') } : {}) });
    adminTaiXuong(`/bao-cao/xuat?${qs}`, `phu-luc.${dinhDang}`).then(() => toast.success('Đã tải tệp. Việc xuất được ghi vào nhật ký.')).catch(loiToast);
  };

  return (<>
    <TieuDeQt tieuDe="Báo cáo kỳ" moTa="Theo dõi xã/phường nào đã nhập đủ, chốt báo cáo và xuất phụ lục đúng mẫu ra Word, Excel." />
    <The className="mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-full text-sm font-semibold sm:w-auto">Kỳ báo cáo<select className={o + ' sm:min-w-[240px]'} value={kyId ?? ''} onChange={(e) => { setKyId(Number(e.target.value)); nhoChon('ky', e.target.value); }}>
          {ch?.ky.map((k) => <option key={k.id} value={k.id}>{k.ten}{k.khoa ? ' (đã khoá)' : ''}</option>)}</select></label>
        <button type="button" className={nutVien + ' min-h-[44px] gap-1.5 px-3 text-sm'} onClick={() => setMoTaoKy((m) => !m)}><Plus className="h-4 w-4" />Tạo kỳ mới</button>
      </div>
      {ky && <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
        <span className="text-slate-600 dark:text-slate-300">Từ <b>{ngayVn(ky.tuNgay)}</b> đến <b>{ngayVn(ky.denNgay)}</b></span>
        <label className="font-semibold">Hạn nộp<input type="date" className={o + ' w-[170px]'} value={hanNop} onChange={(e) => setHanNop(e.target.value)} /></label>
        {hanNop !== (ky.hanNop || '') && <button type="button" className={nutVien + ' min-h-[42px] px-3'} onClick={() => suaKy.mutate({ hanNop: hanNop || null })}>Lưu hạn nộp</button>}
        <button type="button" className={nutVien + ' min-h-[42px] gap-1.5 px-3'} onClick={() => {
          if (ky.khoa ? window.confirm(`Mở khoá kỳ "${ky.ten}"? Sau khi mở, số liệu kỳ này sửa được trở lại.`) : window.confirm(`Khoá kỳ "${ky.ten}"? Sau khi khoá, không ai sửa được số liệu kỳ này cho tới khi mở khoá.`)) suaKy.mutate({ khoa: !ky.khoa });
        }}>{ky.khoa ? <><Unlock className="h-4 w-4" />Mở khoá kỳ</> : <><Lock className="h-4 w-4" />Khoá kỳ</>}</button>
        {ky.khoa && <The_nho mau="vang">Kỳ đã khoá — chỉ xem</The_nho>}
      </div>}
      {moTaoKy && <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="grid gap-x-3 sm:grid-cols-4">
          <label className={nhan + ' sm:col-span-4'}>Tên kỳ<input className={o} value={kyMoi.ten} maxLength={80} placeholder="Ví dụ: 6 tháng cuối năm 2026" onChange={(e) => setKyMoi({ ...kyMoi, ten: e.target.value })} /></label>
          <label className={nhan}>Từ ngày<input type="date" className={o} value={kyMoi.tuNgay} onChange={(e) => setKyMoi({ ...kyMoi, tuNgay: e.target.value })} /></label>
          <label className={nhan}>Đến ngày<input type="date" className={o} value={kyMoi.denNgay} onChange={(e) => setKyMoi({ ...kyMoi, denNgay: e.target.value })} /></label>
          <label className={nhan}>Hạn nộp (không bắt buộc)<input type="date" className={o} value={kyMoi.hanNop} onChange={(e) => setKyMoi({ ...kyMoi, hanNop: e.target.value })} /></label>
        </div>
        <button type="button" className={nutChinh + ' mt-3'} disabled={taoKy.isPending} onClick={() => taoKy.mutate()}>Tạo kỳ</button>
      </div>}
    </The>

    <The className="mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">Tiến độ các xã/phường</h2>
        <span className="text-sm text-slate-600 dark:text-slate-300">Đã chốt <b>{soChot}/{nop?.ds.length || 0}</b></span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${nop?.ds.length ? (soChot / nop.ds.length) * 100 : 0}%` }} /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[13.5px]">
        <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"><th className="py-2 pr-2">Xã/phường</th>
          {bangDs.map((b) => <th key={b.key} className="px-1 text-center" title={b.ten}><Link className="hover:text-primary-600" to={`/quan-tri/bang/${b.key}`}>B{b.so}</Link></th>)}
          <th className="pr-2">Trạng thái</th><th></th></tr></thead>
        <tbody>
          {isLoading && <tr><td colSpan={9} className="py-6 text-center text-slate-500">Đang tải…</td></tr>}
          {nop?.ds.map((x) => <tr key={x.xaPhuongId} className="border-b border-slate-100 align-top dark:border-slate-800">
            <td className="py-2.5 pr-2 font-semibold">{x.ten}{x.lyDoMoLai && x.trangThai === 'dang-nhap' && <small className="block font-normal text-amber-700 dark:text-amber-300">Mở lại: {x.lyDoMoLai}</small>}</td>
            {bangDs.map((b) => <td key={b.key} className="px-1 py-2.5 text-center tabular-nums" title={b.theoKy ? 'Số dòng trong kỳ' : 'Số dòng trong danh mục'}>
              {x.soDong[b.key] ? <span className="font-bold text-primary-700 dark:text-primary-400">{x.soDong[b.key]}</span>
                : x.khongPhatSinh.includes(b.key) ? <span className="text-xs text-slate-500" title="Đã xác nhận không phát sinh">KPS</span>
                : <span className={b.theoKy ? 'font-bold text-amber-600' : 'text-slate-400'}>{b.theoKy ? 'thiếu' : '–'}</span>}</td>)}
            <td className="py-2.5 pr-2">{x.trangThai === 'da-chot'
              ? <><The_nho mau="xanh">Đã chốt</The_nho><small className="block text-xs text-slate-500">{x.nguoiChot} · {x.chotLuc && new Date(x.chotLuc).toLocaleDateString('vi-VN')}</small></>
              : <The_nho mau="xam">Đang nhập</The_nho>}</td>
            <td className="whitespace-nowrap py-2.5 text-right">{x.trangThai === 'da-chot'
              ? <button type="button" className={nutVien} disabled={ky?.khoa} onClick={() => { const lyDo = window.prompt(`Lý do mở lại báo cáo của ${x.ten}? (lưu vào nhật ký)`); if (lyDo) moLai.mutate({ x, lyDo }); }}>Mở lại</button>
              : <button type="button" className={nutVien + ' gap-1'} disabled={ky?.khoa || chot.isPending} onClick={() => chot.mutate(x)}><CheckCircle2 className="h-3.5 w-3.5" />Chốt</button>}</td>
          </tr>)}
        </tbody></table></div>
      <p className="mt-2 text-xs text-slate-500">B1, B2… là số bảng phụ lục; số trong ô là số dòng đã nhập. "thiếu" = bảng theo kỳ chưa có số liệu; "KPS" = đã xác nhận không phát sinh. Chỉ chốt được khi mọi bảng theo kỳ đã có số liệu hoặc KPS.
        Thêm xã/phường ở mục <Link className="text-primary-600" to="/quan-tri/xa-phuong">Xã/phường</Link>.</p>
    </The>

    <The>
      <h2 className="text-[17px] font-bold">Xuất phụ lục thống kê</h2>
      <p className="text-[13px] text-slate-500">Dựng đúng mẫu phụ lục: cột xã/phường gộp ô, STT máy tự đánh, xếp loại đánh dấu X, dòng tổng cộng. Mỗi lần xuất được ghi nhật ký kèm tên người xuất.</p>
      <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={nhan}>So sánh với kỳ (bảng 1)<select className={o} value={xuat.kySoSanh} onChange={(e) => setXuat({ ...xuat, kySoSanh: Number(e.target.value) })}>
          <option value={0}>— Không —</option>{ch?.ky.filter((k) => k.id !== kyId).map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}</select></label>
        <label className={nhan}>Xã/phường<select className={o} value={xuat.xa} onChange={(e) => setXuat({ ...xuat, xa: Number(e.target.value) })}>
          <option value={0}>Toàn thành phố</option>{ch?.xaPhuong.filter((x) => x.hien).map((x) => <option key={x.id} value={x.id}>{x.ten}</option>)}</select></label>
        <label className={nhan}>Sự việc từ ngày<input type="date" className={o} value={xuat.tu} onChange={(e) => setXuat({ ...xuat, tu: e.target.value })} /></label>
        <label className={nhan}>đến ngày<input type="date" className={o} value={xuat.den} onChange={(e) => setXuat({ ...xuat, den: e.target.value })} /></label>
      </div>
      <fieldset className="mt-3"><legend className="text-sm font-semibold">Gồm các bảng <small className="font-normal text-slate-500">(không chọn = tất cả)</small></legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{(ch?.bang || []).map((b) => <label key={b.key} className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={xuat.bang.includes(b.key)}
            onChange={(e) => setXuat({ ...xuat, bang: e.target.checked ? [...xuat.bang, b.key] : xuat.bang.filter((k) => k !== b.key) })} />Bảng {b.so}. {b.ten}</label>)}</div></fieldset>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={nutChinh} disabled={!kyId} onClick={() => tai('docx')}><FileText className="h-4 w-4" />Tải tệp Word</button>
        <button type="button" className={nutChinh} disabled={!kyId} onClick={() => tai('xlsx')}><FileSpreadsheet className="h-4 w-4" />Tải tệp Excel</button>
      </div>
    </The>
  </>);
}
