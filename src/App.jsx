import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Schedule from './components/Schedule'
import useTheme from './hooks/useTheme'

function App() {
  const { theme } = useTheme()

  return (
    <div className="dark:bg-[#333333] bg-[#FFFFFF] h-screen flex justify-center transition-colors duration-300">
      <div className="w-full h-full dark:bg-[#333333] bg-[#FFFFFF] relative transition-colors duration-300">
        <Schedule theme={theme} />
      </div>
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
