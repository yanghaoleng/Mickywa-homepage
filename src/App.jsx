import React from 'react'
import Schedule from './components/Schedule'
import useTheme from './hooks/useTheme'

function App() {
  const { theme } = useTheme()

  return (
    <div className="dark:bg-[#1f1406] bg-[#fbf8cc] min-h-screen flex justify-center transition-colors duration-300">
      <div className="w-full max-w-[414px] min-w-[375px] dark:bg-[#1f1406] bg-[#fbf8cc] shadow-2xl overflow-hidden relative transition-colors duration-300">
        <Schedule theme={theme} />
      </div>
    </div>
  )
}

export default App