/**
 * Cảnh 3D ở phần mở đầu: địa hình minh hoạ thành phố Đồng Nai lúc rạng sáng,
 * nhìn từ phía nam (Biên Hoà) ngược lên cao nguyên phía bắc. Cuộn trang thì
 * máy quay bay dần về phía bắc ("Đi xa hơn"); rê chuột thì cảnh lệch nhẹ theo.
 *
 * - Lưới độ cao dựng ở luồng phụ (diaHinh.worker.ts).
 * - Khuất khỏi màn hình hoặc tab ẩn thì dừng vẽ.
 * - Người dùng bật "giảm chuyển động": vẽ đúng một khung, không bay, không trôi.
 * - Không có WebGL: báo cho trang cha (onLoi) để giữ nền dự phòng.
 */
import { useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping, BackSide, CanvasTexture, Color, DirectionalLight, Fog, HemisphereLight, Mesh, MeshStandardMaterial,
  PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, Scene, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, Vector2, Vector3, WebGLRenderer, BufferAttribute, CatmullRomCurve3, TubeGeometry, MeshBasicMaterial,
  CylinderGeometry, Group, type Texture, type WebGLRenderTarget,
} from 'three';
import { raCanh, doCao, doCaoRaY, MUC_NUOC, xayLuoi, type YeuCauLuoi } from './diaHinh';
import { coAnhCanh, datAnhCanh } from './anhCanh';

export interface Ghim3D { id: string; ten: string; lat: number; lng: number; noiBat: boolean }
/** Những gì cần chụp ảnh nhìn từ trên cao: từng điểm đến, từng lộ trình. */
export interface YeuCauChup { diem: { id: string; lat: number; lng: number }[]; tuyen: { id: number; diem: { lat: number; lng: number }[] }[] }

const MAU_TROI = { dinh: '#0C2925', chanTroi: '#D59F84', mat: '#FFD7A1', dat: '#0E1F1B' };
/* Mặt trời rạng sáng ở phía đông bắc, thấp: nắng xiên làm núi đổ bóng dài, và
   vùng sáng nằm bên phải — chữ tiêu đề bên trái đứng trên nền trời tối. */
const HUONG_MAT_TROI = new Vector3(0.86, 0.15, -0.48).normalize();

/* Hành trình máy quay: [lat, lng, độ cao máy quay (đơn vị cảnh)], nhìn về [lat, lng]. */
/* Nhìn chúc xuống đủ để đường chân trời nằm cao (~15% khung): tiêu đề bên trái
   đứng trên mặt đất tối chứ không trên vùng trời sáng. */
const MAY = {
  batDau: { o: [10.36, 106.96, 1.35], nhin: [11.2, 107.0] },
  nghi: { o: [10.6, 106.98, 2.1], nhin: [11.45, 107.05] },
  cuoi: { o: [11.0, 107.03, 2.9], nhin: [11.95, 107.08] },
};

const troiVert = /* glsl */ `varying vec3 vHuong; void main() { vHuong = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const troiFrag = /* glsl */ `
uniform vec3 uDinh; uniform vec3 uChan; uniform vec3 uMat; uniform vec3 uDat; uniform vec3 uHuongMat;
varying vec3 vHuong;
void main() {
  vec3 d = normalize(vHuong);
  float t = pow(clamp(d.y, 0.0, 1.0), 0.42);
  vec3 c = mix(uChan, uDinh, t);
  float s = max(dot(d, uHuongMat), 0.0);
  c += uMat * (pow(s, 5.0) * 0.32 + pow(s, 48.0) * 0.55 + pow(s, 1400.0) * 4.0);
  c = mix(c, uChan, smoothstep(0.0, -0.06, d.y));   // dưới chân trời: cùng màu sương, mép đất xa tan vào trời
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Bản đồ pháp tuyến gợn sóng, lặp liền mạch (tần số nguyên). */
function taoGonSong() {
  const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const ctx = cv.getContext('2d'); if (!ctx) return null;
  const anh = ctx.createImageData(n, n);
  const song: [number, number, number, number][] = [[3, 1, 0.9, 0.2], [-2, 5, 0.6, 1.3], [7, -3, 0.35, 2.1], [1, 9, 0.25, 0.7], [-11, 4, 0.18, 2.9]];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let dx = 0, dy = 0;
    for (const [kx, ky, a, p] of song) { const g = 2 * Math.PI * (kx * x + ky * y) / n + p; dx += a * kx * Math.cos(g); dy += a * ky * Math.cos(g); }
    const nx = -dx * 0.08, ny = -dy * 0.08, l = Math.hypot(nx, ny, 1), i = (y * n + x) * 4;
    anh.data[i] = (nx / l * 0.5 + 0.5) * 255; anh.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; anh.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; anh.data[i + 3] = 255;
  }
  ctx.putImageData(anh, 0, 0);
  const tx = new CanvasTexture(cv); tx.wrapS = tx.wrapT = RepeatWrapping; tx.repeat.set(60, 60);
  return tx;
}

