import { useId } from 'react';
import { LOAI } from '../../utils/hangSo';
import type { Loai } from '../../utils/kieu';
/** Tranh minh hoạ cho thẻ điểm đến, đổi hoạ tiết theo loại cảnh. */
export default function Tranh({ loai }: { loai: Loai }) {
  const id = useId().replace(/:/g, ''), m = LOAI[loai]?.mau || '#1B5E20';
  return (
    <svg className="block h-36 w-full" viewBox="0 0 300 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={m} stopOpacity=".2" /><stop offset="1" stopColor={m} stopOpacity=".04" /></linearGradient></defs>
      <rect width="300" height="140" fill={`url(#${id})`} />
      {loai === 'thien-nhien' && <><path d="M0 96 L58 46 L98 80 L146 28 L206 90 L248 58 L300 98 V140 H0Z" fill={m} opacity=".5" /><path d="M146 50 v44" stroke="#fff" strokeWidth="5" opacity=".75" /><path d="M0 112 Q75 96 150 112 T300 108 V140 H0Z" fill={m} /></>}
      {loai === 'di-tich' && <><path d="M92 72 L150 38 L208 72Z" fill={m} /><path d="M100 72 h100 v40 h-100z" fill={m} opacity=".8" /><path d="M140 86 h20 v26 h-20z" fill="#fff" opacity=".6" /><path d="M0 112 H300 V140 H0Z" fill={m} /></>}
      {loai === 'vui-choi' && <><circle cx="232" cy="40" r="16" fill="#fff" opacity=".85" /><path d="M0 100 Q75 84 150 100 T300 95 V140 H0Z" fill={m} opacity=".55" /><path d="M110 96 h52 l-9 11 h-34z" fill="#fff" opacity=".9" /><path d="M0 116 Q75 104 150 116 T300 112 V140 H0Z" fill={m} /></>}
      {!['thien-nhien', 'di-tich', 'vui-choi'].includes(loai) && <path d="M0 104 Q75 82 150 102 T300 96 V140 H0Z" fill={m} />}
    </svg>
  );
}
