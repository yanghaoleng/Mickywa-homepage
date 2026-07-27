import {
  SHANGHAI_OFFSET_MS,
  TIME_SLOTS,
  buildScheduleData,
  getDateRangeDays,
  parseICS
} from '../../vefaas-worker/ical-core.js';

const WORK_CAL_URL = import.meta.env.VITE_WORK_CAL_URL || '/api/calendar?type=work';
const HOLIDAY_CAL_URL = import.meta.env.VITE_HOLIDAY_CAL_URL || '/api/calendar?type=holiday';

const HOLIDAY_CN_BASE_URL = import.meta.env.VITE_HOLIDAY_CN_BASE_URL || 'https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master';
const STATIC_SCHEDULE_JSON_URL = import.meta.env.VITE_STATIC_SCHEDULE_JSON_URL || '/schedule-snapshot.json';
const SAME_ORIGIN_SCHEDULE_JSON_URL = '/api/schedule';
const LEGACY_SCHEDULE_JSON_URL = import.meta.env.VITE_SCHEDULE_JSON_URL || '';

async function fetchICS(url, type) {
  let targetUrl = url;
  
  // Vercel Serverless API 优先 (生产环境/部署后)
  // 如果当前是 Vercel 部署环境，直接请求 /api/calendar
  // 简单判断：如果域名不是 localhost，或者显式配置了 VERCEL_URL?
  // 更好的方式：默认先尝试 /api/calendar，如果 404 再尝试其他？
  // 或者直接看是否是相对路径。Vercel Function 部署后会在同源下。
  
  // 策略：总是优先尝试 /api/calendar?type=...
  // 因为 Vercel Function 解决了 CORS 和 缓存问题。
  
  if (type) {
    return fetch(`/api/calendar?type=${type}`)
      .then(res => {
        if (!res.ok) throw new Error('API fetch failed');
        return res.text();
      })
      .catch(err => {
        console.warn('Vercel API fetch failed, falling back to direct/proxy fetch:', err);
        // Fallback logic below
        return fallbackFetch(url);
      });
  }

  return fallbackFetch(url);
}

async function fallbackFetch(url) {
  let targetUrl = url;
  
  // 本地开发代理逻辑：如果没有配置 VITE_PROXY_URL，则尝试走本地 Vite 代理
  if (import.meta.env.DEV) {
    if (url.includes('outlook.live.com/owa/calendar')) {
      targetUrl = '/api/work-calendar';
    } else if (url.includes('calendars.icloud.com')) {
      targetUrl = '/api/holiday-calendar';
    }
  }

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.text();
  } catch (err) {
    throw err;
  }
}

const CACHE_KEY = 'mickywa_schedule_cache_v3';
const HOLIDAY_CN_CACHE_PREFIX = 'mickywa_holiday_cn_year_v2_';
const HOLIDAY_CN_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCHEDULE_MIN_REFRESH_MS = 2 * 60 * 1000;
const SCHEDULE_STALE_FALLBACK_MS = 2 * 60 * 60 * 1000;
const scheduleJsonInFlight = new Map();

function fetchTextWithTimeout(url, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || `HTTP ${res.status}`);
      }
      return { text, headers: res.headers };
    })
    .finally(() => clearTimeout(timeoutId));
}

function fetchJsonWithTimeout(url, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal })
    .then(async (res) => {
      const text = await res.text();
      let json = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch (_) {
          throw new Error('Invalid JSON');
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json;
    })
    .finally(() => clearTimeout(timeoutId));
}

function appendCacheBuster(url, { enabled } = {}) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (!enabled) return s;
  const u = new URL(s, window.location.origin);
  u.searchParams.set('t', String(Date.now()));
  return u.toString();
}

function isSameOriginUrl(url, expectedUrl) {
  if (typeof window === 'undefined') return false;
  try {
    const parsed = new URL(String(url || ''), window.location.origin);
    const expected = new URL(String(expectedUrl || ''), window.location.origin);
    return parsed.origin === expected.origin && parsed.pathname === expected.pathname && !parsed.search && !expected.search;
  } catch (_) {
    return false;
  }
}

