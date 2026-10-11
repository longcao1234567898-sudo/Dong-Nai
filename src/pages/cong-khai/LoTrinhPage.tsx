/** Lộ trình du lịch: danh sách, trang từng lộ trình (bản đồ dính bên cạnh, cuộn qua từng điểm dừng) và tự tạo lộ trình. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Navigation, ArrowUp, ArrowDown, X, Link2, Plus, Clock, Bus, ArrowLeft, ArrowUpRight } from 'lucide-react';
import BanDo from '../../components/du-lich/BanDo';
import ChiTiet from '../../components/du-lich/ChiTiet';
import { DauTrang, KhungAnh } from '../../components/du-lich/GiaoDien';
import { useAnhCanh } from '../../components/trang-chu/anhCanh';
import ChupDiaHinh from '../../components/trang-chu/ChupDiaHinh';
import { layDiaDiem, layLoTrinh } from '../../services/api';
import { khoangCachKm, duongDanChiDuong } from '../../utils/hangSo';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem, LoTrinh } from '../../utils/kieu';

const tongKm = (ds: DiaDiem[]) => Math.round(ds.slice(1).reduce((s, p, i) => s + khoangCachKm(ds[i], p), 0));
const diemCua = (l: LoTrinh, ds: DiaDiem[]) => l.diem.map((d) => ds.find((p) => p.id === d.id)).filter((p): p is DiaDiem => !!p);

function AnhTuyen({ id }: { id: number }) {
  const { t } = useNN();
  const anh = useAnhCanh('tuyen:' + id);
  return anh ? <><img src={anh} alt="" className="anh-hien fx-anh-troi absolute inset-0 h-full w-full object-cover" /><span className="nhan-anh">{t('anhDiaHinh')}</span></> : <span className="anh-cho" />;
}

export function LoTrinhDanhSach() {
  const { t, chon } = useNN();
  const { data: lt = [], isLoading } = useQuery({ queryKey: ['lo-trinh'], queryFn: layLoTrinh });
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  return (
    <div className="animate-page">
      {ds.length > 0 && lt.length > 0 && <ChupDiaHinh chup={{ diem: [], tuyen: lt.map((l) => ({ id: l.id, diem: diemCua(l, ds) })) }} />}
      <DauTrang tieuDe={t('loTrinhTieuDe')} moTa={t('loTrinhMoTa')} phai={<Link to="/tu-tao-lo-trinh" className="nut nut-chinh"><Plus className="h-4 w-4" />{t('tuTaoLoTrinh')}</Link>} />
      <section className="container-page py-12">
        {isLoading && <p className="py-10 text-center text-muted">{t('dangTai')}</p>}
        <div className="grid gap-5 md:grid-cols-2">{lt.map((l, i) => { const diem = diemCua(l, ds); return (
          <div key={l.id} className="hien-dan" style={{ '--i': i % 2 } as CSSProperties}>
            <Link to={`/lo-trinh/${l.id}`} className="fx-the the group relative block h-full" data-nghieng="5">
              <span className="relative block h-48 overflow-hidden rounded-t-[15px] bg-sunken"><AnhTuyen id={l.id} /></span>
              <span className="fx-noi-it block p-6">
                <b className="tieu-de-vua block">{chon(l.ten, l.tenEn)}</b>
                <span className="mt-2 flex flex-wrap gap-x-4 text-sm text-ink-2">{l.thoiGian && <span>{l.thoiGian}</span>}<span>{t('soDiemDung', { n: diem.length })}</span>
                  <span>{t('duongChimBay', { km: tongKm(diem) })}</span></span>
                {chon(l.moTa, l.moTaEn) && <span className="mt-3 block text-[15px] leading-relaxed text-ink-2">{chon(l.moTa, l.moTaEn)}</span>}
                <span className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">{diem.map((p, k) => (
                  <span key={p.id + k} className="inline-flex items-center gap-2">{k > 0 && <span className="h-[2px] w-4 bg-route/60" aria-hidden="true" />}{chon(p.ten, p.tenEn)}</span>))}</span>
              </span>
            </Link>
          </div>); })}</div>
      </section>
    </div>);
}

export function LoTrinhChiTiet() {
  const { id } = useParams();
  const { t, chon } = useNN();
  const { data: lt = [], isLoading } = useQuery({ queryKey: ['lo-trinh'], queryFn: layLoTrinh });
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const [xem, setXem] = useState<string | null>(null);
  const [dang, setDang] = useState(0);   // điểm dừng đang ở giữa màn hình
  const dsMuc = useRef<(HTMLLIElement | null)[]>([]);
  const l = lt.find((x) => x.id === Number(id));
  const cap = (l?.diem || []).map((d) => ({ d, p: ds.find((p) => p.id === d.id) })).filter((x): x is { d: typeof x.d; p: DiaDiem } => !!x.p);
  const diem = cap.map((x) => x.p);
  /* Kể chuyện theo cuộn: điểm dừng nào nằm giữa màn hình thì bản đồ bay tới điểm đó. */
  useEffect(() => {
    const io = new IntersectionObserver((ms) => ms.forEach((m) => { if (m.isIntersecting) setDang(Number((m.target as HTMLElement).dataset.i)); }), { rootMargin: '-45% 0px -45% 0px' });
    dsMuc.current.forEach((e) => e && io.observe(e));
    return () => io.disconnect();
  }, [cap.length]);
  if (isLoading) return <p className="py-24 text-center text-muted">{t('dangTai')}</p>;
  if (!l) return <section className="container-page py-24 text-center"><p>{t('khongCoLoTrinh')}</p><Link className="text-action" to="/lo-trinh">{t('tatCaLoTrinh')}</Link></section>;
  const pXem = ds.find((p) => p.id === xem);
  const pDang = diem[dang];
  const nhieuNgay = cap.some((x) => x.d.ngay > 1);
  return (
    <div className="animate-page">
      <ChupDiaHinh chup={{ diem: diem.filter((p) => !p.anh.length), tuyen: [{ id: l.id, diem }] }} />
      <DauTrang tieuDe={chon(l.ten, l.tenEn)} moTa={chon(l.moTa, l.moTaEn) || undefined}
        quayLai={<Link to="/lo-trinh" className="inline-flex min-h-[40px] items-center gap-1.5 text-action"><ArrowLeft className="h-4 w-4" />{t('tatCaLoTrinh')}</Link>}>
        <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-ink-2">
          {l.thoiGian && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted" />{l.thoiGian}</span>}
          {chon(l.phuongTien, l.phuongTienEn) && <span className="inline-flex items-center gap-1.5"><Bus className="h-4 w-4 text-muted" />{chon(l.phuongTien, l.phuongTienEn)}</span>}
          <span>{t('soDiemDung', { n: diem.length })}</span><span>{t('duongChimBay', { km: tongKm(diem) })}</span>
        </p>
      </DauTrang>
      <section className="container-page grid gap-8 py-12 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:order-2">
          <div className="lg:sticky lg:top-24">
            <BanDo ds={diem} tuyen={diem} chon={pDang?.id || null} lia={dang > 0 && pDang ? [pDang.lat, pDang.lng] : null} onChon={setXem} cao="h-[52svh] min-h-[340px] lg:h-[calc(100svh-8rem)]" />
            <a href={duongDanChiDuong(diem)} target="_blank" rel="noopener noreferrer" className="nut nut-chinh mt-4"><Navigation className="h-4 w-4" />{t('moGoogleMaps')}</a>
          </div>
        </div>
        <ol className="space-y-5 lg:col-span-5 lg:order-1 lg:pb-[30vh]">
          {cap.map(({ d, p }, i) => (
            <li key={p.id + i} ref={(e) => { dsMuc.current[i] = e; }} data-i={i}>
              {nhieuNgay && (i === 0 || d.ngay !== cap[i - 1].d.ngay) && <p className="mb-2 font-serif text-[22px] text-route">{t('ngay')} {d.ngay}</p>}
              <article className={`the overflow-hidden transition-shadow duration-500 ${dang === i ? 'shadow-sh-3 ring-2 ring-route/50' : ''}`}>
                <div className="relative h-40 bg-sunken"><KhungAnh p={p} />
                  <span className={`absolute bottom-3 left-3 z-[2] grid h-9 w-9 place-items-center bg-route text-sm font-bold text-white shadow-sh-2 ${i === cap.length - 1 ? 'rounded-lg' : 'rounded-full'}`}>{i + 1}</span></div>
                <div className="p-5">
                  <h2 className="text-[19px] font-semibold leading-snug">{chon(p.ten, p.tenEn)}</h2>
                  <p className="mt-1 text-[13px] text-muted">{i === 0 ? t('batDau') : t('cachDiemTruoc', { km: Math.max(1, Math.round(khoangCachKm(diem[i - 1], p))) })}{p.xa ? `, ${p.xa}` : ''}</p>
                  {d.ghiChu && <p className="mt-2 text-[15px] text-ink-2">{d.ghiChu}</p>}
                  <button type="button" onClick={() => setXem(p.id)} className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-action">{t('xemChiTiet')}<ArrowUpRight className="h-4 w-4" /></button>
                </div>
              </article>
            </li>))}
        </ol>
      </section>
      {pXem && <ChiTiet p={pXem} onDong={() => setXem(null)} />}
    </div>);
}

