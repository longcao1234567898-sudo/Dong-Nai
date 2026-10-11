/** Nguồn ảnh mặc định của địa điểm — chỉ cán bộ xem; phía người dân không hiện tác giả, giấy phép. */
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '../../services/adminService';
import { TieuDeQt, The } from '../../components/common/KhoiQt';
import { ANH_MAC_DINH } from '../../utils/anhMacDinh';

export default function AdminNguonAnh() {
  const { data: dd = [] } = useQuery({ queryKey: ['qt-dia-diem'], queryFn: () => adminFetch<{ id: string; ten: string }[]>('/dia-diem') });
  const muc = Object.entries(ANH_MAC_DINH).flatMap(([id, anh]) => anh.map((a, i) => ({ id, a, i })));
  const ten = (id: string) => dd.find((x) => x.id === id)?.ten || id;
  return (<>
    <TieuDeQt tieuDe="Nguồn ảnh mặc định" moTa="Ảnh thật lấy từ Wikimedia Commons, chỉ loại CC0 hoặc phạm vi công cộng (không bắt buộc ghi tác giả, nên trang người dân không hiện dòng tác giả). Ảnh cán bộ tải lên ở mục Địa điểm luôn được hiện trước ảnh mặc định." />
    {!muc.length ? <The><p className="text-sm text-slate-500">Chưa có ảnh mặc định nào. Cách thêm: xem mục "Ảnh địa điểm" trong README (chạy scripts/tai-anh-dia-diem.mjs).</p></The> :
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{muc.map(({ id, a, i }) => (
        <div key={a.tep} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <img src={a.nho} alt={ten(id)} loading="lazy" className="block aspect-[3/2] w-full object-cover" />
          <div className="p-4 text-sm">
            <b className="block">{ten(id)}{i > 0 ? ` (ảnh ${i + 1})` : ''}</b>
            <p className="mt-1 text-slate-600">Tác giả: {a.tacGia}</p>
            <p className="text-slate-600">Giấy phép: {a.linkGiayPhep ? <a className="text-primary-600 underline" href={a.linkGiayPhep} target="_blank" rel="noopener noreferrer">{a.giayPhep}</a> : a.giayPhep}</p>
            <a className="mt-1 inline-block text-primary-600 underline" href={a.nguon} target="_blank" rel="noopener noreferrer">Trang ảnh trên Commons</a>
          </div>
        </div>))}</div>}
  </>);
}
