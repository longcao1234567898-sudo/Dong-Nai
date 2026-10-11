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
 *   -> public/anh/dia-diem/<mã>-<n>.jpg (cạnh dài 1600px) và <mã>-<n>-800.jpg,
 *      ghi src/du-lieu/anh-dia-diem.json (tác giả, giấy phép, đường dẫn nguồn).
 *
 * Chỉ nhận CC0 và phạm vi công cộng (không bắt buộc ghi tác giả), vì trang người dân
 * không hiện dòng tác giả. Cần Node 18+ (có fetch). Không cần thư viện ngoài: Commons
 * tự thu nhỏ ảnh theo cỡ yêu cầu.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'DuLichDongNai/1.0 (trang du lich cong khai; lien he qua kho GitHub cua du an)';
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
async function goiApi(thamSo) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...thamSo })}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Commons trả ${r.status} cho ${url}`);
  return r.json();
}
const thongTin = (trang) => {
  const ii = trang.imageinfo?.[0]; if (!ii) return null;
  const m = ii.extmetadata || {};
  return { ten: trang.title, rong: ii.width, cao: ii.height, mime: ii.mime, thumb: ii.thumburl, trangNguon: ii.descriptionurl,
    tacGia: boThe(m.Artist?.value) || 'Không rõ', giayPhep: boThe(m.LicenseShortName?.value), linkGiayPhep: m.LicenseUrl?.value || null,
    moTa: boThe(m.ImageDescription?.value).slice(0, 200) || null };
};
const hopLe = (a) => a && a.mime === 'image/jpeg' && Math.max(a.rong, a.cao) >= 1200 && GIAY_PHEP_DUOC.test(a.giayPhep) && !KHONG_LAY.test(a.ten);

async function goiY() {
  const khoi = [];
  for (const [ma, ds] of Object.entries(TU_KHOA)) {
    const thay = new Map();
    for (const q of ds) {
      const kq = await goiApi({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '15',
        prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '480' });
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
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Tải ${url} lỗi ${r.status}`);
  fs.writeFileSync(dich, Buffer.from(await r.arrayBuffer()));
}

async function tai() {
  const chon = JSON.parse(fs.readFileSync(CHON, 'utf8'));
  fs.mkdirSync(RA_ANH, { recursive: true });
  const ra = {};
  for (const [ma, tens] of Object.entries(chon)) {
    if (ma.startsWith('_') || !Array.isArray(tens) || !tens.length) continue;
    /* Hai cỡ: 1600px cho ảnh lớn, 800px cho thẻ. Ảnh gốc nhỏ hơn cỡ xin thì Commons trả ảnh gốc. */
    const lay = async (w) => new Map(Object.values((await goiApi({ action: 'query', titles: tens.join('|'), prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata', iiurlwidth: w })).query?.pages || {}).map((t) => [t.title, thongTin(t)]));
    const theoTen = await lay('1600'), nhoTheoTen = await lay('800');
    ra[ma] = [];
    for (const [i, ten] of tens.entries()) {
      const a = theoTen.get(ten.replace(/_/g, ' '));
      if (!a) { console.warn(`  ${ma}: không thấy ${ten}`); continue; }
      if (!hopLe(a)) { console.warn(`  ${ma}: bỏ ${ten} (giấy phép "${a.giayPhep}" hoặc cỡ ảnh không đạt)`); continue; }
      const goc = `${ma}-${i + 1}`;
      await taiTep(a.thumb, path.join(RA_ANH, `${goc}.jpg`));
      await taiTep(nhoTheoTen.get(a.ten)?.thumb || a.thumb, path.join(RA_ANH, `${goc}-800.jpg`));
      const rong = Math.min(1600, a.rong);
      ra[ma].push({ tep: `/anh/dia-diem/${goc}.jpg`, nho: `/anh/dia-diem/${goc}-800.jpg`, rong, cao: Math.round((rong * a.cao) / a.rong),
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