function withTimeout(promise, timeoutMs) {
  let timeoutId = null;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new DOMException('Preloaded schedule timed out', 'AbortError')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function getPreloadedScheduleJson(url, { forceRefresh = false, timeoutMs = 12000 } = {}) {
  if (typeof window === 'undefined') return null;
  const preloadUrl = window.__MICKYWA_SCHEDULE_PRELOAD_URL__ || STATIC_SCHEDULE_JSON_URL;
  if (forceRefresh || !isSameOriginUrl(url, preloadUrl)) return null;
  const promise = window.__MICKYWA_SCHEDULE_PRELOAD__;
  if (!promise || typeof promise.then !== 'function') return null;
  return withTimeout(promise, timeoutMs).then(data => {
    if (!data) {
      const error = window.__MICKYWA_SCHEDULE_PRELOAD_ERROR__ || new Error('Preloaded schedule unavailable');
      throw error;
    }
    return data;
  });
}

function getScheduleJsonUrls({ forceRefresh = false, liveRefresh = false } = {}) {
  const urls = (forceRefresh
    ? [SAME_ORIGIN_SCHEDULE_JSON_URL, LEGACY_SCHEDULE_JSON_URL]
    : liveRefresh
      ? [SAME_ORIGIN_SCHEDULE_JSON_URL, LEGACY_SCHEDULE_JSON_URL]
    : [STATIC_SCHEDULE_JSON_URL, SAME_ORIGIN_SCHEDULE_JSON_URL, LEGACY_SCHEDULE_JSON_URL])
    .map(url => String(url || '').trim())
    .filter(Boolean);
  return [...new Set(urls)];
}

function loadScheduleJsonCandidate(candidateUrl, { forceRefresh = false, timeoutMs = 12000 } = {}) {
  const inFlightKey = `${candidateUrl}|${forceRefresh ? 'refresh' : 'normal'}`;
  const existing = scheduleJsonInFlight.get(inFlightKey);
  if (existing) return existing;

  const url = appendCacheBuster(candidateUrl, { enabled: forceRefresh });
  const promise = (getPreloadedScheduleJson(candidateUrl, { forceRefresh, timeoutMs }) || fetchJsonWithTimeout(url, { timeoutMs }))
    .finally(() => scheduleJsonInFlight.delete(inFlightKey));
  scheduleJsonInFlight.set(inFlightKey, promise);
  return promise;
}

async function fetchScheduleJson({ forceRefresh = false, liveRefresh = false } = {}) {
  const urls = getScheduleJsonUrls({ forceRefresh, liveRefresh });
  if (!urls.length) return null;

  let lastError = null;
  for (const candidateUrl of urls) {
    try {
      const data = await loadScheduleJsonCandidate(candidateUrl, { forceRefresh, timeoutMs: 12000 });
      if (!data || !Array.isArray(data.schedule) || data.schedule.length === 0) continue;
      return hydrateDates({
        ...data,
        isMock: false,
        calendarSource: data.calendarSource || 'cloud',
        calendarReason: data.calendarReason || '',
        calendarScheduleUrl: candidateUrl
      });
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  return null;
}

async function fetchWorkCalendarFromProvider(provider, { forceRefresh = false } = {}) {
  const safeProvider = provider === 'cloud' ? 'cloud' : 'cloud';
  const t = forceRefresh ? `&t=${Date.now()}` : '';
  const url = `/api/calendar?type=work&format=json&provider=${encodeURIComponent(safeProvider)}${t}`;
  const payload = await fetchJsonWithTimeout(url, { timeoutMs: 12000 });
  const fetchedAtMs = Number(payload?.fetchedAtMs);
  const elapsedMs = Number(payload?.elapsedMs);

  const events = Array.isArray(payload?.events)
    ? payload.events
        .map(e => {
          const start = Number(e?.start);
          const end = Number(e?.end);
          if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
          return {
            start,
            end,
            isAllDay: Boolean(e?.isAllDay)
          };
        })
        .filter(Boolean)
    : null;

  return {
    events,
    provider: safeProvider,
    fetchedAtMs: Number.isFinite(fetchedAtMs) ? fetchedAtMs : null,
    elapsedMs: Number.isFinite(elapsedMs) ? elapsedMs : null,
    upstream: '',
  };
}

async function fetchHolidayCnYear(year) {
  const url = `${HOLIDAY_CN_BASE_URL}/${year}.json`;
  try {
    return await fetchJsonWithTimeout(url, { timeoutMs: 12000 });
  } catch (_) {
    return { days: [] };
  }
}

async function getHolidayCnYearWithCache(year) {
  const now = Date.now();
  const cacheKey = `${HOLIDAY_CN_CACHE_PREFIX}${year}`;
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (cached && cached.timestamp && now - cached.timestamp < HOLIDAY_CN_CACHE_TTL) {
        return cached.data;
      }
    }
  } catch (_) {}

  const data = await fetchHolidayCnYear(year);
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data }));
  } catch (_) {}
  return data;
}

