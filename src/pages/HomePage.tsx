/**
 * Trang chủ: cảnh 3D mở đầu, khám phá điểm đến, bản đồ, lộ trình, đánh giá.
 * Mọi con số trên trang lấy từ máy chủ; không có dữ liệu thì nói thẳng là chưa có.
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import Hero from '../components/trang-chu/Hero';
import KhamPha from '../components/trang-chu/KhamPha';
import BanDoTuongTac, { type Tab } from '../components/trang-chu/BanDoTuongTac';
import LoTrinhNoiBat from '../components/trang-chu/LoTrinhNoiBat';
import DanhGiaKhach from '../components/trang-chu/DanhGiaKhach';
import ChiTiet from '../components/du-lich/ChiTiet';
import { layDiaDiem, layThongKe, layLoTrinh, layTinTuc } from '../services/api';
import { giamChuyenDong } from '../utils/hangSo';
import { useNN } from '../i18n/NgonNgu';

export default function HomePage() {
  const { t, chon: dich, ngay } = useNN();
  const { data: ds = [], isLoading, isError, error } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem });
  const { data: loTrinh = [] } = useQuery({ queryKey: ['lo-trinh'], queryFn: layLoTrinh });
  const { data: tin = [] } = useQuery({ queryKey: ['tin-tuc'], queryFn: layTinTuc });
  const { data: tk } = useQuery({ queryKey: ['thong-ke', ''], queryFn: () => layThongKe() });
  const canhBao = tin.filter((x) => x.loai === 'canh-bao');
  /* Tin nổi bật lên trước. */
  const suKien = tin.filter((x) => x.loai === 'su-kien' || x.loai === 'thong-bao').sort((a, b) => Number(!!b.noiBat) - Number(!!a.noiBat)).slice(0, 3);

  const [tuKhoa, setTuKhoa] = useState('');
  const [tab, setTab] = useState<Tab>('diem');
  const [chon, setChon] = useState<string | null>(null);
  const [tuyen, setTuyen] = useState<number | null>(null);
  const [vietCho, setVietCho] = useState<string | null>(null);
  const khuBanDo = useRef<HTMLElement>(null);
  const cuonToi = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: giamChuyenDong() ? 'auto' : 'smooth', block: 'start' });
  const toiBanDo = () => khuBanDo.current?.scrollIntoView({ behavior: giamChuyenDong() ? 'auto' : 'smooth', block: 'start' });
  const pViet = ds.find((p) => p.id === vietCho);

  return (
    <div className="animate-page">
      <Hero ds={ds} loTrinh={loTrinh}
        onTim={(q) => { setTuKhoa(q); cuonToi('kham-pha'); }} onToiBanDo={toiBanDo} onToiLoTrinh={() => cuonToi('lo-trinh')} />

      {/* Cảnh báo cán bộ đăng (mưa lũ, đóng cửa…): đặt ngay dưới mở đầu, không che cảnh. */}
      {canhBao.map((c) => <div key={c.id} role="alert" className="bg-[#FCEFC7] text-[#192522]">
        <div className="container-page flex items-start gap-2.5 py-3 text-[15px]"><AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0" />
          <span><b>{dich(c.tieuDe, c.tieuDeEn)}</b>{dich(c.noiDung, c.noiDungEn) && <> {dich(c.noiDung, c.noiDungEn)}</>}</span></div></div>)}

      {isError && <div className="container-page pt-10"><div className="the mx-auto max-w-xl px-5 py-4 text-center text-[15px]">
        <b className="block">{t('chuaTaiDuoc')}</b>{(error as Error)?.message}</div></div>}

      <KhamPha ds={ds} dangTai={isLoading} tuKhoa={tuKhoa} onBoTuKhoa={() => setTuKhoa('')}
        onXemBanDo={(id) => { setTab('diem'); setTuyen(null); setChon(id); toiBanDo(); }} />

      <BanDoTuongTac ref={khuBanDo} ds={ds} loTrinh={loTrinh} tab={tab} onTab={setTab} chon={chon} onChon={setChon} tuyen={tuyen} onTuyen={setTuyen} />

      <LoTrinhNoiBat ds={ds} loTrinh={loTrinh} onXemBanDo={(id) => { setTab('tuyen'); setChon(null); setTuyen(id); toiBanDo(); }} />

      <DanhGiaKhach ds={ds} tk={tk} onViet={setVietCho} />

      {suKien.length > 0 && <section className="py-16 sm:py-20">
        <div className="container-page">
          <div className="hien-dan mb-6 flex flex-wrap items-end justify-between gap-3"><h2 className="tieu-de-vua">{t('tinMoi')}</h2>
            <Link to="/tin-tuc" className="text-[15px] font-semibold text-action underline-offset-2 hover:underline">{t('tinTuc')}</Link></div>
          <div className="grid gap-4 md:grid-cols-3">{suKien.map((x, i) => (
            <Link key={x.id} to={`/tin-tuc/${x.id}`} className="hien-dan the block p-5 transition-shadow hover:shadow-sh-2" style={{ '--i': i } as React.CSSProperties}>
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted"><CalendarDays className="h-4 w-4" />
                {x.loai === 'su-kien' ? t('suKien') : t('thongBao')}{x.tuNgay ? `, ${ngay(x.tuNgay)}` : ''}{x.denNgay && x.denNgay !== x.tuNgay ? ` – ${ngay(x.denNgay)}` : ''}</span>
              <b className="mt-2 block text-[17px] font-semibold leading-snug">{dich(x.tieuDe, x.tieuDeEn)}</b>
              {dich(x.noiDung, x.noiDungEn) && <p className="mt-1.5 line-clamp-2 text-[15px] text-ink-2">{dich(x.noiDung, x.noiDungEn)}</p>}</Link>))}</div>
        </div>
      </section>}

      {pViet && <ChiTiet p={pViet} vietNgay onDong={() => setVietCho(null)} />}
    </div>
  );
}
