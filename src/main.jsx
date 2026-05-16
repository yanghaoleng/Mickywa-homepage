import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 动画 Favicon 初始化
function initAnimatedFavicon() {
  const link = document.querySelector('link[rel~="icon"]');
  if (!link) return;

  const originalHref = link.href;

  try {
    const worker = new Worker('/favicon-worker.js');
    worker.onmessage = (e) => {
      if (e.data.type === 'updateFavicon') {
        link.href = e.data.dataUrl;
      }
    };
    worker.postMessage({ type: 'start' });

    // 页面卸载时恢复原始 favicon
    window.addEventListener('beforeunload', () => {
      link.href = originalHref;
      worker.terminate();
    });
  } catch {
    // Web Worker 不可用时（如 OffscreenCanvas 不支持），保持静态 favicon
  }
}

initAnimatedFavicon();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)