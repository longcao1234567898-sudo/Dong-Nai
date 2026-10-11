import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import BaoLoi, { taiLaiLayBanMoi } from './components/common/BaoLoi';

/* Vite báo tải trước tệp mã hỏng (thường do vừa có bản mới): tải lại trang lấy bản mới. */
window.addEventListener('vite:preloadError', (e) => { if (taiLaiLayBanMoi()) e.preventDefault(); });

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BaoLoi toanTrang><App /></BaoLoi></React.StrictMode>);