// Hardcoded holidays for demo/fallback (2024-2026)
const FALLBACK_HOLIDAYS = {
  // Add some fake ones for testing if needed, or rely on real date
};

// Simple seeded random function
function seededRandom(seed) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  h = ((h ^ h >>> 16) >>> 0);
  return h / 4294967296;
}

function getMockSchedule() {
  const targetDays = getDateRangeDays(60);
  const schedule = targetDays.map((day, i) => {
    const label = `${day.d}`;
    const weekday = '日一二三四五六'.charAt(day.weekdayIdx);
    const key = `${day.y}-${day.m}-${day.d}`;
    
    // Check fallback holidays
    const holidayName = FALLBACK_HOLIDAYS[key] || '';

    const slots = TIME_SLOTS.map(slot => {
      // Use date + slot key as seed for deterministic random
      const seed = `${key}-${slot.key}`;
      const rand = seededRandom(seed);
      
      return {
        key: slot.key,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        status: rand > 0.4 ? 'free' : 'busy' // Slightly more chance to be free
      };
    });
    return {
      date: day.dateObj,
      key,
      label,
      weekday,
      holidayName,
      slots
    };
  });
  return { workEvents: [], holidayEvents: [], schedule };
}

function formatFetchError(err) {
  const name = String(err?.name || '');
  const msg = String(err?.message || err || '');
  if (name === 'AbortError') return 'timeout';
  if (/timeout/i.test(msg)) return 'timeout';
  if (msg === 'Invalid JSON') return 'invalid_json';
  if (/Failed to fetch/i.test(msg)) return 'network_error';
  if (/HTTP\s+\d+/.test(msg)) return msg;
  return msg || 'unknown_error';
}

async function refreshInBackground({ forceRefresh, liveRefresh } = {}) {
  const now = Date.now();
  let scheduleJsonError = null;
  let calendarApiError = null;
  try {
    let tosData = null;
    try {
      tosData = await fetchScheduleJson({ forceRefresh, liveRefresh });
    } catch (e) {
      scheduleJsonError = e;
    }
    if (tosData) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, data: tosData }));
      } catch (_) {}
      return tosData;
    }

    const today = getShanghaiTodayComponents();
    const years = [today.y, today.y + 1];

    const holidayCnYearsPromise = Promise.all(years.map(y => getHolidayCnYearWithCache(y)));

    let workResult;
    try {
      workResult = await fetchWorkCalendarFromProvider('cloud', { forceRefresh });
    } catch (e) {
      calendarApiError = e;
      workResult = await fetchWorkCalendarFromProvider('cloud', { forceRefresh: true });
    }

    const holidayCnYears = await holidayCnYearsPromise;

    const workEvents = Array.isArray(workResult.events) ? workResult.events : parseICS(workResult.text);
    const schedule = buildScheduleData(workEvents, holidayCnYears, 2);

    const data = {
      workEvents,
      holidayCnYears,
      schedule,
      isMock: false,
      calendarSource: workResult.provider,
      calendarUpstream: workResult.upstream,
      calendarFetchedAtMs: workResult.fetchedAtMs,
      calendarFetchElapsedMs: workResult.elapsedMs,
      calendarReason: '',
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, data }));
    } catch (_) {}
    return data;
  } catch (e) {
    console.error('Fetch fail:', e);
    const parts = [];
    if (scheduleJsonError) parts.push(`schedule_json:${formatFetchError(scheduleJsonError)}`);
    if (calendarApiError) parts.push(`calendar_api:${formatFetchError(calendarApiError)}`);
    parts.push(`final:${formatFetchError(e)}`);
    const error = new Error(parts.join('；'));
    error.calendarReason = parts.join('；');
    throw error;
  }
}

