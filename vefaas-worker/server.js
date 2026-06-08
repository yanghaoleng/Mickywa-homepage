import http from 'node:http';
import { buildSchedulePayload } from './update.js';

function env(name, fallback = '') {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

const port = Number(env('PORT', env('VEFAAS_PORT', '3000'))) || 3000;
const ttlSeconds = Math.max(5, Number(env('CACHE_TTL_SECONDS', '900')) || 900);
const staleSeconds = Math.max(0, Number(env('CACHE_STALE_SECONDS', '3600')) || 3600);

let cache = {
  data: null,
  fetchedAtMs: 0,
  lastError: ''
};
let refreshPromise = null;

async function refresh() {
  const data = await buildSchedulePayload();
  cache.data = data;
  cache.fetchedAtMs = Date.now();
  cache.lastError = '';
  return data;
}

function startRefresh() {
  if (!refreshPromise) {
    refreshPromise = refresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`);
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {});
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const force = url.searchParams.get('force') === '1';
  const wantSchedule =
    url.pathname === '/' ||
    url.pathname === '/schedule' ||
    url.pathname === '/schedule.json';

  if (!wantSchedule) {
    if (url.pathname === '/health') {
      return sendJson(res, 200, {
        ok: true,
        fetchedAtMs: cache.fetchedAtMs,
        hasCache: Boolean(cache.data),
        lastError: cache.lastError
      });
    }
    return sendJson(res, 404, { ok: false, error: 'Not found' });
  }

  const now = Date.now();
  const expired = !cache.data || now - cache.fetchedAtMs > ttlSeconds * 1000;
  if (force || expired) {
    if (!force && cache.data) {
      startRefresh().catch((e) => {
        cache.lastError = String(e?.message || e || '');
      });
      return sendJson(res, 200, {
        ...cache.data,
        calendarReason: cache.data.calendarReason || 'served_stale_while_refreshing'
      }, {
        'X-Calendar-Cache': 'stale-refresh'
      });
    }

    try {
      const data = await startRefresh();
      return sendJson(res, 200, data, {
        'X-Calendar-Cache': force ? 'refresh' : 'miss'
      });
    } catch (e) {
      cache.lastError = String(e?.message || e || '');
      if (cache.data) {
        return sendJson(res, 200, {
          ...cache.data,
          calendarReason: cache.data.calendarReason || 'served_stale_after_error'
        }, {
          'X-Calendar-Cache': 'stale-error'
        });
      }
      return sendJson(res, 502, { ok: false, error: cache.lastError }, {
        'X-Calendar-Cache': 'error'
      });
    }
  }

  return sendJson(res, 200, cache.data, {
    'X-Calendar-Cache': 'memory'
  });
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`calendar worker listening on :${port}\n`);
});
