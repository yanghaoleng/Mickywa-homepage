import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 本地开发代理 iCloud 日历，解决 CORS 问题
      '/api/work-calendar': {
        target: 'https://outlook.live.com',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/work-calendar/,
            '/owa/calendar/00000000-0000-0000-0000-000000000000/48be9371-5a7c-4c58-8a64-4268b3012841/cid-06E665F8FD44A075/calendar.ics'
          ),
      },
      '/api/holiday-calendar': {
        target: 'https://calendars.icloud.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/holiday-calendar/, '/holidays/cn_zh.ics/'),
      },
    },
  },
})
