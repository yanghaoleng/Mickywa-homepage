import http from 'node:http';
import { runUpdateOnce } from './update.js';

function env(name, fallback = '') {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const port = Number(env('PORT', env('VEFAAS_PORT', '3000'))) || 3000;
const intervalMs = Math.max(30_000, Number(env('UPDATE_INTERVAL_MS', String(3 * 60 * 1000))) || 3 * 60 * 1000);

let last = {
  ok: false,
  running: false,
  lastStartMs: null,
  lastEndMs: null,
  lastError: '',
  result: null
};

async function doUpdate() {
  if (last.running) return;
  last.running = true;
  last.lastStartMs = Date.now();
  last.lastError = '';
  try {
    const res = await runUpdateOnce();
    last.ok = true;
    last.result = res;
  } catch (e) {
    last.ok = false;
    last.lastError = String(e?.message || e || '');
  } finally {
    last.lastEndMs = Date.now();
    last.running = false;
  }
}

async function loop() {
  await sleep(800);
  await doUpdate();
  for (;;) {
    await sleep(intervalMs);
    await doUpdate();
  }
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    return sendJson(res, 200, { ok: true, ...last });
  }

  if ((req.method === 'POST' || req.method === 'GET') && url.pathname === '/refresh') {
    doUpdate().catch(() => {});
    return sendJson(res, 202, { ok: true, message: 'refresh scheduled', ...last });
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`calendar worker listening on :${port}\n`);
});

loop().catch((e) => {
  process.stderr.write(String(e?.message || e || 'worker loop error'));
});
