import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /* Cổng 5173 khớp danh sách CORS mặc định của máy chủ (server/src/index.js). */
  server: { port: 5173, open: true },
  build: {
    sourcemap: false,
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
