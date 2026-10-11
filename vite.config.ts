import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /* Cổng 5173 khớp danh sách CORS mặc định của máy chủ (server/src/index.js).
     Chạy trên máy: chuyển /api sang máy chủ cổng 4000, nên để trống
     VITE_API_URL là gọi được ngay (README hướng dẫn vậy, trước đây thiếu dòng này). */
  server: { port: 5173, open: true, proxy: { '/api': 'http://localhost:4000' } },
  build: {
    sourcemap: false,
    /* Gói cảnh 3D (three.js, ~140 kB nén) chỉ tải sau khi trang chủ đã hiện chữ, không chặn lần vẽ đầu. */
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        /* Tách thư viện lớn thành gói riêng: bản đồ và biểu đồ chỉ tải khi cần. */
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ban-do': ['leaflet', 'react-leaflet'],
          'vendor-bieu-do': ['recharts'],
        },
      },
    },
  },
});
