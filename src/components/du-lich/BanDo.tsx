import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hand, Maximize2 } from 'lucide-react';
import { giamChuyenDong, khoangCachKm } from '../../utils/hangSo';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem, Loai } from '../../utils/kieu';

/* Khung nhìn bao trọn thành phố Đồng Nai (sau hợp nhất với Bình Phước). */
const KHUNG: L.LatLngBoundsExpression = [[10.55, 106.55], [12.3, 107.6]];
const BAY = 0.85;   // giây bay tới tuyến; đường bắt đầu vẽ khi máy quay tới nơi

/* Biểu tượng loại hình vẽ tay theo bộ lucide (nét 2, 24×24) — ghim phân biệt
   loại bằng HÌNH, không chỉ bằng màu. */
const HINH: Record<Loai, string> = {
  'thien-nhien': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  'di-tich': '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l8 5H4z"/>',
  'vui-choi': '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>',
  'luu-tru': '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 18h20"/>',
  'am-thuc': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  'dac-san': '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>',
};
function ghim(p: DiaDiem, chon: boolean, mo: boolean) {
  const c = chon ? 30 : p.noiBat ? 28 : 24;
  return L.divIcon({ className: '', iconSize: [c, c], iconAnchor: [c / 2, c / 2],
    html: `<span class="ghim${chon ? ' dang-chon' : ''}${mo ? ' mo' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${HINH[p.loai] || HINH['thien-nhien']}</svg></span>` });
}
const soChang = (i: number, n: number, tre: number) => L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
  html: `<span class="so-chang${i === 0 ? ' dau' : i === n - 1 ? ' cuoi' : ''}" style="--tre:${Math.round(tre)}ms">${i + 1}</span>` });

/** Di chuyển khung nhìn khi chọn điểm hoặc tuyến; vẽ tuyến sau khi bay tới. */
function DieuKhien({ tam, khoaTuyen, tuyen, choKeo }: { tam: [number, number] | null; khoaTuyen: string; tuyen: React.RefObject<L.Polyline>; choKeo: boolean }) {
  const map = useMap();
  /* Phụ thuộc vào CHUỖI khoá chứ không vào mảng toạ độ: mảng tạo mới mỗi lần
     vẽ, phụ thuộc vào mảng thì bản đồ bay lại liên tục mỗi khi trang cập nhật. */
  useEffect(() => {
    const toa = khoaTuyen ? khoaTuyen.split(';').map((x) => x.split(',').map(Number) as [number, number]) : [];
    if (toa.length < 2) return;
    const giam = giamChuyenDong();
    map.flyToBounds(L.latLngBounds(toa).pad(0.3), { duration: giam ? 0 : BAY });
    if (giam) return;
    /* Vẽ đường: dash dài bằng cả đường, lùi offset về 0. Xong thì gỡ dash —
       Leaflet vẽ lại đường mỗi lần phóng to, dash cũ sẽ làm đường đứt. */
    let hoatAnh: Animation | null = null;
    const cho = window.setTimeout(() => {
      const duong = tuyen.current?.getElement() as SVGPathElement | undefined;
      if (!duong?.getTotalLength) return;
      const dai = duong.getTotalLength();
      duong.style.strokeDasharray = `${dai}`;
      hoatAnh = duong.animate([{ strokeDashoffset: dai }, { strokeDashoffset: 0 }], { duration: Math.min(1600, Math.max(600, 300 * (toa.length - 1))), easing: 'cubic-bezier(.65,0,.35,1)' });
      hoatAnh.onfinish = () => { duong.style.strokeDasharray = ''; };
    }, BAY * 1000);
    return () => { window.clearTimeout(cho); hoatAnh?.cancel(); const d = tuyen.current?.getElement() as SVGPathElement | undefined; if (d) d.style.strokeDasharray = ''; };
  }, [map, khoaTuyen, tuyen]);
  useEffect(() => {
    if (tam) map.flyTo(tam, Math.max(map.getZoom(), 11), { duration: giamChuyenDong() ? 0 : 0.6 });
  }, [map, tam]);
  useEffect(() => { if (choKeo) map.dragging.enable(); else map.dragging.disable(); }, [map, choKeo]);
  return null;
}
function NutToanCanh() {
  const map = useMap(); const { t } = useNN();
  return <button type="button" onClick={() => map.flyToBounds(KHUNG, { duration: giamChuyenDong() ? 0 : 0.7 })} title={t('xemToanBo')} aria-label={t('xemToanBo')}
    className="kinh absolute right-3 top-3 z-[1000] grid h-10 w-10 place-items-center rounded-xl shadow-sh-2"><Maximize2 className="h-[18px] w-[18px]" /></button>;
}

