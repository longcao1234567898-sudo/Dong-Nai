/**
 * Ảnh nhìn từ trên cao do cảnh 3D chụp (địa hình minh hoạ tại toạ độ thật của
 * điểm đến / lộ trình). Thẻ chưa có ảnh thật thì dùng ảnh này thay cho khối
 * màu phẳng. Giữ trong bộ nhớ suốt phiên: quay lại trang chủ không chụp lại.
 */
import { useSyncExternalStore } from 'react';

const kho = new Map<string, string>();
const nguoiNghe = new Set<() => void>();
export const coAnhCanh = (khoa: string) => kho.has(khoa);
export function datAnhCanh(khoa: string, url: string) { kho.set(khoa, url); nguoiNghe.forEach((f) => f()); }
const dangKy = (f: () => void) => { nguoiNghe.add(f); return () => { nguoiNghe.delete(f); }; };
/** khoa: "diem:<mã điểm>" hoặc "tuyen:<mã lộ trình>". */
export const useAnhCanh = (khoa: string) => useSyncExternalStore(dangKy, () => kho.get(khoa) || null, () => null);
