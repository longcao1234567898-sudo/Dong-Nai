/**
 * TẢI ẢNH THẬT CHO 15 ĐỊA ĐIỂM TỪ WIKIMEDIA COMMONS (giấy phép tự do).
 *
 * Bước 1 — tìm ứng viên để người chọn xem:
 *     node scripts/tai-anh-dia-diem.mjs goi-y
 *   -> ghi scripts/anh-ung-vien.html (mở bằng trình duyệt, mỗi điểm vài ảnh kèm
 *      tên tệp, tác giả, giấy phép). Chép tên tệp ưng ý vào scripts/anh-dia-diem.json.
 *
 * Bước 2 — tải ảnh đã chọn:
 *     node scripts/tai-anh-dia-diem.mjs tai
 *   -> public/anh/dia-diem/<mã>-<n>.jpg (ngang 1920px) và <mã>-<n>-nho.jpg (ngang 960px),
 *      ghi src/du-lieu/anh-dia-diem.json (tác giả, giấy phép, đường dẫn nguồn).
 *   Commons chỉ trả ảnh thu nhỏ theo các cỡ chuẩn (500, 960, 1280, 1920…); cỡ lẻ như
 *   1600 hay 800 bị từ chối (lỗi 400), nên script xin đúng cỡ chuẩn.
 *
 * Máy sau proxy công ty: chạy kèm NODE_USE_ENV_PROXY=1 (Node 22.21+) để fetch đi qua proxy.
 * Chỉ nhận CC0 và phạm vi công cộng (không bắt buộc ghi tác giả), vì trang người dân
 * không hiện dòng tác giả. Cần Node 18+ (có fetch). Không cần thư viện ngoài: Commons
 * tự thu nhỏ ảnh theo cỡ yêu cầu.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://commons.wikimedia.org/w/api.php';
/* Chính sách của Wikimedia: User-Agent phải có cách liên hệ, thiếu là bị chặn (lỗi 429 "robot policy"). */
const UA = 'DuLichDongNai/1.0 (https://github.com/longcao1234567898-sudo/Dong-Nai) node-fetch';
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHON = path.join(GOC, 'scripts/anh-dia-diem.json');
const RA_ANH = path.join(GOC, 'public/anh/dia-diem');
const RA_DU_LIEU = path.join(GOC, 'src/du-lieu/anh-dia-diem.json');

/* Từ khoá tìm cho từng điểm (tên Việt, tên không dấu, tên Anh). */
const TU_KHOA = {
  'van-mieu-tran-bien': ['Văn miếu Trấn Biên', 'Van Mieu Tran Bien', 'Tran Bien Temple of Literature'],
  'den-tho-nguyen-huu-canh': ['Đền thờ Nguyễn Hữu Cảnh', 'Nguyen Huu Canh temple Bien Hoa'],
  'khu-du-lich-buu-long': ['Bửu Long', 'Buu Long Bien Hoa', 'Buu Long tourist area'],
  'thac-giang-dien': ['Thác Giang Điền', 'Giang Dien waterfall'],
  'khu-du-lich-suoi-mo': ['Suối Mơ Đồng Nai', 'Suoi Mo Tan Phu Dong Nai'],
  'khu-du-lich-bo-cap-vang': ['Bò Cạp Vàng', 'Bo Cap Vang Nhon Trach'],
  'ho-tri-an': ['Hồ Trị An', 'Tri An Lake', 'Tri An reservoir'],
  'vuon-quoc-gia-cat-tien': ['Vườn quốc gia Cát Tiên', 'Cat Tien National Park'],
  'thac-dak-mai': ['Thác Đắk Mai', 'Dak Mai waterfall', 'Đăk Mai Bù Gia Mập'],
  'vuon-quoc-gia-bu-gia-map': ['Vườn quốc gia Bù Gia Mập', 'Bu Gia Map National Park'],
  'nui-ba-ra': ['Núi Bà Rá', 'Ba Ra mountain', 'Ba Ra Phuoc Long'],
  'nui-chua-chan': ['Núi Chứa Chan', 'Chua Chan mountain', 'Gia Lao mountain'],
  'cu-lao-pho': ['Cù lao Phố', 'Cu Lao Pho Bien Hoa', 'Chùa Đại Giác Biên Hòa'],
  'soc-bom-bo': ['Sóc Bom Bo', 'Bom Bo Bình Phước'],
  'ho-suoi-lam': ['Hồ Suối Lam', 'Suoi Lam lake Dong Phu'],
};
/* CHỈ nhận ảnh không bắt buộc ghi tác giả: trang người dân không hiện tác giả, giấy phép
   (theo yêu cầu của đơn vị). Ảnh CC BY / CC BY-SA bắt buộc ghi công công khai nên bị loại. */
