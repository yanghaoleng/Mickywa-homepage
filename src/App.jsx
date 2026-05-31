import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import CollectionPage from './components/CollectionPage'
import Schedule from './components/Schedule'
import useTheme from './hooks/useTheme'

function App() {
  const { theme } = useTheme()
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
  const isCollectionPage = pathname === '/collection' || pathname === '/collection/'
  const enableVercelMetrics =
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname)

  if (isCollectionPage) {
    return (
      <>
        <CollectionPage />
        {enableVercelMetrics && <Analytics />}
        {enableVercelMetrics && <SpeedInsights />}
      </>
    )
  }

  return (
    <div className="dark:bg-[#333333] bg-[#FFFFFF] h-screen flex justify-center transition-colors duration-300">
      <div className="w-full h-full dark:bg-[#333333] bg-[#FFFFFF] relative transition-colors duration-300">
        <Schedule theme={theme} />
      </div>
      {enableVercelMetrics && <Analytics />}
      {enableVercelMetrics && <SpeedInsights />}
    </div>
  )
}

export default App
