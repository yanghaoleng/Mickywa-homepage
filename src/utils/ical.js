// 简易 iCal / .ics 解析与事件工具
// 核心逻辑：所有时间计算统一转换为 UTC 时间戳（毫秒）进行比较
// 定义 "Shanghai Time" 为 UTC+8

const WORK_CAL_URL = 'https://outlook.live.com/owa/calendar/00000000-0000-0000-0000-000000000000/48be9371-5a7c-4c58-8a64-4268b3012841/cid-06E665F8FD44A075/calendar.ics';
const HOLIDAY_CAL_URL = 'https://calendars.icloud.com/holidays/cn_zh.ics/';

const HOLIDAY_CN_BASE_URL = 'https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master';

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 将 .ics 时间字符串解析为 UTC 时间戳 (ms)
 * @param {string} str - e.g. "20260227T100000Z" or "20260227T100000"
 * @returns {number|null} timestamp
 */
function parseICalDateToTimestamp(str) {
  if (!str) return null;
  let s = String(str).trim();
  
  // 1. 处理 YYYYMMDD (全天事件，通常用于节假日)
  // 我们将其视为上海当天的 00:00:00 => 转为 UTC
  const mDate = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (mDate) {
    const [_, y, mo, d] = mDate;
    // 构造上海时间的 00:00:00
    // UTC Timestamp = UTC(y, m-1, d, 0, 0, 0) - 8h
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0) - SHANGHAI_OFFSET_MS;
  }

  // 2. 处理 YYYYMMDDThhmmss[Z]
  const isZulu = s.endsWith('Z');
  if (isZulu) s = s.slice(0, -1);
  
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const [_, y, mo, d, h, mi, se] = m;

  if (isZulu) {
    // 已经是 UTC
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se));
  } else {
    // 浮动时间，视为上海时间
    // UTC Timestamp = UTC(y, m-1, d, h, mi, se) - 8h
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se)) - SHANGHAI_OFFSET_MS;
  }
}

// 解析 .ics 文本为事件列表
function parseICS(text) {
  if (!text) return [];
  // 行续行处理
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (/^[ \t]/.test(line) && lines.length > 0) {
      lines[lines.length - 1] += line.trim();
    } else {
      lines.push(line);
    }
  }

  const events = [];
  let current = null;

  lines.forEach(line => {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (current) {
        if (current.DTSTART) { 
           // Determine if it is a date-only event (length 8) or date-time
           const isDateOnly = current.DTSTART.length === 8;
           const start = parseICalDateToTimestamp(current.DTSTART);
           
           let end = null;
           if (current.DTEND) {
             end = parseICalDateToTimestamp(current.DTEND);
           } else {
             // Fallback: if date-only, duration is 1 day; otherwise 0 (point)
             // We treat point events as 0 duration, which won't block slots unless we add padding.
             // But usually calendar blocking events have duration.
             if (isDateOnly) {
               end = start + 24 * 60 * 60 * 1000;
             } else {
               end = start;
             }
           }
           
           if (start !== null && end !== null) {
             const duration = end - start;
             const startShanghai = new Date(start + SHANGHAI_OFFSET_MS);
             const isMidnightShanghai = startShanghai.getUTCHours() === 0 && startShanghai.getUTCMinutes() === 0;
             const isAllDay = isDateOnly || (isMidnightShanghai && duration >= 24 * 60 * 60 * 1000);

             events.push({
               summary: current.SUMMARY || '',
               start, // timestamp
               end,   // timestamp
               isAllDay
             });
           }
        }
      }
      current = null;
    } else if (current) {
      const idx = line.indexOf(':');
      if (idx > -1) {
        const rawKey = line.slice(0, idx);
        const value = line.slice(idx + 1);
        const keyOnly = rawKey.split(';')[0].toUpperCase();
        current[keyOnly] = value;
      }
    }
  });

  return events;
}

// 获取 "上海时间" 的当前日期组件
function getShanghaiTodayComponents() {
  const now = Date.now();
  // 当前时间 + 8小时 => 对应的 UTC 时间组件即为上海时间组件
  const d = new Date(now + SHANGHAI_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate()
  };
}

