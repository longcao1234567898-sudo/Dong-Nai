/** @type {import('tailwindcss').Config} */
/* Màu lấy từ token trong src/styles/tokens.css (đổi sáng/tối ở một chỗ).
   Tỉ lệ tương phản đã đo ghi trong docs/THIET-KE-GIAO-DIEN.md, mục 2.1. */
const tk = (ten) => `rgb(var(--c-${ten}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: tk('forest'),
        'forest-raised': tk('forest-raised'),
        emerald: tk('emerald'),
        action: tk('action'),
        'action-hover': tk('action-hover'),
        'on-action': tk('on-action'),
        ivory: tk('bg'),
        paper: tk('surface'),
        sunken: tk('sunken'),
        ink: tk('ink'),
        'ink-2': tk('ink-2'),
        muted: tk('muted'),
        line: tk('line'),
        'line-strong': tk('line-strong'),
        coral: tk('coral'),
        route: tk('route'),
        star: tk('star'),
        gold: tk('gold'),
        /* Thang cũ, khu quản trị còn dùng: ánh xạ lại về bảng màu mới để
           hai khu cùng một giọng màu. 600 là nền nút (chữ trắng 5.26:1). */
        primary: {
          50: '#EEF5F1', 100: '#D5E9E0', 200: '#ABD3C2', 300: '#79B9A1', 400: '#3FA585',
          500: '#1C8C72', 600: '#157A63', 700: '#116553', 800: '#0F4F42', 900: '#123C35',
        },
        secondary: { 50: '#EEF3F1', 100: '#DCE6E2', 400: '#5B8A7E', 500: '#123C35', 600: '#0F302A', 700: '#0B241F' },
        accent: { 100: '#FBF1DC', 500: '#EABF67', 600: '#9A6B12' },
      },
      fontFamily: {
        // Be Vietnam Pro: dấu hai tầng (Ố, Ộ, Ữ) đầy đủ. Newsreader: serif biên tập, có bộ tiếng Việt.
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', '"Noto Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Bóng hai lớp nhuộm màu rừng: một lớp bám sát (tiếp xúc), một lớp toả xa (ánh sáng môi trường).
        soft: '0 1px 1px rgb(18 60 53 / .05), 0 2px 4px rgb(18 60 53 / .05), 0 12px 24px -12px rgb(18 60 53 / .18)',
        'sh-1': 'var(--sh-1)',
        'sh-2': 'var(--sh-2)',
        'sh-3': 'var(--sh-3)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(.22, 1, .36, 1)', 'in-out': 'cubic-bezier(.65, 0, .35, 1)', expo: 'cubic-bezier(.16, 1, .3, 1)' },
    },
  },
  plugins: [],
};
