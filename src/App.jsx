import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Schedule from './components/Schedule'
import useTheme from './hooks/useTheme'

function App() {
  const { theme } = useTheme()
  const enableVercelMetrics =
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname)

  return (
    <div className="dark:bg-[#333333] bg-[#FFFFFF] h-screen overflow-hidden flex justify-center transition-colors duration-300">
      <div className="w-full max-w-[440px] h-full dark:bg-[#333333] bg-[#FFFFFF] relative transition-colors duration-300 overflow-y-auto overflow-x-hidden overscroll-contain">
        <Schedule theme={theme} />
      </div>
      {enableVercelMetrics && <Analytics />}
      {enableVercelMetrics && <SpeedInsights />}
    </div>
  )
}

export default App
