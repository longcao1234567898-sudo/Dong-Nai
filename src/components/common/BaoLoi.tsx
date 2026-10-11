/**
 * Chặn "trang trắng".
 *
 * Lỗi gặp thật: đang mở trang thì Netlify dựng bản mới — các tệp mã chia nhỏ đổi
 * tên, trang cũ bấm sang mục khác đi tải tệp không còn nữa, React sập cả cây, màn
 * hình trắng trơn. Nay:
 *   - Lỗi tải tệp mã (bản mới vừa lên): tự tải lại trang một lần, lấy bản mới.
 *   - Lỗi khác: hiện thông báo kèm nút Tải lại, Về trang chủ — không trắng trang.
 * Đặt quanh nội dung từng trang (đổi trang là xoá lỗi) và quanh cả ứng dụng.
 */
import { Component, type ReactNode } from 'react';

const KHOA = 'dldn_tai_lai_vi_ban_moi';
export const laLoiTaiMa = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically|ChunkLoadError|Unable to preload CSS|MIME type/i.test(String((e as Error)?.message || e));

/** Tải lại trang để lấy bản mới — tối đa một lần mỗi 30 giây, tránh vòng lặp nếu lỗi thật. */
export function taiLaiLayBanMoi(): boolean {
  try {
    const luc = Number(sessionStorage.getItem(KHOA) || 0);
    if (Date.now() - luc < 30_000) return false;
    sessionStorage.setItem(KHOA, String(Date.now()));
  } catch { /* không có sessionStorage: vẫn thử tải lại một lần */ }
  window.location.reload();
  return true;
}

interface Props { children: ReactNode; khoaDatLai?: string; toanTrang?: boolean }
interface State { loi: Error | null }

export default class BaoLoi extends Component<Props, State> {
  state: State = { loi: null };
  static getDerivedStateFromError(loi: Error): State { return { loi }; }
  componentDidCatch(loi: Error) {
    console.error('[trang lỗi]', loi);
    if (laLoiTaiMa(loi)) taiLaiLayBanMoi();
  }
  componentDidUpdate(truoc: Props) {
    /* Sang trang khác thì thử hiện lại bình thường. */
    if (this.state.loi && truoc.khoaDatLai !== this.props.khoaDatLai) this.setState({ loi: null });
  }
  render() {
    const { loi } = this.state;
    if (!loi) return this.props.children;
    const banMoi = laLoiTaiMa(loi);
    return (
      <div role="alert" className={`grid place-items-center px-4 ${this.props.toanTrang ? 'min-h-screen' : 'py-20'}`}>
        <div className="max-w-md text-center">
          <p className="font-serif text-[26px] leading-tight text-ink">{banMoi ? 'Trang vừa được cập nhật' : 'Trang gặp lỗi khi hiển thị'}</p>
          <p className="mt-2 text-[15px] text-muted">{banMoi
            ? 'Có bản mới của trang web. Tải lại để dùng bản mới — nội dung đã lưu không mất.'
            : 'Thử tải lại trang. Nếu vẫn lỗi, chụp màn hình dòng dưới đây gửi cán bộ phụ trách.'}</p>
          {!banMoi && <p className="mt-3 break-words rounded-lg bg-sunken px-3 py-2 font-mono text-xs text-muted">{loi.message}</p>}
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" className="nut nut-chinh" onClick={() => window.location.reload()}>Tải lại trang</button>
            <a href="/" className="nut nut-vien">Về trang chủ</a>
          </div>
        </div>
      </div>);
  }
}