const GIAY_PHEP_DUOC = /^(cc0|public domain|pd\b|pd-|cc-zero|no restrictions)/i;
const KHONG_LAY = /\b(map|bản đồ|ban do|logo|sơ đồ|so do|diagram|location|locator|flag|coat of arms)\b/i;

const boThe = (s = '') => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const ngu = (ms) => new Promise((ok) => setTimeout(ok, ms));
/* Commons giới hạn tốc độ: mỗi lần gọi cách nhau ~1,2 giây, bị 429 thì chờ lâu dần rồi thử lại. */
async function layCoThuLai(url) {
  for (let lan = 0; lan < 6; lan++) {
    await ngu(1200 * (lan ? 2 ** lan : 1));
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status !== 429 && r.status < 500) return r;
  }
  throw new Error(`Commons từ chối nhiều lần: ${url}`);
}
async function goiApi(thamSo) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...thamSo })}`;
  const r = await layCoThuLai(url);
  if (!r.ok) throw new Error(`Commons trả ${r.status} cho ${url}`);
  return r.json();
}
/* Ảnh thu nhỏ: Commons trả về máy thumb.wikimedia.org; một số mạng (proxy công ty) chặn máy
   này nhưng cho upload.wikimedia.org — đường dẫn cũ trên upload.wikimedia.org vẫn phục vụ
   đúng ảnh đó, nên đổi sang cho chắc. Bỏ phần ?utm_… phía sau. */
const veUpload = (u = '') => u.replace(/^https:\/\/thumb\.wikimedia\.org\//, 'https://upload.wikimedia.org/').replace(/\?.*$/, '');
const thongTin = (trang) => {
  const ii = trang.imageinfo?.[0]; if (!ii) return null;
  const m = ii.extmetadata || {};
  return { ten: trang.title, rong: ii.width, cao: ii.height, mime: ii.mime, thumb: veUpload(ii.thumburl), thumbRong: ii.thumbwidth, thumbCao: ii.thumbheight, trangNguon: ii.descriptionurl,
    tacGia: boThe(m.Artist?.value) || 'Không rõ', giayPhep: boThe(m.LicenseShortName?.value), linkGiayPhep: m.LicenseUrl?.value || null,
    moTa: boThe(m.ImageDescription?.value).slice(0, 200) || null };
};
/* Ảnh CC0 đúng địa điểm hiếm, nên nhận từ 700px (đủ cho thẻ, trang chi tiết); ảnh hẹp hơn
   1280px không được đưa lên trình chiếu đầu trang chủ (xem Hero.tsx) để khỏi bị nhoè. */
const CANH_TOI_THIEU = 700;
const hopLe = (a) => a && a.mime === 'image/jpeg' && Math.max(a.rong, a.cao) >= CANH_TOI_THIEU && GIAY_PHEP_DUOC.test(a.giayPhep) && !KHONG_LAY.test(a.ten);

async function goiY() {
  const khoi = [];
  for (const [ma, ds] of Object.entries(TU_KHOA)) {
    const thay = new Map();
    for (const q of ds) {
      const kq = await goiApi({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '15',
        prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '500' });
      for (const t of Object.values(kq.query?.pages || {})) { const a = thongTin(t); if (hopLe(a)) thay.set(a.ten, a); }
    }
    const ds2 = [...thay.values()].sort((a, b) => (b.rong / b.cao >= 1.2) - (a.rong / a.cao >= 1.2) || b.rong - a.rong).slice(0, 10);
    console.log(`${ma}: ${ds2.length} ảnh dùng được`);
    khoi.push(`<h2>${ma}</h2><div class="hang">${ds2.map((a) => `<figure><img src="${a.thumb}" loading="lazy"><figcaption><code>${a.ten}</code><br>${a.rong}×${a.cao}, ${a.giayPhep}<br>${a.tacGia}</figcaption></figure>`).join('') || '<p>Không tìm thấy ảnh giấy phép tự do.</p>'}</div>`);
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Ảnh ứng viên</title><style>body{font:14px system-ui;margin:24px}.hang{display:flex;flex-wrap:wrap;gap:12px}figure{width:300px;margin:0}img{width:300px;height:200px;object-fit:cover;border-radius:8px}code{font-size:12px;word-break:break-all}</style><h1>Ảnh ứng viên từ Wikimedia Commons</h1><p>Chép tên tệp (File:...) ưng ý vào scripts/anh-dia-diem.json rồi chạy: node scripts/tai-anh-dia-diem.mjs tai</p>${khoi.join('')}`;
  fs.writeFileSync(path.join(GOC, 'scripts/anh-ung-vien.html'), html);
  console.log('Đã ghi scripts/anh-ung-vien.html');
}