/* Tự tạo lộ trình: thứ tự điểm nằm ngay trên đường dẫn (?d=a,b,c), gửi đường dẫn là người nhận thấy đúng lộ trình — không cần tài khoản, không lưu gì trên máy chủ. */
export function TuTaoLoTrinh() {
  const { t, chon } = useNN();
  const [tham, datTham] = useSearchParams();
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const [xem, setXem] = useState<string | null>(null);
  const ids = useMemo(() => (tham.get('d') || '').split(',').filter(Boolean).slice(0, 20), [tham]);
  const diem = ids.map((i) => ds.find((p) => p.id === i)).filter((p): p is DiaDiem => !!p);
  const dat = (moi: string[]) => datTham(moi.length ? { d: moi.join(',') } : {}, { replace: true });
  const them = (i: string) => { if (i && !ids.includes(i)) dat([...ids, i]); };
  const doiCho = (i: number, j: number) => { const m = [...ids]; [m[i], m[j]] = [m[j], m[i]]; dat(m); };
  const chep = async () => { try { await navigator.clipboard.writeText(window.location.href); toast.success(t('daChep')); } catch { toast(window.location.href); } };
  const pXem = ds.find((p) => p.id === xem);
  const nutNho = 'grid h-10 w-10 place-items-center rounded-[10px] border border-line-strong/50 hover:bg-sunken disabled:opacity-35';
  return (
    <div className="animate-page">
      <DauTrang tieuDe={t('tuTaoLoTrinh')} moTa={t('tuTaoMoTa')}
        quayLai={<Link to="/lo-trinh" className="inline-flex min-h-[40px] items-center gap-1.5 text-action"><ArrowLeft className="h-4 w-4" />{t('tatCaLoTrinh')}</Link>} />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-12">
        {/* Bấm ghim trên bản đồ: chưa có trong lộ trình thì thêm, có rồi thì mở chi tiết. */}
        <div className="lg:col-span-7"><div className="lg:sticky lg:top-24"><BanDo ds={ds} tuyen={diem} onChon={(i) => (ids.includes(i) ? setXem(i) : them(i))} thap /></div></div>
        <div className="lg:col-span-5">
          <label className="block text-sm font-semibold text-ink-2">{t('themDiem')}
            <select className="o-nhap mt-1" value="" onChange={(e) => them(e.target.value)}>
              <option value="">{t('chonDiaDiem')}</option>{ds.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{chon(p.ten, p.tenEn)}</option>)}</select></label>
          {!diem.length ? <p className="the mt-4 p-5 text-[15px] text-muted">{t('chuaChonDiem')}</p> : (
            <ol className="mt-4 space-y-2">{diem.map((p, i) => (
              <li key={p.id} className="the flex items-center gap-2 p-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center bg-route text-sm font-bold text-white ${i === diem.length - 1 && i > 0 ? 'rounded-lg' : 'rounded-full'}`}>{i + 1}</span>
                <button type="button" onClick={() => setXem(p.id)} className="min-w-0 flex-1 text-left"><b className="block truncate text-[15px] font-semibold">{chon(p.ten, p.tenEn)}</b>
                  {i > 0 && <small className="text-xs text-muted">{t('cachDiemTruoc', { km: Math.max(1, Math.round(khoangCachKm(diem[i - 1], p))) })}</small>}</button>
                <button type="button" className={nutNho} disabled={i === 0} onClick={() => doiCho(i, i - 1)} aria-label={t('len')}><ArrowUp className="h-4 w-4" /></button>
                <button type="button" className={nutNho} disabled={i === diem.length - 1} onClick={() => doiCho(i, i + 1)} aria-label={t('xuong')}><ArrowDown className="h-4 w-4" /></button>
                <button type="button" className={nutNho} onClick={() => dat(ids.filter((x) => x !== p.id))} aria-label={t('bo')}><X className="h-4 w-4" /></button>
              </li>))}</ol>)}
          {diem.length > 1 && <><p className="mt-4 text-sm text-muted">{t('duongChimBay', { km: tongKm(diem) })}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={duongDanChiDuong(diem)} target="_blank" rel="noopener noreferrer" className="nut nut-chinh"><Navigation className="h-4 w-4" />{t('moGoogleMaps')}</a>
              <button type="button" onClick={chep} className="nut nut-vien"><Link2 className="h-4 w-4" />{t('chepDuongDan')}</button>
            </div></>}
        </div>
      </section>
      {pXem && <ChiTiet p={pXem} onDong={() => setXem(null)} />}
    </div>);
}