// 获取未来 N 天的列表（每项包含 y, m, d, weekday）
function getDateRangeDays(days) {
  const res = [];
  const start = getShanghaiTodayComponents();
  
  // 使用 UTC 时间戳来递增天数，避免月份/年份计算错误
  // 基准：上海今天 00:00:00 的“伪”时间戳 (用于计算日期)
  // 其实直接构造 Date(UTC) 递增即可
  const base = Date.UTC(start.y, start.m - 1, start.d, 0, 0, 0);

  // 从今天开始 (i=0) 到 i < days（共 days 天）
  for (let i = 0; i < days; i++) {
    const ts = base + i * 24 * 3600 * 1000;
    const d = new Date(ts); // 这里的 d 是 UTC 时间，其 getUTC... 就是上海的日期
    res.push({
      y: d.getUTCFullYear(),
      m: d.getUTCMonth() + 1,
      d: d.getUTCDate(),
      weekdayIdx: d.getUTCDay(), // 0=Sun, 1=Mon...
      // 我们还是保留一个 Date 对象用于 UI 显示（虽然 UI 应该主要用 ymd）
      // 为了兼容旧代码，这里构造一个 Date 对象，但要注意它的本地时间显示可能不对，
      // 最好 UI 只用 label。为了兼容 `formatOrderText`，我们需要一个 Date 对象。
      // 我们构造一个 "Local Date" 使得 getFullYear/Month/Date 等于上海时间
      dateObj: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    });
  }
  return res;
}

export const TIME_SLOTS = [
  { key: 'morning', label: '上午', start: '10:00', end: '12:00' },
  { key: 'noon', label: '中午', start: '13:00', end: '15:00' },
  { key: 'afternoon', label: '下午', start: '15:00', end: '18:00' },
  { key: 'evening', label: '晚上', start: '17:00', end: '22:00' }
];
// 检查冲突
function isSlotBusy(day, slot, events) {
  const [sh, sm] = slot.start.split(':').map(Number);
  const [eh, em] = slot.end.split(':').map(Number);

  // 构造 Slot 的真实 UTC 时间戳
  // Slot Start (Shanghai) = UTC(y, m-1, d, sh, sm) - 8h
  const slotStart = Date.UTC(day.y, day.m - 1, day.d, sh, sm, 0) - SHANGHAI_OFFSET_MS;
  const slotEnd = Date.UTC(day.y, day.m - 1, day.d, eh, em, 0) - SHANGHAI_OFFSET_MS;

  // 检查是否过期 (Past check)
  // 获取当前时间 (UTC) + Shanghai Offset
  const now = Date.now();
  // 注意：slotStart 已经是 UTC 时间戳，但代表的是 Shanghai 的某个时刻
  // Date.now() 是 UTC 时间戳
  // 比较时，slotEnd (UTC) 和 now (UTC) 直接比较即可
  // 但我们之前构造 slotStart 时减去了 SHANGHAI_OFFSET_MS
  // Date.UTC(...) 返回的是该日期在 UTC 下的时间戳。
  // 我们要表达的是“上海时间的 Y-M-D H:m:s”，它对应的真实 UTC 时间戳是 Date.UTC(...) - 8h
  // 所以 slotEnd 是真实 UTC 时间戳。
  // 只要 slotEnd < now，说明该时段已结束
  if (slotEnd < now) {
    return true; // 已过期，视为 busy
  }

  return events
    .filter(e => !e.isAllDay)
    .some(e => e.start < slotEnd && e.end > slotStart);
}

