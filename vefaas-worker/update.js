import crypto from 'node:crypto';
import { buildScheduleData, parseICS } from './ical-core.js';

function env(name, fallback = '') {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function parseIntSafe(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function fetchWithTimeout(url, { timeoutMs = 8000, headers = {} } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal, headers }).finally(() => clearTimeout(timeoutId));
}

async function fetchText(url, timeoutMs) {
  const res = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8'
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text;
}

async function fetchJson(url, timeoutMs) {
  const res = await fetchWithTimeout(url, { timeoutMs, headers: { Accept: 'application/json' } });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json;
}

export async function buildSchedulePayload() {
  const workCalUrl = env('WORK_CAL_URL');
  const holidayBase = env('HOLIDAY_CN_BASE_URL', 'https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master');

  if (!workCalUrl) {
    throw new Error('Missing WORK_CAL_URL env');
  }

  const timeoutMs = parseIntSafe(env('UPSTREAM_TIMEOUT_MS'), 12000);
  const nowMs = Date.now();

  const icsText = await fetchText(workCalUrl, timeoutMs);
  const workEvents = parseICS(icsText);

  const y = new Date(nowMs + 8 * 60 * 60 * 1000).getUTCFullYear();
  const years = [y, y + 1];
  const holidayCnYears = await Promise.all(
    years.map((yy) => fetchJson(`${holidayBase}/${yy}.json`, timeoutMs).catch(() => ({ days: [] })))
  );

  const schedule = buildScheduleData(workEvents, holidayCnYears, 2, nowMs);

  return {
    generatedAtMs: nowMs,
    generatedAtISO: new Date(nowMs).toISOString(),
    source: {
      workCalUrl: crypto.createHash('sha256').update(workCalUrl).digest('hex').slice(0, 12),
      holidayBase
    },
    workEvents,
    holidayCnYears,
    schedule,
    isMock: false,
    calendarSource: 'cloud',
    calendarReason: ''
  };
}
