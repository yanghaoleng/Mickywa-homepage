import { randomUUID } from 'node:crypto'

const DEFAULT_TTL_SECONDS = 300
const DEFAULT_STALE_SECONDS = 3600
const DEFAULT_LIMIT = 500
const WORK_LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000
const WORK_LOOKAHEAD_MS = 45 * 24 * 60 * 60 * 1000
const DEFAULT_FLOATING_TZID = 'Asia/Shanghai'
const TZ_OFFSET_MINUTES = {
  UTC: 0,
  'ASIA/SHANGHAI': 8 * 60,
  'ASIA/CHONGQING': 8 * 60,
  'ASIA/CHUNGKING': 8 * 60,
  'ASIA/HONG_KONG': 8 * 60,
  'ASIA/BANGKOK': 7 * 60,
}

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

function parsePropertyLine(line) {
  const idx = line.indexOf(':')
  if (idx === -1) return { key: '', value: '', params: {} }
  const rawKey = line.slice(0, idx)
  const value = line.slice(idx + 1)
  const parts = rawKey.split(';')
  const params = {}
  for (const part of parts.slice(1)) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    const name = part.slice(0, eqIdx).trim().toUpperCase()
    const paramValue = part.slice(eqIdx + 1).trim()
    if (name) params[name] = paramValue
  }
  return { key: parts[0].toUpperCase(), value, params }
}

function getTzOffsetMinutes(tzid) {
  const normalized = String(tzid || '').trim().toUpperCase()
  if (!normalized) return null
  return Object.prototype.hasOwnProperty.call(TZ_OFFSET_MINUTES, normalized)
    ? TZ_OFFSET_MINUTES[normalized]
    : null
}

