import React, { useEffect, useMemo, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import useTheme from './hooks/useTheme'

const API_BASE = import.meta.env.VITE_CALENDAR_API_BASE || ''
const CALENDAR_JSON_URL = `${API_BASE.replace(/\/$/, '')}/api/calendar?type=work&format=json`

function Schedule({ theme }) {
  const [state, setState] = useState({ loading: true, error: '', data: null })

  useEffect(() => {
    let active = true

    async function loadCalendar() {
      try {
        setState({ loading: true, error: '', data: null })
        const response = await fetch(CALENDAR_JSON_URL)
        const contentType = response.headers.get('content-type') || ''
        const bodyText = await response.text()
        if (!response.ok) {
          throw new Error(bodyText || `HTTP ${response.status}`)
        }
        if (!contentType.includes('application/json')) {
          throw new Error(bodyText || '接口返回的不是 JSON')
        }
        const data = JSON.parse(bodyText)
        if (active) {
          setState({ loading: false, error: '', data })
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error?.message || '日历加载失败', data: null })
        }
      }
    }

    loadCalendar()

    return () => {
      active = false
    }
  }, [])

  const content = useMemo(() => {
    if (state.loading) {
      return '正在加载日历数据...'
    }

    if (state.error) {
      return state.error
    }

    const count = state.data?.count ?? 0
    const fetchedAt = state.data?.fetchedAt ? new Date(state.data.fetchedAt).toLocaleString('zh-CN') : ''

    return `已接入云函数日历数据，共 ${count} 条事件${fetchedAt ? `，更新于 ${fetchedAt}` : ''}`
  }, [state])

  const cardClass = theme === 'dark' ? 'bg-[#333333] text-white' : 'bg-[#FFFFFF] text-[#3A3A3A]'

  return (
    <div className={`${cardClass} h-full`}>
      <div className="p-6 text-sm leading-6">{content}</div>
      {state.data?.events?.length ? (
        <div className="px-6 pb-6 text-xs leading-5 opacity-80">
          <div className="mb-2 font-semibold">最近事件</div>
          <ul className="space-y-2">
            {state.data.events.slice(0, 5).map((event) => (
              <li key={event.uid}>
                <div className="font-medium">{event.summary || '未命名事件'}</div>
                <div>
                  {event.isAllDay
                    ? '全天'
                    : `${new Date(event.startISO).toLocaleString('zh-CN')} - ${new Date(event.endISO).toLocaleString('zh-CN')}`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function App() {
  const { theme } = useTheme()
  const enableVercelMetrics =
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname)

  return (
    <div className="dark:bg-[#333333] bg-[#FFFFFF] h-screen overflow-hidden flex justify-center transition-colors duration-300">
      <div className="w-full max-w-[440px] h-full dark:bg-[#333333] bg-[#FFFFFF] relative transition-colors duration-300 overflow-hidden">
        <Schedule theme={theme} />
      </div>
      {enableVercelMetrics && <Analytics />}
      {enableVercelMetrics && <SpeedInsights />}
    </div>
  )
}

export default App
