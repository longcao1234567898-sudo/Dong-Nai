"""Sinh hình nền đường đồng mức (public/nen/dong-muc.svg).

Dùng làm mặt nạ (mask-image) nên màu nét không quan trọng: CSS tô màu theo
token, đổi sáng/tối không cần tệp thứ hai. Chạy lại: python3 scripts/tao-nen-dong-muc.py
Chỉ cần numpy. Hạt giống cố định nên lần nào chạy cũng ra cùng một hình.
"""
import numpy as np

RONG, CAO, BUOC = 1600, 1000, 10          # khung SVG và cỡ ô lưới (px)
rng = np.random.default_rng(1715)          # 1715: năm dựng Văn miếu Trấn Biên
nx, ny = RONG // BUOC + 1, CAO // BUOC + 1

def nhieu_gia_tri(tan_so):
    """Nhiễu giá trị trơn: lưới ngẫu nhiên nội suy smoothstep."""
    gx, gy = int(tan_so * RONG / CAO) + 2, tan_so + 2
    luoi = rng.random((gy + 1, gx + 1))
    xs = np.linspace(0, gx - 1, nx); ys = np.linspace(0, gy - 1, ny)
    x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int)
    tx = xs - x0; ty = ys - y0
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty)
    a = luoi[np.ix_(y0, x0)]; b = luoi[np.ix_(y0, x0 + 1)]
    c = luoi[np.ix_(y0 + 1, x0)]; d = luoi[np.ix_(y0 + 1, x0 + 1)]
    tx = tx[None, :]; ty = ty[:, None]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty

h = sum(nhieu_gia_tri(f) / (i + 1) ** 1.6 for i, f in enumerate([2, 4, 8, 16]))
# Thêm hai "đỉnh núi" để đường đồng mức có tâm, nhìn giống bản đồ địa hình thật.
yy, xx = np.mgrid[0:ny, 0:nx]
for cx, cy, r, a in [(0.72, 0.30, 0.13, 0.55), (0.24, 0.70, 0.10, 0.45)]:
    h += a * np.exp(-(((xx / nx - cx) * RONG / CAO) ** 2 + (yy / ny - cy) ** 2) / (2 * r * r))
h = (h - h.min()) / (h.max() - h.min())

def doan(muc):
    """Marching squares: các đoạn thẳng của một mức cao độ."""
    v = h - muc
    tl, tr, bl, br = v[:-1, :-1], v[:-1, 1:], v[1:, :-1], v[1:, 1:]
    ma = (tl > 0) * 8 + (tr > 0) * 4 + (br > 0) * 2 + (bl > 0) * 1
    ra = []
    j, i = np.nonzero((ma != 0) & (ma != 15))
    for y, x in zip(j, i):
        a, b, c, d = tl[y, x], tr[y, x], br[y, x], bl[y, x]
        def noi(p, q): return p / (p - q)
        tren = (x + noi(a, b), y); phai = (x + 1, y + noi(b, c))
        duoi = (x + noi(d, c), y + 1); trai = (x, y + noi(a, d))
        m = ma[y, x]
        bang = {1: [(trai, duoi)], 2: [(duoi, phai)], 3: [(trai, phai)], 4: [(tren, phai)],
                5: [(trai, tren), (duoi, phai)], 6: [(tren, duoi)], 7: [(trai, tren)], 8: [(trai, tren)],
                9: [(tren, duoi)], 10: [(trai, duoi), (tren, phai)], 11: [(tren, phai)], 12: [(trai, phai)],
                13: [(duoi, phai)], 14: [(trai, duoi)]}
        ra += bang[m]
    return ra

def noi_thanh_duong(ds):
    """Ghép các đoạn có chung đầu mút thành đường liền."""
    k = lambda p: (round(p[0], 4), round(p[1], 4))
    ke = {}
    for s in ds:
        ke.setdefault(k(s[0]), []).append(s); ke.setdefault(k(s[1]), []).append(s)
    da = set(); duong = []
    for s in ds:
        if id(s) in da: continue
        da.add(id(s)); pts = [s[0], s[1]]
        for chieu in (1, 0):
            while True:
                dau = pts[-1] if chieu else pts[0]
                tiep = next((t for t in ke.get(k(dau), []) if id(t) not in da), None)
                if not tiep: break
                da.add(id(tiep))
                moi = tiep[1] if k(tiep[0]) == k(dau) else tiep[0]
                pts.append(moi) if chieu else pts.insert(0, moi)
        duong.append(pts)
    return duong

def mem(pts, lan=2):
    """Làm mềm góc gãy (Chaikin)."""
    for _ in range(lan):
        if len(pts) < 3: return pts
        moi = [pts[0]]
        for p, q in zip(pts, pts[1:]):
            moi += [(0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]), (0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1])]
        moi.append(pts[-1]); pts = moi
    return pts

nhom = []
for n, muc in enumerate(np.linspace(0.06, 0.96, 19)):
    ds = [d for d in noi_thanh_duong(doan(muc)) if len(d) > 4]
    lenh = []
    for d in ds:
        d = mem(d)[::2] + [mem(d)[-1]]
        lenh.append('M' + ' '.join(f'{x * BUOC:.0f} {y * BUOC:.0f}' for x, y in d))
    # Cứ năm đường thì một đường đậm hơn, như đường cái trên bản đồ địa hình.
    nhom.append(f'<path d="{"".join(lenh)}" stroke-width="{1.6 if n % 5 == 0 else 0.9}"/>')

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {RONG} {CAO}" preserveAspectRatio="xMidYMid slice">'
       f'<g fill="none" stroke="#000" stroke-linejoin="round" stroke-linecap="round">{"".join(nhom)}</g></svg>')
open('public/nen/dong-muc.svg', 'w').write(svg)
print(len(svg), 'byte')
