import crypto from 'node:crypto';
import { TosClient } from '@volcengine/tos-sdk';
import { buildScheduleData, parseICS } from './ical-core.js';

function env(name, fallback = '') {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function parseIntSafe(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function decodeBase64IfNeeded(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const enabled = env('VOLCENGINE_SECRET_KEY_BASE64', 'false') === 'true';
  if (!enabled) return s;
  return Buffer.from(s, 'base64').toString('utf8').trim();
}

function sanitizeBucketSuffix(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
}

function buildDefaultBucketName(accessKeyId) {
  const suffix = sanitizeBucketSuffix(accessKeyId?.slice(-10) || '');
  const base = `miky-index-calendar-${suffix || 'cache'}`;
  return base.length > 63 ? base.slice(0, 63) : base;
}

function buildPublicUrl({ region, bucket, key }) {
  const host = `${bucket}.tos-${region}.volces.com`;
  const path = `/${String(key || '').replace(/^\/+/, '')}`;
  return `https://${host}${path}`;
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

async function ensureBucketCors(client, bucket) {
  const allow = env('TOS_ENABLE_CORS', 'true') === 'true';
  if (!allow) return;
  try {
    await client.putBucketCORS({
      bucket,
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag', 'x-tos-request-id'],
          MaxAgeSeconds: 3600
        }
      ]
    });
  } catch (_) {}
}

async function ensureBucketExists(client, bucket) {
  try {
    await client.headBucket(bucket);
    return;
  } catch (_) {}
  await client.createBucket({ bucket });
}

export async function runUpdateOnce() {
  const accessKeyId =
    env('VOLCENGINE_ACCESS_KEY') ||
    env('VOLC_ACCESSKEY') ||
    env('ACCESS_KEY_ID') ||
    '';
  const secretAccessKeyRaw =
    env('VOLCENGINE_SECRET_KEY') ||
    env('VOLC_SECRETKEY') ||
    env('SECRET_ACCESS_KEY') ||
    '';
  const secretAccessKey = decodeBase64IfNeeded(secretAccessKeyRaw);

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing TOS credentials in env (VOLCENGINE_ACCESS_KEY/VOLCENGINE_SECRET_KEY or VOLC_ACCESSKEY/VOLC_SECRETKEY)');
  }

  const region = env('TOS_REGION', 'cn-beijing');
  const endpoint = env('TOS_ENDPOINT', `tos-${region}.volces.com`);
  const bucket = env('TOS_BUCKET') || buildDefaultBucketName(accessKeyId);
  const key = env('TOS_OBJECT_KEY', 'schedule.json');
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

  const payload = {
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

  const client = new TosClient({
    accessKeyId,
    accessKeySecret: secretAccessKey,
    region,
    endpoint
  });

  await ensureBucketExists(client, bucket);
  await ensureBucketCors(client, bucket);

  const body = Buffer.from(JSON.stringify(payload));
  await client.putObject({
    bucket,
    key,
    body,
    acl: 'public-read',
    contentType: 'application/json; charset=utf-8',
    cacheControl: 'public, max-age=60'
  });

  const publicUrl = buildPublicUrl({ region, bucket, key });
  return {
    bucket,
    key,
    region,
    endpoint,
    publicUrl,
    generatedAtMs: nowMs,
    workEventsCount: workEvents.length,
    scheduleDays: schedule.length
  };
}
