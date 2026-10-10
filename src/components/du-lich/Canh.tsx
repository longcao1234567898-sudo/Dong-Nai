/** Phong cảnh động ở phần mở đầu: đồi, sông chảy, mây trôi, chim bay. */
export default function Canh() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[210px] w-full" viewBox="0 0 1200 210" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g className="may" opacity=".7"><ellipse cx="60" cy="40" rx="56" ry="13" fill="#fff" /><ellipse cx="98" cy="31" rx="38" ry="12" fill="#fff" /></g>
      <g className="may2" opacity=".55"><ellipse cx="40" cy="74" rx="78" ry="15" fill="#fff" /><ellipse cx="90" cy="66" rx="40" ry="11" fill="#fff" /></g>
      <g className="chim" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round"><path d="M20 58 q6 -6 12 0 q6 -6 12 0" /><path d="M52 70 q5 -5 10 0 q5 -5 10 0" /></g>
      <g className="chim2" fill="none" stroke="#065f46" strokeWidth="1.8" strokeLinecap="round"><path d="M10 96 q5 -5 10 0 q5 -5 10 0" /></g>
      <path d="M0 140 L110 92 L215 132 L345 76 L480 128 L625 66 L775 124 L915 80 L1065 132 L1200 96 V210 H0Z" fill="#059669" opacity=".16" />
      <path d="M0 168 Q200 124 400 160 T800 154 T1200 146 V210 H0Z" fill="#1B5E20" opacity=".22" />
      <path className="dong-song" d="M0 192 Q300 172 600 190 T1200 184" stroke="#1E3A5F" strokeWidth="3" fill="none" opacity=".45" />
      <path d="M0 200 Q300 186 600 202 T1200 196 V210 H0Z" fill="#1E3A5F" opacity=".18" />
    </svg>
  );
}
