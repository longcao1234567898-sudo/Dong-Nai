/**
 * CỔNG KIỂM TRA "KHÔNG PHẢI NGƯỜI MÁY" — chỗ DUY NHẤT có ô Cloudflare Turnstile.
 *
 * Chỉ ở trang du khách; khu cán bộ (/dang-nhap, /quan-tri) không có. Hiện khi
 * mở trang mà thiết bị chưa có vé; qua ô thì máy chủ cấp vé 1 giờ gắn mã thiết
 * bị (services/xacMinh.ts) — mỗi thiết bị mỗi giờ kiểm tra một lần. Hết giờ thì
 * cổng hiện lại ở lần chuyển trang tiếp theo, hoặc lúc bấm gửi (khi đó trang
 * bên dưới giữ nguyên chữ đã gõ).
 *
 * Trang vẫn dựng và tải dữ liệu phía sau cổng (bị khoá thao tác bằng inert),
 * nên qua cổng là thấy nội dung ngay. Chưa khai VITE_TURNSTILE_SITE_KEY thì
 * cổng tắt hẳn.
 *
 * ⚠️ CỔNG KHÔNG BAO GIỜ ĐƯỢC GIỮ CHÂN NGƯỜI XEM VÌ MÁY CHỦ.
 * Lỗi đã gặp thật: Cloudflare báo "Thành công!" nhưng máy chủ Render (gói miễn
 * phí, đang ngủ hoặc đang hỏng) không trả lời, cổng xoay "Đang mở trang…" mười
 * lăm phút. Nay lúc MỚI VÀO: Cloudflare báo thành công là mở trang ngay, việc
 * đổi mã lấy vé chạy ngầm phía sau. Đổi vé hỏng cũng không sao: máy chủ vẫn tự
 * chặn mọi lần gửi thiếu vé, lúc đó cổng hiện lại (chế độ "kiểm tra lại").
 * Chế độ kiểm tra lại thì đợi có vé (người dùng sắp bấm gửi), có báo máy chủ
 * đang khởi động, có nút quay lại trang — không có đường kẹt.
 */
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Turnstile from './Turnstile';
import { DauHieu } from '../layout/Header';
import { captchaEnabled, layVe, SU_KIEN_CAN_XAC_MINH } from '../../services/xacMinh';
import { doiVeXacMinh, layDiaDiem, LoiApi } from '../../services/api';
import { KhungAnh } from '../du-lich/GiaoDien';
import { anhMacDinh } from '../../utils/anhMacDinh';
import { useNN } from '../../i18n/NgonNgu';