// 构建数据
export function buildScheduleData(workEvents, holidayCnYears, months = 2) {
  // const days = Math.ceil(30 * months); // Old logic
  const days = 21; // Future 21 days (including today)
  const targetDays = getDateRangeDays(days);
  const statutory = buildStatutoryHolidayMaps(holidayCnYears);

  return targetDays.map(day => {
    const label = `${day.d}`;
    const weekday = '日一二三四五六'.charAt(day.weekdayIdx);
    const key = `${day.y}-${day.m}-${day.d}`;
    const isStatOffDay = statutory.offDays.has(key);
    const isWorkdayOverride = statutory.workDays.has(key);
    const isWeekend = day.weekdayIdx === 0 || day.weekdayIdx === 6;
    const isShiftWorkday = isWorkdayOverride && isWeekend;
    const holidayName = isShiftWorkday ? '补班' : (statutory.nameByDate[key] || '');

    const isWorkday = (() => {
      if (isStatOffDay) return false;
      if (isWorkdayOverride) return true;
      return day.weekdayIdx >= 1 && day.weekdayIdx <= 5;
    })();
    
    const slots = TIME_SLOTS.map(slot => {
      // 切换逻辑：使用严格模式
      let busy = isSlotBusy(day, slot, workEvents);
      
      // 添加工作日不可预约逻辑：周一到周五 9:30-18:00 不可预约，除非是节假日
      if (isWorkday) {
        const [sh, sm] = slot.start.split(':').map(Number);
        const [eh, em] = slot.end.split(':').map(Number);
        const slotStartMinutes = sh * 60 + sm;
        const slotEndMinutes = eh * 60 + em;
        const workStartMinutes = 9 * 60 + 30; // 9:30
        const workEndMinutes = 18 * 60; // 18:00
        
        // 如果时间段与工作日工作时间有重叠，则不可预约
        if (slotStartMinutes < workEndMinutes && slotEndMinutes > workStartMinutes) {
          busy = true;
        }
      }

      if (isShiftWorkday && slot.key !== 'evening') {
        busy = true;
      }

      return {
        key: slot.key,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        // 严格模式下，displayTime 就是原始时间
        displayTime: `${slot.start}～${slot.end}`, 
        status: busy ? 'busy' : 'free',
        isTight: false // 严格模式没有 tight 概念
      };
    });

    return {
      date: day.dateObj, // 传给 UI/formatOrderText 使用
      key,
      label,
      weekday,
      holidayName,
      slots
    };
  });
}

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

const CACHE_KEY = 'mickywa_schedule_cache_v1';
const CACHE_TTL = 3 * 60 * 1000;

const HOLIDAY_CN_CACHE_PREFIX = 'mickywa_holiday_cn_year_v1_';
const HOLIDAY_CN_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

async function fetchHolidayCnYear(year) {
  const url = `${HOLIDAY_CN_BASE_URL}/${year}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`holiday-cn fetch failed: ${res.status}`);
  return await res.json();
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

function buildStatutoryHolidayMaps(holidayCnYears) {
  const offDays = new Set();
  const workDays = new Set();
  const nameByDate = {};

  (holidayCnYears || []).forEach(y => {
    (y?.days || []).forEach(d => {
      if (!d?.date) return;
      const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(String(d.date));
      if (!m) return;
      const key = `${Number(m[1])}-${Number(m[2])}-${Number(m[3])}`;
      nameByDate[key] = d.name || nameByDate[key] || '';
      if (d.isOffDay) {
        offDays.add(key);
      } else {
        workDays.add(key);
      }
    });
  });

  return { offDays, workDays, nameByDate };
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

export async function getCalendarsWithCache({ forceMock = false } = {}) {
  const now = Date.now();

  if (forceMock) {
    const mockData = getMockSchedule();
    mockData.isMock = true;
    return mockData;
  }

  try {
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (cached && cached.timestamp && now - cached.timestamp < CACHE_TTL) {
        return hydrateDates(cached.data);
      }
    }
  } catch (e) {
    console.error('Cache read fail:', e);
  }

  try {
    // Pass 'work' and 'holiday' types to enable Vercel API routing
    const today = getShanghaiTodayComponents();
    const years = [today.y, today.y + 1];

    const [workText, holidayCnYears] = await Promise.all([
      fetchICS(WORK_CAL_URL, 'work'),
      Promise.all(years.map(y => getHolidayCnYearWithCache(y)))
    ]);

    const workEvents = parseICS(workText);
    const schedule = buildScheduleData(workEvents, holidayCnYears, 2);

    const data = { workEvents, holidayCnYears, schedule, isMock: false };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, data }));
    } catch (e) {
      console.error('Cache write fail:', e);
    }
    return data;
  } catch (e) {
    console.error('Fetch fail:', e);
    const mockData = getMockSchedule();
    // Mark as mock so UI can show a warning
    mockData.isMock = true;
    return mockData;
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
