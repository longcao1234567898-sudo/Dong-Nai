import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminFetch, taiTepXuat } from '../../services/adminService';
import { TieuDeQt, The, nutChinh } from '../../components/common/KhoiQt';
const TEN: Record<string, string> = { login: 'Đăng nhập', login_success: 'Đăng nhập', login_failed: 'Đăng nhập sai', logout: 'Đăng xuất', them_dia_diem: 'Thêm địa điểm', sua_dia_diem: 'Sửa địa điểm',
  an_dia_diem: 'Ẩn địa điểm', hien_dia_diem: 'Hiện địa điểm', nhap_luot_khach: 'Nhập lượt khách', nhap_luot_khach_hang_loat: 'Nhập lượt khách hàng loạt', an_danh_gia: 'Ẩn đánh giá',
  hien_danh_gia: 'Hiện đánh giá', khoa_tai_khoan: 'Khoá tài khoản', mo_khoa_tai_khoan: 'Mở khoá tài khoản', go_tam_khoa: 'Gỡ tạm khoá', xuat_du_lieu: 'Xuất dữ liệu',
  them_xa_phuong: 'Thêm xã/phường', sua_xa_phuong: 'Sửa xã/phường', them_ky: 'Tạo kỳ báo cáo', sua_ky: 'Sửa kỳ báo cáo', khoa_ky: 'Khoá kỳ', mo_khoa_ky: 'Mở khoá kỳ',
  chot_bao_cao: 'Chốt báo cáo', mo_lai_bao_cao: 'Mở lại báo cáo', danh_dau_khong_phat_sinh: 'Đánh dấu không phát sinh', bo_khong_phat_sinh: 'Bỏ không phát sinh',
  them_phu_luc: 'Thêm dòng phụ lục', xoa_phu_luc: 'Xoá dòng phụ lục', nhap_excel_phu_luc: 'Nhập Excel phụ lục', xuat_phu_luc: 'Xuất phụ lục',
  xem_du_lieu_nhay_cam: 'Xem dữ liệu nhạy cảm', doi_mat_khau: 'Đổi mật khẩu', bat_hai_lop: 'Bật xác thực hai lớp', tat_hai_lop: 'Tắt xác thực hai lớp',
  tat_hai_lop_ho: 'Tắt hai lớp hộ đồng nghiệp' };
interface NK { luc: string; hanhDong: string; doiTuong: string | null; chiTiet: unknown; ip: string | null; canBo: string | null }
/* Chi tiết lưu dạng JSON (MySQL trả đối tượng, MariaDB trả chuỗi) — gom thành một dòng chữ dễ đọc. */
function moTaChiTiet(x: NK) {
  let c = x.chiTiet;
  if (typeof c === 'string') { try { c = JSON.parse(c); } catch { /* giữ nguyên chuỗi */ } }
  const phan = c && typeof c === 'object' ? Object.entries(c as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`) : [];
  return [x.doiTuong, ...phan].filter(Boolean).join(' · ');
}
export default function AdminNhatKy() {
  const { data: ds = [] } = useQuery({ queryKey: ['qt-nhat-ky'], queryFn: () => adminFetch<NK[]>('/nhat-ky') });
  return (<>
    <TieuDeQt tieuDe="Nhật ký" moTa="Mọi thao tác của cán bộ, mới nhất ở trên." />
    <The className="mb-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-300">Xuất toàn bộ địa điểm, lượt khách và đánh giá thành tệp JSON. Tệp không chứa mã thiết bị hay địa chỉ IP của du khách.</p>
      <button type="button" className={nutChinh} onClick={() => taiTepXuat().catch((e: Error) => toast.error(e.message))}><Download className="h-4 w-4" />Tải tệp dữ liệu</button></div></The>
    <The><div className="overflow-x-auto"><table className="w-full text-[13.5px]"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"><th className="py-2">Thời gian</th><th>Cán bộ</th><th>Thao tác</th><th>Chi tiết</th><th>IP</th></tr></thead>
      <tbody>{ds.map((x, i) => <tr key={i} className="border-b border-slate-100 dark:border-slate-800"><td className="whitespace-nowrap py-2">{new Date(x.luc).toLocaleString('vi-VN')}</td>
        <td><code className="rounded bg-slate-100 px-1.5 text-xs dark:bg-slate-800">{x.canBo || '—'}</code></td><td>{TEN[x.hanhDong] || x.hanhDong}</td><td className="max-w-[340px] text-xs text-slate-500">{moTaChiTiet(x)}</td><td className="text-xs text-slate-400">{x.ip}</td></tr>)}
        {!ds.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Chưa có thao tác nào.</td></tr>}</tbody></table></div></The>
  </>);
}
