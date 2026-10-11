/**
 * Địa hình MINH HOẠ của thành phố Đồng Nai cho cảnh 3D ở trang chủ.
 *
 * Không phải dữ liệu độ cao thật: nền lên dần về phía bắc (cao nguyên Bù Gia
 * Mập), đồi bazan phía đông, cộng nhiễu. Những thứ đặt theo toạ độ thật:
 * núi Bà Rá, núi Chứa Chan, hồ Trị An, hồ Thác Mơ, hồ Suối Lam, sông Đồng Nai,
 * sông Bé (đường sông vẽ gần đúng) và 15 điểm đến. Giao diện ghi rõ
 * "Địa hình minh hoạ, không theo tỉ lệ".
 */

/** Khung toạ độ thành phố — trùng với bản đồ Leaflet. */
export const KHUNG = { latMin: 10.55, latMax: 12.3, lngMin: 106.55, lngMax: 107.6 };
const KM_LAT = 110.6, KM_LNG = 108.4;            // km mỗi độ ở vĩ độ ~11.4°
export const DON_VI_KM = 10;                       // 1 đơn vị cảnh = 10 km
export const PHONG_DAI = 9;                        // phóng độ cao cho dễ thấy núi
const TAM = { lat: (KHUNG.latMin + KHUNG.latMax) / 2, lng: (KHUNG.lngMin + KHUNG.lngMax) / 2 };

/** Toạ độ địa lý -> mặt phẳng cảnh (x hướng đông, z hướng nam). */
export function raCanh(lat: number, lng: number) {
  return { x: ((lng - TAM.lng) * KM_LNG) / DON_VI_KM, z: (-(lat - TAM.lat) * KM_LAT) / DON_VI_KM };
}
export function raDiaLy(x: number, z: number) {
  return { lat: TAM.lat - (z * DON_VI_KM) / KM_LAT, lng: TAM.lng + (x * DON_VI_KM) / KM_LNG };
}
export const doCaoRaY = (m: number) => (m / 1000 / DON_VI_KM) * PHONG_DAI;
export const MUC_NUOC = 6;                          // mét

/* ---------------------------------------------------------- nhiễu Perlin 2D */
const HOAN_VI = (() => {
  let s = 1715; const ngau = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(ngau() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return Uint8Array.from([...p, ...p]);
})();
const mo = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const doc = (h: number, x: number, y: number) => { const g = h & 7; const u = g < 4 ? x : y, v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); };
export function nhieu(x: number, y: number) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
  const u = mo(x), v = mo(y), P = HOAN_VI;
  const a = P[X] + Y, b = P[X + 1] + Y;
  const l1 = doc(P[a], x, y) + u * (doc(P[b], x - 1, y) - doc(P[a], x, y));
  const l2 = doc(P[a + 1], x, y - 1) + u * (doc(P[b + 1], x - 1, y - 1) - doc(P[a + 1], x, y - 1));
  return (l1 + v * (l2 - l1)) / 2.3;
}
const fbm = (x: number, y: number, tang = 5) => { let t = 0, bien = 1, tan = 1, tong = 0;
  for (let i = 0; i < tang; i++) { t += nhieu(x * tan, y * tan) * bien; tong += bien; bien *= 0.5; tan *= 2.03; } return t / tong; };
const em = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

