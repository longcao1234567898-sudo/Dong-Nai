export type Loai = 'thien-nhien' | 'di-tich' | 'vui-choi' | 'luu-tru' | 'am-thuc' | 'dac-san';
export type Vung = 'ven-song' | 'mien-dong' | 'phia-bac';
export interface TieuChi { canhQuan: number | null; dichVu: number | null; veSinh: number | null; giaCa: number | null }
/** Điểm quan sát 360°: ảnh toàn cảnh chụp tại một vị trí của địa điểm. */
export interface QuanSat { id: number; ten: string; tenEn: string | null; gocNgang: number; huongDau: number }
export interface AnhDD { id: number; rong: number | null; cao: number | null; chuThich: string | null; tieuDiemX?: number; tieuDiemY?: number }
export interface DiaDiem {
  id: string; ten: string; tenEn: string | null; loai: Loai; moTa: string | null; moTaEn: string | null; diaChi: string | null; lat: number; lng: number; anh: AnhDD[]; quanSat?: QuanSat[];
  sdt: string | null; web: string | null; gioMo: string | null; noiBat: boolean; vung: Vung | null; xa: string | null;
  soDanhGia: number; saoTb: number | null; tieuChi: TieuChi; phanBo: number[];   // phanBo: [5,4,3,2,1] sao
}
export interface DanhGia { id: number; sao: number; tieuChi: TieuChi; diCung: string | null; thoiDiem: string | null; nhanXet: string | null; ten: string | null; luc: string }
export interface DanhGiaMoi { id: number; diaDiemId: string; tenDiem: string; tenDiemEn: string | null; sao: number; diCung: string | null; thoiDiem: string | null;
  nhanXet: string; ten: string | null; luc: string; minhHoa?: boolean }
export interface DanhGiaGui { sao: number; tieuChi: Partial<TieuChi>; diCung: string | null; thoiDiem: string | null; nhanXet: string | null; ten: string | null }
export interface ThongKe {
  nams: string[]; nam: string;
  thang: { thang: string; noiDia: number; quocTe: number }[];
  topDiaDiem: { ten: string; tong: number }[];
  danhGia: { so: number; saoTb: number | null; tieuChi: TieuChi; phanBo: number[] };   // phanBo: [1..5] sao
  danhGiaTheoThang: { thang: string; so: number }[];
  saoTheoDiaDiem: { ten: string; tb: number; so: number }[];
  khachTheoXa: { ky: string; ds: { xa: string; quocTe: number; noiDia: number }[] } | null;
}
export interface LoTrinh { id: number; ten: string; tenEn: string | null; thoiGian: string | null; phuongTien: string | null; phuongTienEn: string | null;
  moTa: string | null; moTaEn: string | null;
  diem: { id: string; ngay: number; ghiChu: string | null }[] }
export interface TinTuc { id: number; loai: 'canh-bao' | 'su-kien' | 'thong-bao' | 'lien-he'; tieuDe: string; tieuDeEn: string | null; noiDung: string | null;
  noiDungEn: string | null; tuNgay: string | null; denNgay: string | null; diaDiemId: string | null }
export interface LuuTru { id: number; ten: string; diaChi: string | null; hangSao: number; xaPhuong: string }
