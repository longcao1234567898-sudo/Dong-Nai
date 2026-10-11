/**
 * Mục "Quan sát 360°" ở trang riêng của địa điểm: chọn một điểm quan sát (đỉnh
 * núi, cổng chính, bến thuyền…) rồi kéo để nhìn quanh từ chính vị trí đó.
 * Luôn kèm đường sang Street View của Google Maps quanh toạ độ điểm (miễn phí,
 * không cần khoá) cho những nơi cán bộ chưa có ảnh 360°.
 */
import { lazy, Suspense, useState } from 'react';
import { Orbit, ExternalLink } from 'lucide-react';
import { anhQuanSatUrl } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem } from '../../utils/kieu';

const KhungXem360 = lazy(() => import('./KhungXem360'));

export default function QuanSat360({ p }: { p: DiaDiem }) {
  const { t, chon, nn } = useNN();
  const ds = p.quanSat || [];
  const [chonId, setChonId] = useState<number | null>(null);
  const hien = ds.find((q) => q.id === chonId) || ds[0];
  const streetView = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.lat},${p.lng}`;
  return (
    <section className="mt-8 border-t border-line pt-8" aria-labelledby="quan-sat">
      <h2 id="quan-sat" className="tieu-de-vua flex items-center gap-2 text-[22px]"><Orbit className="h-5 w-5 text-action" />{t('quanSat360')}</h2>
      {hien ? (<>
        <p className="mt-1 text-[15px] text-muted">{t('quanSatHuongDan')}</p>
        {ds.length > 1 && <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t('quanSat360')}>
          {ds.map((q) => <button key={q.id} type="button" role="tab" aria-selected={q.id === hien.id} className="chip min-h-[38px]"
            aria-pressed={q.id === hien.id} onClick={() => setChonId(q.id)}>{chon(q.ten, q.tenEn)}</button>)}
        </div>}
        <Suspense fallback={<div className="mt-4 aspect-[4/5] rounded-[20px] bg-[#0C2925] sm:aspect-[16/9]" />}>
          <KhungXem360 key={hien.id} src={anhQuanSatUrl(hien.id)} gocNgang={hien.gocNgang} huongDau={hien.huongDau} tuXoay en={nn === 'en'}
            nhan={`${t('quanSat360')}: ${chon(hien.ten, hien.tenEn)}`} className="mt-4 aspect-[4/5] sm:aspect-[16/9]" />
        </Suspense>
        <p className="mt-2 text-[13px] text-muted">{t('dangDungTai')}: <b className="font-semibold text-ink-2">{chon(hien.ten, hien.tenEn)}</b></p>
      </>) : <p className="mt-1 text-[15px] text-muted">{t('chuaCoQuanSat')}</p>}
      <a href={streetView} target="_blank" rel="noopener noreferrer" className="nut nut-vien mt-4"><ExternalLink className="h-4 w-4" />{t('xemStreetView')}</a>
    </section>);
}
