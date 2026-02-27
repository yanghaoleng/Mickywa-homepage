import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 本地开发代理 iCloud 日历，解决 CORS 问题
      '/api/work-calendar': {
        target: 'https://p228-caldav.icloud.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/work-calendar/, '/published/2/MTY4NjUyNzUzNjAxNjg2NeST_Tn2EHy6yE2hkvWkYhtgsVRJM_iMUhuHPUSHHgSr'),
      },
      '/api/holiday-calendar': {
        target: 'https://calendars.icloud.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/holiday-calendar/, '/holidays/cn_zh.ics/'),
      },
    },
  },
})