export default function CongXacMinh({ children }: { children: ReactNode }) {
  const { t, nn, doi, chon } = useNN();
  const { pathname } = useLocation();
  const khuCanBo = /^\/(dang-nhap|quan-tri)(\/|$)/.test(pathname);
  const [can, setCan] = useState(() => captchaEnabled && !khuCanBo && !layVe());
  const [lanLai, setLanLai] = useState(false);
  const [dang, setDang] = useState(false);
  const [cham, setCham] = useState(false);
  const [loi, setLoi] = useState('');
  const [khoa, setKhoa] = useState(0);
  /* Màn rộng: bên phải một ảnh thật của điểm nổi bật (dùng chung dữ liệu với trang chủ, không tải thêm). */
  const { data: ds = [] } = useQuery({ queryKey: ['dia-diem'], queryFn: layDiaDiem, enabled: can });
  const diemAnh = useMemo(() => [...ds].sort((a, b) => Number(b.noiBat) - Number(a.noiBat))
    .find((p) => p.anh?.length || (anhMacDinh(p.id)?.rong ?? 0) >= 1280), [ds]);
  const trang = useRef<HTMLDivElement>(null);
  const hop = useRef<HTMLDivElement>(null);

  /* Mỗi lần chuyển trang: vào khu cán bộ thì đóng cổng; ở trang du khách mà vé đã hết giờ thì hiện cổng. */
  useEffect(() => {
    if (!captchaEnabled) return;
    if (khuCanBo) { setCan(false); setLanLai(false); return; }
    if (!layVe()) setCan(true);
  }, [pathname, khuCanBo]);

  useEffect(() => {
    if (!captchaEnabled) return;
    const hienLai = () => { setLanLai(true); setLoi(''); setKhoa((k) => k + 1); setCan(true); };
    window.addEventListener(SU_KIEN_CAN_XAC_MINH, hienLai);
    return () => window.removeEventListener(SU_KIEN_CAN_XAC_MINH, hienLai);
  }, []);

  /* Khi cổng đang mở: trang phía sau không bấm, không Tab tới được, không cuộn. */
  useEffect(() => {
    const el = trang.current;
    if (!can || !el) return;
    el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true');
    const cuon = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    hop.current?.focus();
    return () => { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); document.documentElement.style.overflow = cuon; };
  }, [can]);

  const dong = () => { setCan(false); setLanLai(false); setLoi(''); };
  const nhanMa = async (ma: string) => {
    if (!ma) return;
    const doiVe = doiVeXacMinh(ma);
    if (!lanLai) {
      /* Mới vào: mở trang ngay, đổi vé chạy ngầm. */
      dong();
      doiVe.catch((e: LoiApi) => console.warn('[cổng kiểm tra] chưa đổi được vé, lần gửi sau sẽ hỏi lại:', e.trangThai ?? 'không tới được máy chủ', e.message));
      return;
    }
    setDang(true); setLoi(''); setCham(false);
    const hen = window.setTimeout(() => setCham(true), 6000);
    try { await doiVe; dong(); }
    catch (e) {
      const le = e as LoiApi;
      setLoi(le.trangThai ? le.message || t('xmLoi') : t('xmMayChuKhongTraLoi'));
      setKhoa((k) => k + 1);
    } finally { window.clearTimeout(hen); setDang(false); setCham(false); }
  };

  return (<>
    <div ref={trang} className="contents">{children}</div>
    {can && (
      <div ref={hop} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="xm-tieu-de" aria-describedby="xm-mo-ta"
        className="nen-toi fixed inset-0 z-[3000] overflow-y-auto outline-none">
        {/* Lớp đường đồng mức đặt ở khối con: .nen-dong-muc tự đặt position: relative. */}
        <div className="nen-dong-muc flex min-h-full flex-col">
        <div className="container-page flex items-center justify-between py-5">
          <span className="flex items-center gap-2.5 font-serif text-xl"><DauHieu co={34} />{t('tenTrang')}</span>
          <button type="button" onClick={doi} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#F7F5EF]/80 hover:bg-white/10 hover:text-[#F7F5EF]">
            {nn === 'vi' ? 'English' : 'Tiếng Việt'}</button>
        </div>
        <div className="container-page grid flex-1 items-center gap-12 pb-16 lg:grid-cols-[1fr_minmax(0,420px)]">
          <div className="max-w-xl">
            <h1 id="xm-tieu-de" className="font-serif text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] tracking-[-0.01em]">
              {t(lanLai ? 'xmLaiTieuDe' : 'xmTieuDe')}</h1>
            <p id="xm-mo-ta" className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-[#F7F5EF]/80">{t(lanLai ? 'xmLaiMoTa' : 'xmMoTa')}</p>
            <div className="mt-8 min-h-[72px]">
              <Turnstile key={`${nn}-${khoa}`} ngonNgu={nn === 'en' ? 'en' : 'vi'} gon onToken={nhanMa} />
            </div>
            <p role="status" className="mt-3 flex min-h-[24px] items-center gap-2 text-sm text-[#F7F5EF]/70">
              {dang && <><Loader2 className="h-4 w-4 shrink-0 animate-spin" />{t(cham ? 'xmMayChuDangDay' : 'xmDangXacNhan')}</>}</p>
            {loi && <div role="alert" className="mt-2 max-w-md rounded-xl bg-[#FDECEA] px-4 py-3 text-sm text-[#8A1C12]">{loi}
              <button type="button" className="ml-2 font-semibold underline" onClick={() => { setLoi(''); setKhoa((k) => k + 1); }}>{t('xmThuLai')}</button></div>}
            {lanLai && <button type="button" onClick={dong} className="nut mt-6 border border-white/25 text-[#F7F5EF] hover:bg-white/10">{t('xmQuayLai')}</button>}
          </div>
          {diemAnh && <figure className="hidden lg:block">
            <div className="relative aspect-[4/5] max-h-[68vh] overflow-hidden rounded-[28px] bg-white/5 shadow-[0_30px_80px_-30px_rgb(0_0_0/.6)]">
              <KhungAnh p={diemAnh} sizes="420px" uuTien /></div>
            <figcaption className="mt-3 text-sm text-[#F7F5EF]/65">{t('trongAnh')}: {chon(diemAnh.ten, diemAnh.tenEn)}</figcaption>
          </figure>}
        </div>
        </div>
      </div>)}
  </>);
}
