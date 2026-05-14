import { randomUUID } from 'node:crypto'

const DEFAULT_TTL_SECONDS = 300
const DEFAULT_STALE_SECONDS = 3600
const DEFAULT_LIMIT = 500

function getEnv(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function parseCacheSeconds(value, fallback) {
  const num = Number(value)
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : fallback
}

function readRequestHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()]
  if (Array.isArray(value)) return value[0]
  return value || ''
}

function splitICalLines(text) {
  const rawLines = String(text || '').split(/\r?\n/)
  const lines = []

  for (const line of rawLines) {
    if (/^[ \t]/.test(line) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }

  return lines
}

function unfoldValue(line) {
  const idx = line.indexOf(':')
  if (idx === -1) return { key: '', value: '' }
  const rawKey = line.slice(0, idx)
  const value = line.slice(idx + 1)
  return { key: rawKey.split(';')[0].toUpperCase(), value }
}

function parseDateValue(input, floatingDateOnly = false) {
  if (!input) return null
  let s = String(input).trim()
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4))
    const m = Number(s.slice(4, 6)) - 1
    const d = Number(s.slice(6, 8))
    const timestamp = Date.UTC(y, m, d, 0, 0, 0)
    return {
      iso: new Date(timestamp).toISOString(),
      timestamp,
      isDateOnly: true,
    }
  }

  const isZulu = s.endsWith('Z')
  if (isZulu) s = s.slice(0, -1)
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(s)
  if (!match) return null

  const [, y, mo, d, h, mi, se] = match
  const timestamp = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se))
  return {
    iso: new Date(timestamp).toISOString(),
    timestamp,
    isDateOnly: floatingDateOnly,
  }
}

function parseICS(text) {
  const lines = splitICalLines(text)
  const events = []
  let current = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }

    if (line === 'END:VEVENT') {
      if (current?.DTSTART) {
        const start = parseDateValue(current.DTSTART, /^\d{8}$/.test(current.DTSTART))
        const end = current.DTEND ? parseDateValue(current.DTEND, /^\d{8}$/.test(current.DTEND)) : null
        const computedEnd = end?.timestamp ?? (start ? start.timestamp + (/^\d{8}$/.test(current.DTSTART) ? 86400000 : 0) : null)

        if (start && computedEnd !== null) {
          events.push({
            uid: current.UID || randomUUID(),
            summary: current.SUMMARY || '',
            description: current.DESCRIPTION || '',
            location: current.LOCATION || '',
            start: start.timestamp,
            end: computedEnd,
            startISO: start.iso,
            endISO: new Date(computedEnd).toISOString(),
            isAllDay: start.isDateOnly || /^\d{8}$/.test(current.DTSTART),
            status: current.STATUS || '',
            organizer: current.ORGANIZER || '',
            raw: current,
          })
        }
      }
      current = null
      continue
    }

    if (!current) continue
    const { key, value } = unfoldValue(line)
    if (key) current[key] = value
  }

  return events
}

function jsonResponse(res, statusCode, body, headers = {}) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value)
  }
  res.end(JSON.stringify(body))
}

function validateType(type) {
  if (type === 'work' || type === 'holiday') return type
  return ''
}

async function fetchUpstreamICS(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`Upstream fetch failed: ${response.status}`)
  }

  return response.text()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  const type = validateType(req.query?.type)
  if (!type) {
    return jsonResponse(res, 400, { error: 'Missing or invalid type parameter' })
  }

  const provider = 'cloud'

  const normalizeWebcalUrl = (input) => {
    const value = String(input || '').trim()
    if (!value) return ''
    if (value.startsWith('webcal://')) {
      return `https://${value.slice('webcal://'.length)}`
    }
    return value
  }

  const upstreamMap = {
    work: getEnv(
      'WORK_CAL_URL',
      'https://p213-caldav.icloud.com.cn/published/2/MTY5NDg3MTEzOTE2OTQ4N5k-tqjsWyylfFENPuKvr4kCrEPhpo4LCnnzMME290vRvHnxk_OlHsDp1-MTwmnU8ZLtkXUWm8mXulM4Zo6QCp8'
    ),
    holiday: getEnv('HOLIDAY_CAL_URL', 'https://calendars.icloud.com/holidays/cn_zh.ics/'),
  }

  const targetUrl = normalizeWebcalUrl(upstreamMap[type])
  if (!targetUrl) {
    return jsonResponse(res, 500, { error: 'Calendar source is not configured' })
  }

  const format = String(req.query?.format || '').toLowerCase()
  const limit = Math.max(1, Math.min(DEFAULT_LIMIT, Number(req.query?.limit) || DEFAULT_LIMIT))
  const ttlSeconds = parseCacheSeconds(req.query?.ttl, parseCacheSeconds(getEnv('CALENDAR_CACHE_TTL_SECONDS'), DEFAULT_TTL_SECONDS))
  const staleSeconds = parseCacheSeconds(getEnv('CALENDAR_CACHE_STALE_SECONDS'), DEFAULT_STALE_SECONDS)

  try {
    const text = await fetchUpstreamICS(targetUrl)
    const events = parseICS(text).slice(0, limit)
    const etag = `W/\"${Buffer.from(JSON.stringify({ type, limit, count: events.length, size: text.length })).toString('base64url')}\"`
    const ifNoneMatch = readRequestHeader(req, 'if-none-match')
    const fetchedAtMs = Date.now()
    const fetchedAt = new Date(fetchedAtMs).toISOString()

    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`)
    res.setHeader('ETag', etag)
    res.setHeader('X-Calendar-Source', type)
    res.setHeader('X-Calendar-Upstream', targetUrl)
    res.setHeader('X-Calendar-Fetched-At', String(fetchedAtMs))

    if (ifNoneMatch && ifNoneMatch === etag) {
      res.statusCode = 304
      res.end()
      return
    }

    if (format === 'ics' || format === 'text' || !format) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
      res.end(text)
      return
    }

    return jsonResponse(res, 200, {
      source: type,
      upstream: targetUrl,
      fetchedAt,
      fetchedAtMs,
      count: events.length,
      events,
    })
  } catch (error) {
    console.error('Fetch error:', error)
    return jsonResponse(res, 500, {
      error: 'Failed to fetch calendar',
      source: type,
    })
  }
}