function toIsoWithOffset(timestamp, tzid) {
  const offsetMinutes = getTzOffsetMinutes(tzid)
  if (offsetMinutes === null) return new Date(timestamp).toISOString()
  const localTs = timestamp + offsetMinutes * 60 * 1000
  const d = new Date(localTs)
  const pad = (n) => String(n).padStart(2, '0')
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absMinutes = Math.abs(offsetMinutes)
  const tzH = pad(Math.floor(absMinutes / 60))
  const tzM = pad(absMinutes % 60)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${sign}${tzH}:${tzM}`
}

function parseDateValue(input, { valueType = '', tzid = '' } = {}) {
  if (!input) return null
  let s = String(input).trim()
  const normalizedValueType = String(valueType || '').trim().toUpperCase()
  const effectiveTzid = String(tzid || DEFAULT_FLOATING_TZID).trim() || DEFAULT_FLOATING_TZID

  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4))
    const m = Number(s.slice(4, 6)) - 1
    const d = Number(s.slice(6, 8))
    const offsetMinutes = getTzOffsetMinutes(effectiveTzid) ?? 0
    const timestamp = Date.UTC(y, m, d, 0, 0, 0) - offsetMinutes * 60 * 1000
    return {
      iso: new Date(timestamp).toISOString(),
      isoLocal: toIsoWithOffset(timestamp, effectiveTzid),
      timestamp,
      isDateOnly: true,
      tzid: effectiveTzid,
    }
  }

  const isZulu = s.endsWith('Z')
  if (isZulu) s = s.slice(0, -1)
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(s)
  if (!match) return null

  const [, y, mo, d, h, mi, se] = match
  let timestamp = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se))
  const offsetMinutes = isZulu ? 0 : getTzOffsetMinutes(effectiveTzid)
  if (!isZulu && offsetMinutes !== null) {
    timestamp -= offsetMinutes * 60 * 1000
  }
  return {
    iso: new Date(timestamp).toISOString(),
    isoLocal: toIsoWithOffset(timestamp, isZulu ? 'UTC' : effectiveTzid),
    timestamp,
    isDateOnly: normalizedValueType === 'DATE',
    tzid: isZulu ? 'UTC' : effectiveTzid,
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
        const start = parseDateValue(current.DTSTART, {
          valueType: current.DTSTART_VALUE,
          tzid: current.DTSTART_TZID,
        })
        const end = current.DTEND
          ? parseDateValue(current.DTEND, {
              valueType: current.DTEND_VALUE,
              tzid: current.DTEND_TZID || current.DTSTART_TZID,
            })
          : null
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
            startLocal: start.isoLocal,
            endISO: new Date(computedEnd).toISOString(),
            endLocal: end?.isoLocal || toIsoWithOffset(computedEnd, start.tzid),
            isAllDay: start.isDateOnly || /^\d{8}$/.test(current.DTSTART),
            status: current.STATUS || '',
            organizer: current.ORGANIZER || '',
            timeZone: start.tzid || DEFAULT_FLOATING_TZID,
            raw: current,
          })
        }
      }
      current = null
      continue
    }

    if (!current) continue
    const { key, value, params } = parsePropertyLine(line)
    if (key) {
      current[key] = value
      if (params.TZID) current[`${key}_TZID`] = params.TZID
      if (params.VALUE) current[`${key}_VALUE`] = params.VALUE
    }
  }

  return events
}

function getRelevantEvents(events, type, nowMs = Date.now()) {
  const sorted = [...(events || [])].sort((a, b) => {
    const aStart = Number(a?.start) || 0
    const bStart = Number(b?.start) || 0
    return aStart - bStart
  })

  if (type !== 'work') return sorted

  const windowStart = nowMs - WORK_LOOKBACK_MS
  const windowEnd = nowMs + WORK_LOOKAHEAD_MS

  return sorted.filter(event => {
    const start = Number(event?.start)
    const end = Number(event?.end)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false
    return start < windowEnd && end > windowStart
  })
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

function normalizeFetchError(error, targetUrl, elapsedMs) {
  const message = String(error?.message || error || 'Unknown upstream error')
  const timeout = error?.name === 'AbortError'
  const status = Number.isFinite(error?.statusCode) ? error.statusCode : null
  const code = timeout
    ? 'UPSTREAM_TIMEOUT'
    : status
      ? `UPSTREAM_HTTP_${status}`
      : 'UPSTREAM_FETCH_ERROR'

  return {
    code,
    message: timeout ? `Upstream request timed out after ${elapsedMs}ms` : message,
    upstream: targetUrl,
    status,
    timeout,
    elapsedMs,
  }
}

async function fetchUpstreamICS(url) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 4500)
  let response
  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const err = new Error(body || `Upstream fetch failed: ${response.status}`)
    err.statusCode = response.status
    throw err
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
  const startedAt = Date.now()

  try {
    const text = await fetchUpstreamICS(targetUrl)
    const allEvents = parseICS(text)
    const relevantEvents = getRelevantEvents(allEvents, type, startedAt)
    const events = relevantEvents.slice(0, limit)
    const etag = `W/\"${Buffer.from(JSON.stringify({ type, limit, count: events.length, totalCount: allEvents.length, filteredCount: relevantEvents.length, size: text.length })).toString('base64url')}\"`
    const ifNoneMatch = readRequestHeader(req, 'if-none-match')
    const fetchedAtMs = Date.now()
    const fetchedAt = new Date(fetchedAtMs).toISOString()
    const elapsedMs = Math.max(0, fetchedAtMs - startedAt)

    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`)
    res.setHeader('ETag', etag)
    res.setHeader('X-Calendar-Source', type)
    res.setHeader('X-Calendar-Upstream', targetUrl)
    res.setHeader('X-Calendar-Fetched-At', String(fetchedAtMs))
    res.setHeader('X-Calendar-Elapsed-Ms', String(elapsedMs))

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
      elapsedMs,
      totalCount: allEvents.length,
      filteredCount: relevantEvents.length,
      count: events.length,
      events,
    })
  } catch (error) {
    const details = normalizeFetchError(error, targetUrl, Math.max(0, Date.now() - startedAt))
    console.error('Fetch error:', details)
    return jsonResponse(res, 500, {
      error: 'Failed to fetch calendar',
      source: type,
      provider,
      upstream: targetUrl,
      details,
    }, {
      'X-Calendar-Source': type,
      'X-Calendar-Upstream': targetUrl,
      'X-Calendar-Error-Code': details.code,
    })
  }
}