export default function BanDo({ ds, tuyen = [], tam = null, chon = null, onChon, thap = false, cao }: {
  ds: DiaDiem[]; tuyen?: DiaDiem[]; tam?: [number, number] | null; chon?: string | null; onChon: (id: string) => void; thap?: boolean; cao?: string;
}) {
  const { chon: dich, t } = useNN();
  const duong = useRef<L.Polyline>(null);
  /* Màn cảm ứng: bản đồ không "nuốt" thao tác cuộn trang cho tới khi người dùng chạm kích hoạt. */
  const [camUng] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  const [choKeo, setChoKeo] = useState(!camUng);
  const toaTuyen = tuyen.map((p) => [p.lat, p.lng] as [number, number]);
  const trongTuyen = new Set(tuyen.map((p) => p.id));
  /* Điểm dừng hiện ra đúng lúc nét vẽ đi tới (tỉ lệ theo quãng đường). */
  const tong = tuyen.slice(1).reduce((s, p, i) => s + khoangCachKm(tuyen[i], p), 0) || 1;
  const thoiGianVe = Math.min(1600, Math.max(600, 300 * (tuyen.length - 1)));
  let daDi = 0;
  const tre = tuyen.map((p, i) => { if (i) daDi += khoangCachKm(tuyen[i - 1], p); return giamChuyenDong() ? 0 : BAY * 1000 + (daDi / tong) * thoiGianVe; });
  return (
    <div className={`relative isolate overflow-hidden rounded-[20px] shadow-sh-3 ${cao || (thap ? 'h-[380px] sm:h-[460px]' : 'h-[460px] sm:h-[600px]')}`}>
      <MapContainer bounds={KHUNG} scrollWheelZoom={false} zoomControl={false} dragging={!camUng} className="ban-do-khung h-full w-full" aria-label={t('banDo')}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomright" />
        {ds.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}
            icon={ghim(p, chon === p.id, toaTuyen.length > 1 && !trongTuyen.has(p.id))} title={dich(p.ten, p.tenEn)} riseOnHover eventHandlers={{ click: () => onChon(p.id) }}>
            <Tooltip direction="top" offset={[0, -14]}>{dich(p.ten, p.tenEn)}</Tooltip>
          </Marker>
        ))}
        {toaTuyen.length > 1 && <Polyline key={toaTuyen.join(';')} ref={duong} positions={toaTuyen} className="tuyen" pathOptions={{ color: '#D4552F', weight: 4, opacity: 0.95 }} />}
        {toaTuyen.map((toa, i) => <Marker key={'c' + toaTuyen.join(';') + i} position={toa} icon={soChang(i, toaTuyen.length, tre[i])} interactive={false} keyboard={false} zIndexOffset={1000} />)}
        <DieuKhien tam={tam} khoaTuyen={toaTuyen.map((x) => x.join(',')).join(';')} tuyen={duong} choKeo={choKeo} />
        <NutToanCanh />
      </MapContainer>
      {!choKeo && <button type="button" onClick={() => setChoKeo(true)}
        className="kinh absolute bottom-3 left-3 z-[1000] inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sh-2">
        <Hand className="h-4 w-4" />{t('chamDeDung')}</button>}
    </div>
  );
}