async function taiTep(url, dich) {
  const r = await layCoThuLai(url);
  if (!r.ok) throw new Error(`Tải ${url} lỗi ${r.status}`);
  fs.writeFileSync(dich, Buffer.from(await r.arrayBuffer()));
}

async function tai() {
  const chon = JSON.parse(fs.readFileSync(CHON, 'utf8'));
  fs.mkdirSync(RA_ANH, { recursive: true });
  const ra = {};
  for (const [ma, tens] of Object.entries(chon)) {
    if (ma.startsWith('_') || !Array.isArray(tens) || !tens.length) continue;
    /* Hai cỡ chuẩn: 1920px cho ảnh đầu trang, 960px cho thẻ. Ảnh gốc hẹp hơn cỡ xin thì Commons
       trả ảnh gốc (không phóng to). */
    const lay = async (w) => new Map(Object.values((await goiApi({ action: 'query', titles: tens.join('|'), prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata', iiurlwidth: w })).query?.pages || {}).map((t) => [t.title, thongTin(t)]));
    const theoTen = await lay('1920'), nhoTheoTen = await lay('960');
    ra[ma] = [];
    for (const [i, ten] of tens.entries()) {
      const a = theoTen.get(ten.replace(/_/g, ' '));
      if (!a) { console.warn(`  ${ma}: không thấy ${ten}`); continue; }
      if (!hopLe(a)) { console.warn(`  ${ma}: bỏ ${ten} (giấy phép "${a.giayPhep}" hoặc cỡ ảnh không đạt)`); continue; }
      const goc = `${ma}-${i + 1}`;
      const nho = nhoTheoTen.get(a.ten) || a;
      await taiTep(a.thumb, path.join(RA_ANH, `${goc}.jpg`));
      await taiTep(nho.thumb, path.join(RA_ANH, `${goc}-nho.jpg`));
      ra[ma].push({ tep: `/anh/dia-diem/${goc}.jpg`, nho: `/anh/dia-diem/${goc}-nho.jpg`, rong: a.thumbRong || a.rong, cao: a.thumbCao || a.cao,
        rongNho: nho.thumbRong || nho.rong,
        tacGia: a.tacGia, giayPhep: a.giayPhep, linkGiayPhep: a.linkGiayPhep, nguon: a.trangNguon, moTa: a.moTa });
      console.log(`  ${ma}: đã tải ${ten} (${a.giayPhep}, ${a.tacGia})`);
    }
    if (!ra[ma].length) delete ra[ma];
  }
  fs.writeFileSync(RA_DU_LIEU, JSON.stringify(ra, null, 2) + '\n');
  console.log(`Đã ghi ${path.relative(GOC, RA_DU_LIEU)}: ${Object.keys(ra).length} địa điểm có ảnh.`);
}

const lenh = process.argv[2];
if (lenh === 'goi-y') await goiY();
else if (lenh === 'tai') await tai();
else console.log('Dùng: node scripts/tai-anh-dia-diem.mjs goi-y | tai');