/* --------------------------------------------- sông, hồ, núi theo toạ độ thật */
type Diem = [number, number];   // [lat, lng]
export const SONG: { ten: string; rong: number; ds: Diem[] }[] = [
  { ten: 'Sông Đồng Nai', rong: 0.75, ds: [[11.66, 107.78], [11.56, 107.6], [11.47, 107.46], [11.44, 107.37], [11.42, 107.31], [11.36, 107.27], [11.29, 107.23],
    [11.23, 107.18], [11.17, 107.12], [11.1, 107.03], [11.07, 106.98], [11.06, 106.93], [11.02, 106.88], [10.98, 106.84], [10.955, 106.815],
    [10.935, 106.832], [10.91, 106.86], [10.86, 106.88], [10.8, 106.86], [10.75, 106.82], [10.7, 106.82], [10.65, 106.86], [10.58, 106.9], [10.46, 106.96], [10.3, 107.0]] },
  { ten: 'Sông Bé', rong: 0.5, ds: [[12.42, 107.07], [12.25, 107.05], [12.05, 107.02], [11.92, 107.03], [11.86, 107.04], [11.78, 107.0], [11.66, 106.93],
    [11.52, 106.89], [11.38, 106.86], [11.22, 106.88], [11.12, 106.92], [11.065, 106.945]] },
];
/** Hồ: hợp của vài hình elip (tâm lat/lng, bán trục theo độ, góc xoay). */
export const HO: { ten: string; elip: [number, number, number, number, number][] }[] = [
  { ten: 'Hồ Trị An', elip: [[11.15, 107.08, 0.11, 0.055, -0.35], [11.2, 107.16, 0.07, 0.045, 0.2], [11.11, 107.03, 0.045, 0.03, 0]] },
  { ten: 'Hồ Thác Mơ', elip: [[11.875, 107.045, 0.04, 0.05, 0.4]] },
  { ten: 'Hồ Suối Lam', elip: [[11.6, 106.889, 0.014, 0.011, 0]] },
];
const NUI: { lat: number; lng: number; cao: number; rong: number }[] = [
  { lat: 11.8175, lng: 106.9999, cao: 690, rong: 0.028 },   // núi Bà Rá ~723 m
  { lat: 10.9411, lng: 107.3794, cao: 800, rong: 0.032 },   // núi Chứa Chan ~837 m
  { lat: 12.12, lng: 107.15, cao: 260, rong: 0.16 },        // cao nguyên Bù Gia Mập
  { lat: 11.5, lng: 107.42, cao: 160, rong: 0.1 },          // đồi rừng Cát Tiên
  { lat: 10.963, lng: 106.794, cao: 55, rong: 0.01 },       // núi đá Bửu Long
];

/* Đoạn sông đổi sang km phẳng một lần để tính khoảng cách nhanh. */
const DOAN = SONG.flatMap((s) => s.ds.slice(1).map((q, i) => {
  const p = s.ds[i]; return { ax: p[1] * KM_LNG, ay: p[0] * KM_LAT, bx: q[1] * KM_LNG, by: q[0] * KM_LAT, rong: s.rong };
}));
function denSong(lat: number, lng: number) {
  const x = lng * KM_LNG, y = lat * KM_LAT; let tot = Infinity, rong = 0.6;
  for (const d of DOAN) {
    const dx = d.bx - d.ax, dy = d.by - d.ay; const t = Math.max(0, Math.min(1, ((x - d.ax) * dx + (y - d.ay) * dy) / (dx * dx + dy * dy)));
    const ex = d.ax + t * dx - x, ey = d.ay + t * dy - y; const k = Math.sqrt(ex * ex + ey * ey);
    if (k < tot) { tot = k; rong = d.rong; }
  }
  return { km: tot, rong };
}
function trongHo(lat: number, lng: number) {
  let sau = -Infinity;
  for (const h of HO) for (const [la, ln, a, b, g] of h.elip) {
    const dx = (lng - ln) * KM_LNG / KM_LAT, dy = lat - la; const c = Math.cos(g), s = Math.sin(g);
    const u = (dx * c + dy * s) / a, v = (-dx * s + dy * c) / b;
    const r = u * u + v * v + nhieu(lng * 60, lat * 60) * 0.35;      // bờ hồ khúc khuỷu
    sau = Math.max(sau, 1 - r);
  }
  return sau;   // > 0 là trong hồ
}

