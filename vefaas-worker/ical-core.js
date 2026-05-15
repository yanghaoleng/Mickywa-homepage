const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function parseICalDateToTimestamp(str) {
  if (!str) return null;
  let s = String(str).trim();

  const mDate = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (mDate) {
    const [, y, mo, d] = mDate;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0) - SHANGHAI_OFFSET_MS;
  }

  const isZulu = s.endsWith('Z');
  if (isZulu) s = s.slice(0, -1);
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;

  if (isZulu) {
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se));
  }
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se)) - SHANGHAI_OFFSET_MS;
}

function splitICalLines(text) {
  const rawLines = String(text || '').split(/\r?\n/);
  const lines = [];
  for (const line of rawLines) {
    if (/^[ \t]/.test(line) && lines.length > 0) {
      lines[lines.length - 1] += line.trim();
    } else {
      lines.push(line);
    }
  }
  return lines;
}

export function parseICS(text) {
  if (!text) return [];
  const lines = splitICalLines(text);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = {};
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      if (current?.DTSTART) {
        const isDateOnly = String(current.DTSTART).trim().length === 8;
        const start = parseICalDateToTimestamp(current.DTSTART);
        let end = null;
        if (current.DTEND) {
          end = parseICalDateToTimestamp(current.DTEND);
        } else if (start !== null) {
          end = isDateOnly ? start + 24 * 60 * 60 * 1000 : start;
        }

        if (start !== null && end !== null) {
          const duration = end - start;
          const startShanghai = new Date(start + SHANGHAI_OFFSET_MS);
          const isMidnightShanghai = startShanghai.getUTCHours() === 0 && startShanghai.getUTCMinutes() === 0;
          const isAllDay = isDateOnly || (isMidnightShanghai && duration >= 24 * 60 * 60 * 1000);
          events.push({
            summary: current.SUMMARY || '',
            start,
            end,
            isAllDay
          });
        }
      }
      current = null;
      continue;
    }

    if (!current) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const keyOnly = rawKey.split(';')[0].toUpperCase();
    current[keyOnly] = value;
  }

  return events;
}

function getShanghaiTodayComponents(nowMs = Date.now()) {
  const d = new Date(nowMs + SHANGHAI_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate()
  };
}

function getDateRangeDays(days, nowMs = Date.now()) {
  const res = [];
  const start = getShanghaiTodayComponents(nowMs);
  const base = Date.UTC(start.y, start.m - 1, start.d, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const ts = base + i * 24 * 3600 * 1000;
    const d = new Date(ts);
    res.push({
      y: d.getUTCFullYear(),
      m: d.getUTCMonth() + 1,
      d: d.getUTCDate(),
      weekdayIdx: d.getUTCDay(),
      dateObj: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    });
  }
  return res;
}

export const TIME_SLOTS = [
  { key: 'daytime', label: '白天', start: '10:00', end: '18:00' },
  { key: 'evening', label: '晚上', start: '18:00', end: '22:00' }
];

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
      if (d.isOffDay) offDays.add(key);
      else workDays.add(key);
    });
  });

  return { offDays, workDays, nameByDate };
}

function isSlotBusy(day, slot, events, nowMs = Date.now()) {
  const [sh, sm] = slot.start.split(':').map(Number);
  const [eh, em] = slot.end.split(':').map(Number);
  const slotStart = Date.UTC(day.y, day.m - 1, day.d, sh, sm, 0) - SHANGHAI_OFFSET_MS;
  const slotEnd = Date.UTC(day.y, day.m - 1, day.d, eh, em, 0) - SHANGHAI_OFFSET_MS;
  if (slotEnd < nowMs) return true;
  return events.filter(e => !e.isAllDay).some(e => e.start < slotEnd && e.end > slotStart);
}

export function buildScheduleData(workEvents, holidayCnYears, months = 2, nowMs = Date.now()) {
  const days = 21;
  const targetDays = getDateRangeDays(days, nowMs);
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
      let busy = isSlotBusy(day, slot, workEvents, nowMs);
      if (isWorkday && slot.key !== 'evening') busy = true;
      return {
        key: slot.key,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        displayTime: `${slot.start}～${slot.end}`,
        status: busy ? 'busy' : 'free',
        isTight: false
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
}

