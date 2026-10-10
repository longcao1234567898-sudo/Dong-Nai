/** Kiểu dữ liệu và tiện ích của phụ lục thống kê — khớp server/src/lib/phu-luc.js. */
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '../services/adminService';

export type KieuO = 'chu' | 'so' | 'nguyen' | 'chon' | 'ngay' | 'nam' | 'co' | 'tinh';
export interface Truong {
  k: string; nhan: string; kieu: KieuO; max?: number; batBuoc?: boolean; chinh?: boolean; tong?: boolean;
  chon?: [string | number, string][]; cong?: string[]; dong?: number; m2?: boolean; khongXuat?: boolean; danhDau?: boolean; goiY?: string[]; nhom?: string;
}
export interface BangPL {
  key: string; so: number | string; ten: string; moTa: string; theoKy: boolean; motDongMoiXa?: boolean; khoaTrung?: string; truong: Truong[];
  /** dan: máy tự tổng hợp, chỉ xem. mat: thông tin nhạy cảm, mỗi lần xem đều ghi nhật ký. */
  dan?: boolean; mat?: boolean;
}
export interface XaPhuong { id: number; ten: string; tenRieng: string; loai: string; hien: boolean }
export interface KyBC { id: number; ten: string; tuNgay: string; denNgay: string; hanNop: string | null; khoa: boolean }
export interface CauHinh { bang: BangPL[]; xaPhuong: XaPhuong[]; ky: KyBC[] }
export type Dong = Record<string, unknown> & { id: number; xa_phuong_id: number; ky_id?: number; nguoi_sua: string | null; updated_at: string; xoa_luc: string | null };

export const useCauHinh = () => useQuery({ queryKey: ['qt-cau-hinh'], queryFn: () => adminFetch<CauHinh>('/bao-cao/cau-hinh'), staleTime: 60_000 });

export const ngayVn = (s: string | null | undefined) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${Number(d)}/${Number(m)}/${y}`; };

/** Hiển thị một ô theo kiểu trường. */
export function hienO(t: Truong, v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  switch (t.kieu) {
    case 'so': case 'nguyen': case 'tinh': return Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
    case 'chon': return t.chon?.find(([g]) => String(g) === String(v))?.[1] ?? String(v);
    case 'co': return v ? 'Có' : 'Không';
    case 'ngay': return ngayVn(String(v));
    default: return String(v);
  }
}

/* Kỳ và xã đang chọn được nhớ trên trình duyệt này, mở lại trang không phải chọn lại. */
export function nhoChon(khoa: string, gt?: string | number | null) {
  try {
    if (gt === undefined) return localStorage.getItem('dldn_' + khoa);
    if (gt === null || gt === '') localStorage.removeItem('dldn_' + khoa); else localStorage.setItem('dldn_' + khoa, String(gt));
  } catch { /* trình duyệt chặn lưu trữ thì thôi */ }
  return null;
}