export interface MauDat { cao: number; song: number; ho: number; dat: number }
/** Độ cao (mét) tại một toạ độ, kèm các hệ số để tô màu mặt đất. */
export function doCao(lat: number, lng: number): MauDat {
  let h = 18 + 330 * em(11.0, 12.1, lat) + 130 * em(107.05, 107.45, lng) * (1 - em(11.25, 11.7, lat));
  h += fbm(lng * 6.5, lat * 6.5) * (55 + 190 * em(11.05, 12.0, lat));
  h += Math.max(0, fbm(lng * 18 + 7, lat * 18 + 3, 3)) * 70 * em(10.9, 11.6, lat);   // gò đồi nhỏ
  for (const n of NUI) { const dx = (lng - n.lng) * KM_LNG / KM_LAT, dy = lat - n.lat; h += n.cao * Math.exp(-(dx * dx + dy * dy) / (2 * n.rong * n.rong)); }
  const s = denSong(lat, lng);
  const song = Math.exp(-((s.km / s.rong) ** 2));
  h -= 70 * Math.exp(-((s.km / 6) ** 2));                             // thung lũng rộng hai bên sông
  h = Math.max(h, MUC_NUOC + 6);
  h = h * (1 - song) + (MUC_NUOC - 4) * song;                         // lòng sông
  const ho = trongHo(lat, lng);
  if (ho > 0) h = Math.min(h, MUC_NUOC - 3 - ho * 10);
  else if (ho > -0.6) { const t = em(0, 0.6, -ho); h = (MUC_NUOC + 3) * (1 - t) + h * t; }   // bờ hồ thoải dần xuống nước
  const dat = fbm(lng * 22 + 40, lat * 22 - 11, 3);                   // loang đất đỏ, đồng ruộng
  return { cao: h, song, ho, dat };
}

/* ------------------------------------------------- dựng lưới độ cao + màu */
const tuyenTinh = (h: string) => [1, 3, 5].map((i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const MAU = {
  rung: tuyenTinh('#2C5A3F'), thap: tuyenTinh('#3E6D47'), dong: tuyenTinh('#7E8A55'), doDat: tuyenTinh('#7E4E33'),
  cao: tuyenTinh('#55634A'), da: tuyenTinh('#6F6A58'), cat: tuyenTinh('#A99A72'), day: tuyenTinh('#21352C'),
};
const pha = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export interface YeuCauLuoi { rong: number; sau: number; nx: number; nz: number; z0: number }
/** Độ cao (y, theo đơn vị cảnh) và màu (tuyến tính) cho lưới (nx+1)×(nz+1),
 *  thứ tự đỉnh trùng PlaneGeometry đã xoay nằm ngang: hàng từ bắc xuống nam. */
export function xayLuoi({ rong, sau, nx, nz, z0 }: YeuCauLuoi) {
  const n = (nx + 1) * (nz + 1);
  const y = new Float32Array(n), mau = new Float32Array(n * 3), phu = new Float32Array(n * 4);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i;
    const g = raDiaLy(-rong / 2 + (rong * i) / nx, z0 - sau / 2 + (sau * j) / nz);
    const d = doCao(g.lat, g.lng);
    y[k] = doCaoRaY(d.cao);
    phu.set([d.song, d.ho, d.dat, g.lat], k * 4);
  }
  const cx = rong / nx, cz = sau / nz;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i;
    const dx = (y[j * (nx + 1) + Math.min(i + 1, nx)] - y[j * (nx + 1) + Math.max(i - 1, 0)]) / (2 * cx);
    const dz = (y[Math.min(j + 1, nz) * (nx + 1) + i] - y[Math.max(j - 1, 0) * (nx + 1) + i]) / (2 * cz);
    const doc = Math.sqrt(dx * dx + dz * dz);
    const [song, ho, dat, lat] = [phu[k * 4], phu[k * 4 + 1], phu[k * 4 + 2], phu[k * 4 + 3]];
    const met = (y[k] / PHONG_DAI) * DON_VI_KM * 1000;
    let c = pha(MAU.thap, MAU.rung, em(40, 160, met));
    c = pha(c, MAU.dong, em(0.12, 0.5, dat) * (1 - em(11.1, 11.35, lat)) * 0.6);             // đồng ruộng phía nam
    c = pha(c, MAU.doDat, em(0.1, 0.5, dat) * em(11.25, 11.6, lat) * 0.55);                 // đất đỏ bazan phía bắc
    c = pha(c, MAU.cao, em(380, 620, met));
    c = pha(c, MAU.da, em(0.35, 0.8, doc));                                                 // sườn dốc lộ đá
    c = pha(c, MAU.cat, Math.max(em(0.35, 0.7, song) * (1 - em(0.85, 1, song)), ho > -0.12 && ho <= 0 ? 0.6 : 0) * 0.6);   // bãi bồi mỏng ven nước
    if (met < MUC_NUOC) c = MAU.day;
    mau.set(c, k * 3);
  }
  return { y, mau };
}