function dungLuoi(yc: YeuCauLuoi): Promise<{ y: Float32Array; mau: Float32Array }> {
  return new Promise((ok) => {
    try {
      const w = new Worker(new URL('./diaHinh.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e) => { ok(e.data); w.terminate(); };
      w.onerror = () => { w.terminate(); ok(xayLuoi(yc)); };
      w.postMessage(yc);
    } catch { ok(xayLuoi(yc)); }
  });
}

const em = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
const tron = (a: number, b: number, t: number) => a + (b - a) * t;

const mocMauSanHo = () => new MeshBasicMaterial({ color: new Color('#F17C5B'), toneMapped: false, fog: false });
/** Đốm san hô đánh dấu một điểm trong ảnh chụp: chấm tròn trên một cây cột mảnh. */
function cotMoc(p: Vector3, to = 1) {
  const g = new Group();
  const cot = new Mesh(new CylinderGeometry(0.004 * to, 0.004 * to, 0.12 * to, 6), mocMauSanHo()); cot.position.set(p.x, p.y + 0.06 * to, p.z);
  const cham = new Mesh(new SphereGeometry(0.022 * to, 16, 12), mocMauSanHo()); cham.position.set(p.x, p.y + 0.13 * to, p.z);
  g.add(cot, cham); return g;
}
const viTriDat = (lat: number, lng: number, noi = 0) => { const p = raCanh(lat, lng); return new Vector3(p.x, Math.max(doCaoRaY(doCao(lat, lng).cao), doCaoRaY(MUC_NUOC)) + noi, p.z); };

export default function Canh3D({ ghim = [], cheDo = 'hero', chup, vungChu, onSanSang, onLoi, onChon }: {
  ghim?: Ghim3D[]; cheDo?: 'hero' | 'nen'; chup?: YeuCauChup; vungChu?: React.RefObject<HTMLElement>;
  onSanSang?: () => void; onLoi?: () => void; onChon?: (id: string) => void;
}) {
  const khung = useRef<HTMLDivElement>(null);
  const lopGhim = useRef<HTMLDivElement>(null);
  const goiLai = useRef({ onSanSang, onLoi, onChon, vungChu });
  goiLai.current = { onSanSang, onLoi, onChon, vungChu };
  const khoaGhim = ghim.map((g) => g.id).join(',');
  const yeuCauChup = useRef(chup); yeuCauChup.current = chup;
  const khoaChup = chup ? chup.diem.map((d) => d.id).join(',') + '|' + chup.tuyen.map((t) => t.id).join(',') : '';
  /* Ghim và yêu cầu chụp có thể tới SAU khi cảnh đã dựng (dữ liệu tải muộn):
     cập nhật qua ref, không dựng lại cảnh. */
  const diemGhim = useRef<Vector3[]>([]);
  const lenHangRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    diemGhim.current = ghim.map((g) => viTriDat(g.lat, g.lng, 0.05));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoaGhim]);
  useEffect(() => { lenHangRef.current(); }, [khoaChup]);

  useEffect(() => {
    const vo = khung.current; if (!vo) return;
    const giam = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nhe = vo.clientWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: !nhe, alpha: false, powerPreference: 'high-performance' });
    } catch { goiLai.current.onLoi?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nhe ? 1.25 : 1.75));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !nhe;
    renderer.shadowMap.type = PCFSoftShadowMap;
    const cv = renderer.domElement;
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    vo.prepend(cv);

    const canh = new Scene();
    const mauChan = new Color(MAU_TROI.chanTroi);
    /* Sương xa trùng màu chân trời: mép xa của mặt đất tan vào trời, không lộ đường cắt. */
    canh.fog = new Fog(mauChan.clone(), 9, 23);

    /* Bầu trời: vừa vẽ làm nền, vừa dựng bản đồ môi trường để mặt đất và mặt
       nước nhận đúng màu trời (ánh sáng môi trường) — thứ làm cảnh hết "nhựa". */
    const troiMat = new ShaderMaterial({
      vertexShader: troiVert, fragmentShader: troiFrag, side: BackSide, depthWrite: false, fog: false,
      uniforms: { uDinh: { value: new Color(MAU_TROI.dinh) }, uChan: { value: mauChan }, uMat: { value: new Color(MAU_TROI.mat) },
        uDat: { value: new Color(MAU_TROI.dat) }, uHuongMat: { value: HUONG_MAT_TROI } },
    });
    const troi = new Mesh(new SphereGeometry(60, 48, 24), troiMat);
    canh.add(troi);
    const pmrem = new PMREMGenerator(renderer);
    const canhTroi = new Scene(); canhTroi.add(new Mesh(new SphereGeometry(10, 48, 24), troiMat));
    let moiTruong: WebGLRenderTarget | null = null;
    try { moiTruong = pmrem.fromScene(canhTroi, 0.02, 0.1, 100); canh.environment = moiTruong.texture; } catch { /* không có thì chỉ dùng đèn */ }

    /* Nắng ấm + ánh trời lạnh: hai nguồn khác nhiệt độ màu tạo khối thật (bóng xanh, mặt nắng vàng). */
    const nang = new DirectionalLight(new Color('#FFD3A8'), 3.1);
    nang.castShadow = !nhe;
    nang.shadow.mapSize.set(2048, 2048);
    Object.assign(nang.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
    nang.shadow.bias = -0.0004; nang.shadow.normalBias = 0.03;
    canh.add(nang, nang.target);
    canh.add(new HemisphereLight(new Color('#B8CFCB'), new Color('#2A3A2E'), 0.55));

    /* Mặt nước chung cho sông và hồ: phẳng, gợn nhẹ, phản chiếu màu trời. */
    const gon = taoGonSong();
    const nuoc = new Mesh(new PlaneGeometry(30, 34), new MeshStandardMaterial({
      color: new Color('#2C6B6C'), roughness: 0.3, metalness: 0, envMapIntensity: 0.6,
      normalMap: gon as Texture | null, normalScale: new Vector2(0.05, 0.05),
    }));
    nuoc.rotation.x = -Math.PI / 2; nuoc.position.set(0, doCaoRaY(MUC_NUOC), -1); nuoc.receiveShadow = !nhe;
    canh.add(nuoc);

    const may = new PerspectiveCamera(36, 1, 0.05, 80);
    const viTri = (d: number[]) => { const p = raCanh(d[0], d[1]); return new Vector3(p.x, d[2] ?? 0, p.z); };
    const nghiO = viTri(MAY.nghi.o), nghiNhin = viTri(MAY.nghi.nhin), cuoiO = viTri(MAY.cuoi.o), cuoiNhin = viTri(MAY.cuoi.nhin);
    const dauO = viTri(MAY.batDau.o), dauNhin = viTri(MAY.batDau.nhin);
    const o = new Vector3(), nhin = new Vector3();

    const tam = new Vector3();

    let rong = 1, cao = 1;
    const doKhung = () => {
      rong = vo.clientWidth || 1; cao = vo.clientHeight || 1;
      renderer.setSize(rong, cao, false); may.aspect = rong / cao;
      /* Màn dọc (điện thoại): góc nhìn rộng hơn để vẫn thấy cả dải đất. */
      may.fov = may.aspect < 0.9 ? 52 : may.aspect < 1.3 ? 44 : 36;
      /* Màn rộng: dời tâm cảnh sang phải, nhường nửa trái cho chữ. */
      if (may.aspect > 1.3) may.setViewOffset(rong, cao, -rong * 0.14, 0, rong, cao); else may.clearViewOffset();
      may.updateProjectionMatrix();
    };
    doKhung();

    let dia: Mesh | null = null;
    let dangChay = true, hienTren = true, khungHinh = 0, daBao = false, demKhung = 0, boQua = false, lanTuongTac = performance.now();
    const batDauLuc = performance.now();
    const chuot = { x: 0, y: 0, mx: 0, my: 0 };
    let cuon = 0, cuonMuon = 0;

    const capNhatGhim = () => {
      const lop = lopGhim.current; if (!lop) return;
      const ds = lop.children, vt = diemGhim.current;
      /* Ghim rơi vào vùng chữ (tiêu đề, ô tìm kiếm) thì mờ đi, giấu tên — không đè lên chữ. */
      const goc = vo.getBoundingClientRect(), chu = goiLai.current.vungChu?.current?.getBoundingClientRect();
      for (let i = 0; i < vt.length && i < ds.length; i++) {
        const el = ds[i] as HTMLElement;
        tam.copy(vt[i]).project(may);
        const kc = may.position.distanceTo(vt[i]);
        const thay = tam.z < 1 && tam.x > -1.05 && tam.x < 1.05 && tam.y > -1.05 && tam.y < 1.1;
        const mo = thay ? 1 - Math.min(Math.max((kc - 13) / 10, 0), 0.85) : 0;
        el.style.transform = `translate3d(${((tam.x + 1) / 2) * rong}px, ${((1 - tam.y) / 2) * cao}px, 0)`;
        const sx = ((tam.x + 1) / 2) * rong + goc.left, sy = ((1 - tam.y) / 2) * cao + goc.top;
        const trongChu = !!chu && sx > chu.left - 24 && sx < chu.right + 24 && sy > chu.top - 24 && sy < chu.bottom + 24;
        el.classList.toggle('trong-chu', trongChu);
        el.classList.toggle('nhan-trai', ((tam.x + 1) / 2) * rong > rong - 230);   // sát mép phải: tên nằm bên trái chấm
        el.style.opacity = String(trongChu ? mo * 0.25 : mo);
        el.style.visibility = mo > 0.05 ? 'visible' : 'hidden';
      }
    };

    /* ---- Chụp ảnh nhìn từ trên cao: vẽ vào một góc của chính khung vẽ, chép ra,
       rồi vẽ đè cảnh chính lên trong cùng khung hình — người xem không thấy. */
    const mayChup = new PerspectiveCamera(38, 1.5, 0.02, 60);
    const hang: { khoa: string; dat: () => Vector3; them: () => Group }[] = [];
    const lenHang = () => {
      const yc = yeuCauChup.current; if (!yc || !dia) return;
      const daCo = new Set(hang.map((h) => h.khoa));
      for (const d of yc.diem) {
        const khoa = 'diem:' + d.id; if (coAnhCanh(khoa) || daCo.has(khoa)) continue;
        /* Mỗi điểm một hướng nhìn (từ mã điểm) để các thẻ không giống hệt nhau; luôn nhìn từ phía nam lên. */
        const goc = (([...d.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) - 3) * 0.16;
        hang.push({ khoa, them: () => cotMoc(viTriDat(d.lat, d.lng), 1.7), dat: () => {
          const p = viTriDat(d.lat, d.lng);
          mayChup.position.set(p.x + Math.sin(goc) * 2.1, p.y + 1.05, p.z + Math.cos(goc) * 2.1); mayChup.lookAt(p.x, p.y + 0.05, p.z - 0.3); return p; } });
      }
      for (const t of yc.tuyen) {
        const khoa = 'tuyen:' + t.id; if (coAnhCanh(khoa) || daCo.has(khoa) || t.diem.length < 2) continue;
        const ds = t.diem.map((d) => viTriDat(d.lat, d.lng));
        const tam = ds.reduce((a, b) => a.add(b), new Vector3()).multiplyScalar(1 / ds.length);
        const rongNhat = Math.max(...ds.map((p) => Math.hypot(p.x - tam.x, p.z - tam.z)), 0.25);
        hang.push({ khoa, them: () => {
          const g = new Group(); const to = Math.min(Math.max(rongNhat * 1.4, 1), 4);
          /* Đường san hô bám mặt đất nối các điểm dừng theo đúng thứ tự. */
          const diemDuong: Vector3[] = [];
          t.diem.forEach((d, i) => { if (!i) return; const a = t.diem[i - 1];
            for (let k = 0; k <= 24; k++) { const f = k / 24; diemDuong.push(viTriDat(a.lat + (d.lat - a.lat) * f, a.lng + (d.lng - a.lng) * f, 0.03 * to)); } });
          g.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(diemDuong), diemDuong.length * 2, 0.011 * to, 6), mocMauSanHo()));
          ds.forEach((p) => g.add(cotMoc(p, to)));
          return g; }, dat: () => {
          mayChup.position.set(tam.x + rongNhat * 0.25, tam.y + rongNhat * 1.25 + 0.45, tam.z + rongNhat * 1.6 + 0.6);
          mayChup.lookAt(tam.x, tam.y, tam.z - rongNhat * 0.1); return tam; } });
      }
    };
    const veMotAnh = () => {
      const viec = hang.shift(); if (!viec) return;
      const goc = renderer.getDrawingBufferSize(new Vector2());
      const W = Math.min(640, Math.floor(goc.x)), H = Math.min(Math.round(W / 1.5), Math.floor(goc.y));
      if (W < 120 || H < 80) return;
      mayChup.aspect = W / H; mayChup.updateProjectionMatrix();
      const them = viec.them(); canh.add(them);
      const dich = viec.dat();
      troi.position.copy(mayChup.position);
      nang.position.copy(dich).addScaledVector(HUONG_MAT_TROI, 30); nang.target.position.copy(dich);
      const ti = renderer.getPixelRatio();
      renderer.setScissorTest(true);
      renderer.setViewport(0, 0, W / ti, H / ti); renderer.setScissor(0, 0, W / ti, H / ti);
      renderer.render(canh, mayChup);
      renderer.setScissorTest(false); renderer.setViewport(0, 0, rong, cao);
      canh.remove(them);
      them.traverse((x) => { if (x instanceof Mesh) { x.geometry.dispose(); (x.material as MeshBasicMaterial).dispose(); } });
      const ra = document.createElement('canvas'); ra.width = W; ra.height = H;
      ra.getContext('2d')?.drawImage(cv, 0, goc.y - H, W, H, 0, 0, W, H);
      ra.toBlob((b) => { if (b) datAnhCanh(viec.khoa, URL.createObjectURL(b)); }, 'image/jpeg', 0.86);
    };

    const ve = (luc: number) => {
      khungHinh = 0;
      if (hang.length && (++demKhung % 2 === 0 || !hienTren)) veMotAnh();
      const t = (luc - batDauLuc) / 1000;
      const vao = giam || cheDo === 'nen' ? 1 : em(t / 2.6);
      /* Rảnh (không cuộn, không rê chuột, đã qua cảnh mở đầu): máy khoẻ vẽ 30 hình/giây
         cho mặt nước gợn; máy yếu dừng hẳn tới lần tương tác sau — đỡ tốn pin. */
      const ranh = vao >= 1 && luc - lanTuongTac > 2500 && !hang.length;
      if (ranh && !nhe && (boQua = !boQua)) { khungHinh = requestAnimationFrame(ve); return; }
      cuonMuon += (cuon - cuonMuon) * 0.08;
      chuot.mx += (chuot.x - chuot.mx) * 0.05; chuot.my += (chuot.y - chuot.my) * 0.05;
      const s = giam ? 0 : cuonMuon;
      o.lerpVectors(nghiO, cuoiO, s); nhin.lerpVectors(nghiNhin, cuoiNhin, s);
      if (vao < 1) { o.lerpVectors(dauO, o, vao); nhin.lerpVectors(dauNhin, nhin, vao); }
      if (!giam) {
        const troiNhe = cheDo === 'nen' ? 0.5 : 1;
        o.x += Math.sin(t * 0.07) * 0.25 * troiNhe + chuot.mx * 0.4;
        o.y += Math.sin(t * 0.11) * 0.05 * troiNhe - chuot.my * 0.18;
        nhin.x += chuot.mx * 0.25;
      }
      may.position.copy(o); may.lookAt(nhin);
      troi.position.copy(may.position);
      nang.position.copy(nhin).addScaledVector(HUONG_MAT_TROI, 30); nang.target.position.copy(nhin);
      if (gon) gon.offset.set(t * 0.006, t * 0.0035);
      if (hienTren || !hang.length) { renderer.render(canh, may); capNhatGhim(); }
      if (!daBao && dia) { daBao = true; goiLai.current.onSanSang?.(); }
      if (dangChay && ((!giam && hienTren && !(ranh && nhe)) || hang.length)) khungHinh = requestAnimationFrame(ve);
    };
    const chay = () => { if (!khungHinh && dia) khungHinh = requestAnimationFrame(ve); };

    /* Dựng địa hình (luồng phụ), xong mới bắt đầu vẽ. */
    const yc: YeuCauLuoi = { rong: 26, sau: 30, nx: nhe ? 130 : 260, nz: nhe ? 150 : 300, z0: -1 };
    dungLuoi(yc).then(({ y, mau }) => {
      if (!dangChay) return;
      const g = new PlaneGeometry(yc.rong, yc.sau, yc.nx, yc.nz);
      g.rotateX(-Math.PI / 2); g.translate(0, 0, yc.z0);
      const vt = g.attributes.position as BufferAttribute;
      for (let k = 0; k < vt.count; k++) vt.setY(k, y[k]);
      g.setAttribute('color', new BufferAttribute(mau, 3));
      g.computeVertexNormals();
      dia = new Mesh(g, new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.25 }));
      dia.castShadow = dia.receiveShadow = !nhe;
      canh.add(dia);
      lenHang();
      chay();
      lenHangRef.current = () => { lenHang(); chay(); };
    }).catch(() => goiLai.current.onLoi?.());

    const khiCuon = () => { const r = vo.getBoundingClientRect(); cuon = Math.min(Math.max(-r.top / Math.max(r.height, 1), 0), 1); lanTuongTac = performance.now(); if (hienTren) chay(); };
    const khiChuot = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; chuot.x = e.clientX / window.innerWidth - 0.5; chuot.y = e.clientY / window.innerHeight - 0.5;
      lanTuongTac = performance.now(); if (hienTren) chay(); };
    const ro = new ResizeObserver(() => { doKhung(); if (giam && dia) requestAnimationFrame(ve); });
    ro.observe(vo);
    const io = new IntersectionObserver(([m]) => { hienTren = m.isIntersecting; if (hienTren && !giam) chay(); }, { threshold: 0 });
    io.observe(vo);
    const khiAn = () => { dangChay = !document.hidden; if (dangChay && !giam) chay(); };
    if (!giam) {
      window.addEventListener('scroll', khiCuon, { passive: true });
      window.addEventListener('pointermove', khiChuot, { passive: true });
    }
    document.addEventListener('visibilitychange', khiAn);
    const mat = () => goiLai.current.onLoi?.();
    cv.addEventListener('webglcontextlost', mat);

    return () => {
      dangChay = false; cancelAnimationFrame(khungHinh); lenHangRef.current = () => undefined;
      ro.disconnect(); io.disconnect();
      window.removeEventListener('scroll', khiCuon); window.removeEventListener('pointermove', khiChuot);
      document.removeEventListener('visibilitychange', khiAn); cv.removeEventListener('webglcontextlost', mat);
      canh.traverse((x) => { if (x instanceof Mesh) { x.geometry.dispose(); (Array.isArray(x.material) ? x.material : [x.material]).forEach((m) => m.dispose()); } });
      canhTroi.traverse((x) => { if (x instanceof Mesh) x.geometry.dispose(); });
      gon?.dispose(); moiTruong?.dispose(); pmrem.dispose(); renderer.dispose(); cv.remove();
    };
  // Chỉ dựng lại cảnh khi đổi chế độ; ghim và ảnh chụp cập nhật qua ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheDo]);

  return (
    <div ref={khung} className="absolute inset-0 overflow-hidden">
      {cheDo === 'hero' && <div ref={lopGhim} className="pointer-events-none absolute inset-0" aria-hidden="true">
        {ghim.map((g) => (
          <button key={g.id} type="button" tabIndex={-1} onClick={() => goiLai.current.onChon?.(g.id)} style={{ visibility: 'hidden' }}
            className={`ghim-3d pointer-events-auto absolute left-0 top-0 ${g.noiBat ? 'noi-bat' : ''}`}>
            <span className="ghim-3d-cham" /><span className="ghim-3d-ten">{g.ten}</span>
          </button>))}
      </div>}
    </div>);
}
