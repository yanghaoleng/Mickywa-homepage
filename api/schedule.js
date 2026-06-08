import { parseICS, hashPrivateValue } from './calendar.js'
import { buildScheduleData } from '../vefaas-worker/ical-core.js'

const DEFAULT_TTL_SECONDS = 30
const DEFAULT_STALE_SECONDS = 600
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

let memoryCache = {
  data: null,
  fetchedAtMs: 0,
  etag: '',
}

function getEnv(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function parseCacheSeconds(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number(value)
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : fallback
}

function normalizeWebcalUrl(input) {
  const value = String(input || '').trim()
  if (!value) return ''
  if (value.startsWith('webcal://')) return `https://${value.slice('webcal://'.length)}`
  return value
}

function readRequestHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()]
  if (Array.isArray(value)) return value[0]
  return value || ''
}

function jsonResponse(res, statusCode, body, headers = {}) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value)
  }
  res.end(JSON.stringify(body))
}

function getShanghaiYear(nowMs) {
  return new Date(nowMs + SHANGHAI_OFFSET_MS).getUTCFullYear()
}

async function fetchWithTimeout(url, { timeoutMs, headers }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers,
      signal: controller.signal,
    })
    const text = await response.text()
    if (!response.ok) {
      const error = new Error(text || `HTTP ${response.status}`)
      error.statusCode = response.status
      throw error
    }
    return text
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchJson(url, timeoutMs) {
  const text = await fetchWithTimeout(url, {
    timeoutMs,
    headers: { Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8' },
  })
  return JSON.parse(text)
}

async function fetchText(url, timeoutMs) {
  return fetchWithTimeout(url, {
    timeoutMs,
    headers: { Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8' },
  })
}

function normalizeError(error, elapsedMs) {
  const message = String(error?.message || error || 'Unknown schedule error')
  return {
    code: error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'SCHEDULE_FETCH_ERROR',
    message: error?.name === 'AbortError' ? `Schedule refresh timed out after ${elapsedMs}ms` : message,
    status: Number.isFinite(error?.statusCode) ? error.statusCode : null,
    timeout: error?.name === 'AbortError',
    elapsedMs,
  }
}

export async function buildSchedulePayload({ startedAt, timeoutMs }) {
  const workCalUrl = normalizeWebcalUrl(getEnv('WORK_CAL_URL'))
  if (!workCalUrl) {
    throw new Error('Calendar source is not configured')
  }

  const holidayBase = getEnv('HOLIDAY_CN_BASE_URL', 'https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master')
  const year = getShanghaiYear(startedAt)
  const years = [year, year + 1]
  const [icsText, ...holidayCnYears] = await Promise.all([
    fetchText(workCalUrl, timeoutMs),
    ...years.map((y) => fetchJson(`${holidayBase}/${y}.json`, timeoutMs).catch(() => ({ days: [] }))),
  ])

  const workEvents = parseICS(icsText)
  const schedule = buildScheduleData(workEvents, holidayCnYears, 2, startedAt)
  const fetchedAtMs = Date.now()
  const elapsedMs = Math.max(0, fetchedAtMs - startedAt)

  return {
    generatedAtMs: fetchedAtMs,
    generatedAtISO: new Date(fetchedAtMs).toISOString(),
    source: {
      provider: 'vercel-schedule',
      workCalHash: hashPrivateValue(workCalUrl),
      holidayBase,
    },
    workEvents,
    holidayCnYears,
    schedule,
    isMock: false,
    calendarSource: 'cloud',
    calendarProvider: 'vercel-schedule',
    calendarFetchedAtMs: fetchedAtMs,
    calendarFetchElapsedMs: elapsedMs,
    calendarReason: '',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method !== 'GET') {
    return jsonResponse(res, 405, { ok: false, error: 'Method not allowed' })
  }

  const ttlSeconds = parseCacheSeconds(getEnv('SCHEDULE_CACHE_TTL_SECONDS'), DEFAULT_TTL_SECONDS)
  const staleSeconds = parseCacheSeconds(getEnv('SCHEDULE_STALE_SECONDS'), DEFAULT_STALE_SECONDS)
  const startedAt = Date.now()
  const force = req.query?.force === '1' || Boolean(req.query?.t)
  const ifNoneMatch = readRequestHeader(req, 'if-none-match')
  const cacheAgeMs = startedAt - memoryCache.fetchedAtMs
  const freshMemoryCache = memoryCache.data && !force && cacheAgeMs >= 0 && cacheAgeMs < ttlSeconds * 1000

  const cacheControl = `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`
  res.setHeader('Cache-Control', force ? 'no-store' : cacheControl)

  if (freshMemoryCache) {
    res.setHeader('ETag', memoryCache.etag)
    res.setHeader('X-Calendar-Cache', 'memory')
    if (ifNoneMatch && ifNoneMatch === memoryCache.etag) {
      res.statusCode = 304
      res.end()
      return
    }
    return jsonResponse(res, 200, memoryCache.data)
  }

  try {
    const timeoutMs = parseCacheSeconds(getEnv('SCHEDULE_UPSTREAM_TIMEOUT_MS'), 9000)
    const data = await buildSchedulePayload({ startedAt, timeoutMs })
    const etag = `W/"${Buffer.from(JSON.stringify({
      generatedAtMs: data.generatedAtMs,
      workEventCount: data.workEvents.length,
      firstDay: data.schedule[0]?.key || '',
      lastDay: data.schedule[data.schedule.length - 1]?.key || '',
    })).toString('base64url')}"`

    memoryCache = {
      data,
      fetchedAtMs: data.generatedAtMs,
      etag,
    }

    res.setHeader('ETag', etag)
    res.setHeader('X-Calendar-Cache', force ? 'refresh' : 'miss')
    return jsonResponse(res, 200, data)
  } catch (error) {
    const details = normalizeError(error, Math.max(0, Date.now() - startedAt))
    if (memoryCache.data) {
      res.setHeader('ETag', memoryCache.etag)
      res.setHeader('X-Calendar-Cache', 'stale-memory')
      return jsonResponse(res, 200, {
        ...memoryCache.data,
        calendarReason: `served_stale_after_error:${details.code}`,
      })
    }

    return jsonResponse(res, 502, {
      ok: false,
      error: 'Failed to build schedule',
      details,
    }, {
      'X-Calendar-Cache': 'error',
      'X-Calendar-Error-Code': details.code,
    })
  }
}
