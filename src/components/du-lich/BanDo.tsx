import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LOAI, giamChuyenDong } from '../../utils/hangSo';
import { useNN } from '../../i18n/NgonNgu';
import type { DiaDiem } from '../../utils/kieu';

/* Khung nhìn bao trọn thành phố Đồng Nai (sau hợp nhất với Bình Phước). */
const KHUNG: L.LatLngBoundsExpression = [[10.55, 106.55], [12.3, 107.6]];

/* Ghim tự vẽ bằng HTML: điểm nổi bật có vòng sáng lan ra để thu hút ánh nhìn. */
function ghim(p: DiaDiem) {
  const c = p.noiBat ? 20 : 15;
  return L.divIcon({ className: '', iconSize: [c, c], iconAnchor: [c / 2, c / 2],
    html: `<span class="ghim${p.noiBat ? ' noi' : ''}" style="--m:${LOAI[p.loai]?.mau || '#1B5E20'}"></span>` });
}
const soChang = (i: number) => L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 30], html: `<span class="so-chang">${i + 1}</span>` });

/** Di chuyển khung nhìn khi chọn điểm hoặc chọn lịch trình. */
function DieuKhien({ tam, khoaTuyen }: { tam: [number, number] | null; khoaTuyen: string }) {
  const map = useMap();
  /* Phụ thuộc vào CHUỖI khoá chứ không vào mảng toạ độ: mảng tạo mới mỗi lần
     vẽ, phụ thuộc vào mảng thì bản đồ bay lại liên tục mỗi khi trang cập nhật. */
  useEffect(() => {
    const toa = khoaTuyen ? khoaTuyen.split(';').map((x) => x.split(',').map(Number) as [number, number]) : [];
    if (toa.length > 1) map.flyToBounds(L.latLngBounds(toa).pad(0.3), { duration: giamChuyenDong() ? 0 : 0.8 });
  }, [map, khoaTuyen]);
  useEffect(() => {
    if (tam) map.flyTo(tam, Math.max(map.getZoom(), 11), { duration: giamChuyenDong() ? 0 : 0.6 });
  }, [map, tam]);
  return null;
}

export default function BanDo({ ds, tuyen = [], tam = null, onChon, thap = false }: {
  ds: DiaDiem[]; tuyen?: DiaDiem[]; tam?: [number, number] | null; onChon: (id: string) => void; thap?: boolean;
}) {
  const { chon } = useNN();
  const toaTuyen = tuyen.map((p) => [p.lat, p.lng] as [number, number]);
  return (
    <MapContainer bounds={KHUNG} scrollWheelZoom={false} className={`w-full rounded-2xl border border-slate-200 shadow-soft dark:border-slate-800 ${thap ? 'h-[380px] sm:h-[460px]' : 'h-[460px] sm:h-[600px]'}`}
      aria-label="Bản đồ điểm du lịch">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {ds.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={ghim(p)} title={chon(p.ten, p.tenEn)} riseOnHover eventHandlers={{ click: () => onChon(p.id) }}>
          <Tooltip direction="top" offset={[0, -8]}>{chon(p.ten, p.tenEn)}</Tooltip>
        </Marker>
      ))}
      {toaTuyen.length > 1 && <Polyline positions={toaTuyen} className="tuyen" pathOptions={{ color: '#1E3A5F', weight: 3.5, opacity: 0.85 }} />}
      {toaTuyen.map((t, i) => <Marker key={'c' + i} position={t} icon={soChang(i)} interactive={false} keyboard={false} />)}
      <DieuKhien tam={tam} khoaTuyen={toaTuyen.map((t) => t.join(',')).join(';')} />
    </MapContainer>
  );
}
