/**
 * Bài giới thiệu chi tiết của một địa điểm (cột chi_tiet, cán bộ sửa ở mục Địa điểm).
 *
 * Định dạng đơn giản, cán bộ gõ tay được: dòng "## " là tiêu đề mục, dòng "- " là
 * gạch đầu dòng, dòng trống ngăn đoạn. Mục "Lịch sử hình thành" (tiếng Anh:
 * "Timeline") hiện thành dòng thời gian: mỗi dòng "- Mốc: nội dung".
 * Dựng thành phần tử React (không chèn HTML), nên chữ cán bộ gõ không thể chèn mã.
 */
import { useQuery } from '@tanstack/react-query';
import { layChiTiet } from '../../services/api';
import { useNN } from '../../i18n/NgonNgu';

type Khoi = { loai: 'doan'; chu: string } | { loai: 'ds'; dong: string[] };
interface Muc { tieuDe: string | null; khoi: Khoi[] }

export function tachMuc(van: string): Muc[] {
  const ds: Muc[] = [{ tieuDe: null, khoi: [] }];
  let doan: string[] = [];
  const xongDoan = () => { if (doan.length) ds[ds.length - 1].khoi.push({ loai: 'doan', chu: doan.join(' ') }); doan = []; };
  for (const tho of van.replace(/\r\n?/g, '\n').split('\n')) {
    const dong = tho.trim();
    if (dong.startsWith('## ')) { xongDoan(); ds.push({ tieuDe: dong.slice(3).trim(), khoi: [] }); continue; }
    if (/^[-•]\s+/.test(dong)) {
      xongDoan();
      const muc = ds[ds.length - 1], cuoi = muc.khoi[muc.khoi.length - 1];
      const chu = dong.replace(/^[-•]\s+/, '');
      if (cuoi?.loai === 'ds') cuoi.dong.push(chu); else muc.khoi.push({ loai: 'ds', dong: [chu] });
      continue;
    }
    if (!dong) { xongDoan(); continue; }
    doan.push(dong);
  }
  xongDoan();
  return ds.filter((m) => m.tieuDe || m.khoi.length);
}

const LA_LICH_SU = /lịch sử hình thành|các giai đoạn|timeline/i;
/** "1715: Dựng văn miếu" -> ["1715", "Dựng văn miếu"]. Mốc dài quá 48 ký tự thì không coi là mốc. */
const tachMoc = (s: string): [string | null, string] => {
  const i = s.indexOf(': ');
  return i > 0 && i <= 48 ? [s.slice(0, i), s.slice(i + 2)] : [null, s];
};

function DongThoiGian({ dong }: { dong: string[] }) {
  return (
    <ol className="relative mt-4 space-y-5 border-l-2 border-line pl-6">
      {dong.map((d, i) => {
        const [moc, noiDung] = tachMoc(d);
        return (
          <li key={i} className="relative">
            <span aria-hidden="true" className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-action ring-2 ring-action/25" />
            {moc && <b className="block font-serif text-[17px] leading-tight text-action">{moc}</b>}
            <p className="mt-0.5 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-2">{noiDung}</p>
          </li>);
      })}
    </ol>);
}

export function NoiDungBai({ van }: { van: string }) {
  const muc = tachMuc(van);
  return (
    <div className="space-y-8">
      {muc.map((m, i) => {
        const lichSu = !!m.tieuDe && LA_LICH_SU.test(m.tieuDe);
        return (
          <section key={i}>
            {m.tieuDe && <h2 className="tieu-de-vua text-[22px]">{m.tieuDe}</h2>}
            {m.khoi.map((k, j) => k.loai === 'doan'
              ? <p key={j} className="mt-3 max-w-[68ch] text-[16px] leading-[1.7] text-ink-2">{k.chu}</p>
              : lichSu ? <DongThoiGian key={j} dong={k.dong} />
                : <ul key={j} className="mt-3 max-w-[68ch] space-y-2 text-[15.5px] leading-relaxed text-ink-2">
                  {k.dong.map((d, n) => <li key={n} className="relative pl-5"><span aria-hidden="true" className="absolute left-0 top-[0.7em] h-1.5 w-1.5 rounded-full bg-action/70" />{d}</li>)}
                </ul>)}
          </section>);
      })}
    </div>);
}

export default function BaiChiTiet({ id }: { id: string }) {
  const { chon } = useNN();
  const { data } = useQuery({ queryKey: ['chi-tiet', id], queryFn: () => layChiTiet(id), staleTime: 5 * 60_000 });
  const van = data ? chon(data.chiTiet, data.chiTietEn) : null;
  if (!van) return null;
  return <div className="mt-8 border-t border-line pt-8"><NoiDungBai van={van} /></div>;
}