function readScheduleCacheEntry() {
  try {
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (!cachedStr) return null;
    const cached = JSON.parse(cachedStr);
    if (!cached || !cached.data) return null;
    const timestamp = Number(cached.timestamp) || 0;
    return { timestamp, data: hydrateDates(cached.data) };
  } catch (e) {
    console.error('Cache read fail:', e);
    return null;
  }
}

function isRealScheduleData(data) {
  return Boolean(data && !data.isMock && Array.isArray(data.schedule));
}

function getScheduleDataTimestamp(data, fallbackTimestamp = 0) {
  const generatedAtMs = Number(data?.generatedAtMs);
  if (Number.isFinite(generatedAtMs) && generatedAtMs > 0) return generatedAtMs;
  const fetchedAtMs = Number(data?.calendarFetchedAtMs);
  if (Number.isFinite(fetchedAtMs) && fetchedAtMs > 0) return fetchedAtMs;
  return Number(fallbackTimestamp) || 0;
}

function getScheduleCacheFreshness(entry, now = Date.now()) {
  if (!entry || !isRealScheduleData(entry.data)) {
    return { ageMs: Infinity, fastFresh: false, staleFresh: false };
  }
  const timestamp = getScheduleDataTimestamp(entry.data, entry.timestamp);
  const ageMs = now - timestamp;
  return {
    ageMs,
    fastFresh: ageMs >= 0 && ageMs < SCHEDULE_MIN_REFRESH_MS,
    staleFresh: ageMs >= 0 && ageMs < SCHEDULE_STALE_FALLBACK_MS,
  };
}

export function readFreshScheduleCache() {
  const entry = readScheduleCacheEntry();
  const freshness = getScheduleCacheFreshness(entry);
  if (!freshness.fastFresh) return null;
  return { ...entry, ageMs: freshness.ageMs };
}

export async function getCalendarsWithCache({ forceMock = false, forceRefresh = false, liveRefresh = false } = {}) {
  const now = Date.now();
  const cachedEntry = readScheduleCacheEntry();
  const cachedData = cachedEntry?.data || null;
  const cachedFreshness = getScheduleCacheFreshness(cachedEntry, now);
  if (cachedEntry && cachedData && !forceRefresh && !liveRefresh && cachedFreshness.fastFresh) {
    return cachedData;
  }

  if (forceMock) {
    const mockData = getMockSchedule();
    mockData.isMock = true;
    return mockData;
  }

  try {
    const freshData = await refreshInBackground({ forceRefresh, liveRefresh });
    if (!freshData?.isMock || !cachedData) {
      return freshData;
    }
    return cachedData;
  } catch (e) {
    if (cachedData && cachedFreshness.staleFresh) {
      return {
        ...cachedData,
        calendarReason: cachedData.calendarReason || `using_recent_cache_after_refresh_error:${formatFetchError(e)}`,
      };
    }
    throw e;
  }
}

function hydrateDates(data) {
  if (!data || !data.schedule) return data;
  data.schedule.forEach(day => {
    if (typeof day.date === 'string') {
      day.date = new Date(day.date);
    }
  });
  return data;
}

// 导出 helper 供 time.js 使用 (如果有必要)
export function toShanghaiDate(date) {
    // 兼容旧接口，虽然这里主要内部逻辑已改
    // 返回一个 Date 对象，其本地时间分量 = 上海时间分量
    // 主要用于 formatRelativeDate
    const ts = date.getTime();
    const utc = ts + date.getTimezoneOffset() * 60000;
    return new Date(utc + SHANGHAI_OFFSET_MS);
}
