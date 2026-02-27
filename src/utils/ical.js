// 简易 iCal / .ics 解析与事件工具
// 核心逻辑：所有时间计算统一转换为 UTC 时间戳（毫秒）进行比较
// 定义 "Shanghai Time" 为 UTC+8

const WORK_CAL_URL = 'https://p228-caldav.icloud.com.cn/published/2/MTY4NjUyNzUzNjAxNjg2NeST_Tn2EHy6yE2hkvWkYhtgsVRJM_iMUhuHPUSHHgSr';
const HOLIDAY_CAL_URL = 'https://calendars.icloud.com/holidays/cn_zh.ics/';

// Use a proxy if needed (e.g. Supabase Edge Function)
const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';

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
             events.push({
               summary: current.SUMMARY || '',
               start, // timestamp
               end    // timestamp
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
  { key: 'evening', label: '晚上', start: '18:00', end: '22:00' }
];

// 检查冲突
function isSlotBusy(day, slot, events) {
  const [sh, sm] = slot.start.split(':').map(Number);
  const [eh, em] = slot.end.split(':').map(Number);

  // 构造 Slot 的真实 UTC 时间戳
  // Slot Start (Shanghai) = UTC(y, m-1, d, sh, sm) - 8h
  const slotStart = Date.UTC(day.y, day.m - 1, day.d, sh, sm, 0) - SHANGHAI_OFFSET_MS;
  const slotEnd = Date.UTC(day.y, day.m - 1, day.d, eh, em, 0) - SHANGHAI_OFFSET_MS;

  return events.some(e => {
    // 冲突逻辑：(EventStart < SlotEnd) && (EventEnd > SlotStart)
    return e.start < slotEnd && e.end > slotStart;
  });
}

// 构建数据
export function buildScheduleData(workEvents, holidayEvents, months = 2) {
  const days = Math.ceil(30 * months);
  const targetDays = getDateRangeDays(days);
  const holidayMap = buildHolidayMap(holidayEvents);

  return targetDays.map(day => {
    const label = `${day.m}月${day.d}日`;
    const weekday = '日一二三四五六'.charAt(day.weekdayIdx);
    
    const slots = TIME_SLOTS.map(slot => {
      const busy = isSlotBusy(day, slot, workEvents);
      return {
        key: slot.key,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        status: busy ? 'busy' : 'free'
      };
    });

    const key = `${day.y}-${day.m}-${day.d}`;

    return {
      date: day.dateObj, // 传给 UI/formatOrderText 使用
      key,
      label,
      weekday,
      holidayName: holidayMap[key] || '',
      slots
    };
  });
}

function buildHolidayMap(holidayEvents) {
  const map = {};
  holidayEvents.forEach(e => {
    if (!e.summary) return;
    // 节假日通常是全天事件，start 是 00:00 Shanghai (in UTC)
    // 我们将其转回上海的 Y-M-D
    const d = new Date(e.start + SHANGHAI_OFFSET_MS);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const key = `${y}-${m}-${day}`;
    if (!map[key]) {
      map[key] = e.summary;
    }
  });
  return map;
}

async function fetchICS(url) {
  let targetUrl = url;
  
  // 本地开发代理逻辑：如果没有配置 VITE_PROXY_URL，则尝试走本地 Vite 代理
  if (import.meta.env.DEV && !PROXY_URL) {
    if (url.includes('p228-caldav.icloud.com.cn')) {
      targetUrl = '/api/work-calendar';
    } else if (url.includes('calendars.icloud.com')) {
      targetUrl = '/api/holiday-calendar';
    }
  } else if (PROXY_URL) {
    targetUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
  }

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.text();
  } catch (err) {
    throw err;
  }
}

const CACHE_KEY = 'luo_schedule_cache_v5'; // Bump version
const CACHE_TTL = 3 * 60 * 1000;

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
    const label = `${day.m}月${day.d}日`;
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

export async function getCalendarsWithCache() {
  const now = Date.now();
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
    const [workText, holidayText] = await Promise.all([
      fetchICS(WORK_CAL_URL),
      fetchICS(HOLIDAY_CAL_URL)
    ]);

    const workEvents = parseICS(workText);
    const holidayEvents = parseICS(holidayText);
    const schedule = buildScheduleData(workEvents, holidayEvents, 2);

    const data = { workEvents, holidayEvents, schedule };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, data }));
    } catch (e) {
      console.error('Cache write fail:', e);
    }
    return data;
  } catch (e) {
    console.error('Fetch fail:', e);
    return getMockSchedule();
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
