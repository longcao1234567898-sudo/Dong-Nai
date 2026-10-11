/**
 * Mục "Quan sát 360°" ở trang riêng của địa điểm: chọn một điểm quan sát (đỉnh
 * núi, cổng chính, bờ hồ…) rồi kéo để nhìn quanh từ chính vị trí đó — ngay trên
 * trang, không phải rời sang Google Maps.
 *   - Ảnh cán bộ tải lên: xem bằng Pannellum (tải sau khi cần).
 *   - Ảnh 360° trên Google Maps (Street View, ảnh 360° người dùng đăng): nhúng thẳng
 *     khung xem của Google (mã nhúng cán bộ dán ở mục Địa điểm).
 * Điểm chưa có ảnh 360° nào thì không hiện mục này.
 */
import { lazy, Suspense, useState } from 'react';
import { Orbit } from 'lucide-react';
import { anhQuanSatUrl } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem } from '../../utils/kieu';

const KhungXem360 = lazy(() => import('./KhungXem360'));

/** Khung xem 360° của Google Maps nhúng trong trang. */
export function KhungGoogle360({ url, nhan, className = '' }: { url: string; nhan: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-[#0C2925] ${className}`}>
      <iframe src={url} title={nhan} className="absolute inset-0 h-full w-full border-0" loading="lazy" allowFullScreen
        referrerPolicy="no-referrer-when-downgrade" allow="fullscreen; accelerometer; gyroscope" />
    </div>);
}

export default function QuanSat360({ p }: { p: DiaDiem }) {
  const { t, chon, nn } = useNN();
  /* Điểm Google thiếu đường dẫn thì bỏ qua, không hiện khung trống. */
  const ds = (p.quanSat || []).filter((q) => q.nguon !== 'google' || !!q.googleUrl);
  const [chonId, setChonId] = useState<number | null>(null);
  if (!ds.length) return null;
  const hien = ds.find((q) => q.id === chonId) || ds[0];
  const nhan = `${t('quanSat360')}: ${chon(hien.ten, hien.tenEn)}`;
  const khung = 'mt-4 aspect-[4/5] sm:aspect-[16/9]';
  return (
    <section className="mt-8 border-t border-line pt-8" aria-labelledby="quan-sat">
      <h2 id="quan-sat" className="tieu-de-vua flex items-center gap-2 text-[22px]"><Orbit className="h-5 w-5 text-action" />{t('quanSat360')}</h2>
      <p className="mt-1 text-[15px] text-muted">{t('quanSatHuongDan')}</p>
      {ds.length > 1 && <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t('quanSat360')}>
        {ds.map((q) => <button key={q.id} type="button" role="tab" aria-selected={q.id === hien.id} className="chip min-h-[38px]"
          aria-pressed={q.id === hien.id} onClick={() => setChonId(q.id)}>{chon(q.ten, q.tenEn)}</button>)}
      </div>}
      {hien.nguon === 'google' && hien.googleUrl
        ? <KhungGoogle360 key={hien.id} url={hien.googleUrl} nhan={nhan} className={khung} />
        : <Suspense fallback={<div className={`${khung} rounded-[20px] bg-[#0C2925]`} />}>
          <KhungXem360 key={hien.id} src={anhQuanSatUrl(hien.id)} gocNgang={hien.gocNgang} huongDau={hien.huongDau} tuXoay en={nn === 'en'} nhan={nhan} className={khung} />
        </Suspense>}
      <p className="mt-2 text-[13px] text-muted">{t('dangDungTai')}: <b className="font-semibold text-ink-2">{chon(hien.ten, hien.tenEn)}</b>
        {hien.nguon === 'google' && <span>, {t('anhTuGoogle')}</span>}</p>
    </section>);
}
