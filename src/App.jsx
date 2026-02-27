import React from 'react'
import Schedule from './components/Schedule'

function App() {
  return (
    <div className="bg-[#1f1406] min-h-screen flex justify-center">
      <div className="w-full max-w-[414px] min-w-[375px] bg-[#1f1406] shadow-2xl overflow-hidden relative">
        <Schedule />
      </div>
    </div>
  )
}

export default App