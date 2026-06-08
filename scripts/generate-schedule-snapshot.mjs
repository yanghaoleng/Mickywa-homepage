import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSchedulePayload } from '../api/schedule.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outputPath = path.join(rootDir, 'public', 'schedule-snapshot.json')
const REFRESH_HINT_MS = 30 * 60 * 1000

function parseEnvLine(line) {
  const match = /^([\w.-]+)\s*=\s*(.*)$/.exec(line)
  if (!match) return null
  let value = match[2].trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return [match[1], value]
}

async function loadEnvFile(filePath) {
  try {
    await access(filePath)
  } catch (_) {
    return
  }

  const text = await readFile(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const pair = parseEnvLine(line)
    if (!pair) continue
    const [key, value] = pair
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

async function loadLocalEnv() {
  const files = [
    '.env',
    '.env.local',
    '.env.production.local',
    path.join('.vercel', '.env.production.local'),
  ]

  for (const file of files) {
    await loadEnvFile(path.join(rootDir, file))
  }
}

function toPublicSnapshot(payload) {
  return {
    generatedAtMs: payload.generatedAtMs,
    generatedAtISO: payload.generatedAtISO,
    snapshotRefreshHintMs: REFRESH_HINT_MS,
    schedule: payload.schedule,
    isMock: false,
    calendarSource: 'static',
    calendarProvider: 'build-snapshot',
    calendarFetchedAtMs: payload.calendarFetchedAtMs,
    calendarFetchElapsedMs: payload.calendarFetchElapsedMs,
    calendarReason: '',
  }
}

async function writeSnapshot(data) {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`)
}

async function main() {
  await loadLocalEnv()

  const startedAt = Date.now()
  const timeoutMs = Number(process.env.SCHEDULE_UPSTREAM_TIMEOUT_MS) || 9000

  try {
    const payload = await buildSchedulePayload({ startedAt, timeoutMs })
    const snapshot = toPublicSnapshot(payload)
    await writeSnapshot(snapshot)
    console.log(`schedule snapshot generated: ${snapshot.schedule.length} days`)
  } catch (error) {
    const message = String(error?.message || error || 'unknown error')
    const fallback = {
      generatedAtMs: startedAt,
      generatedAtISO: new Date(startedAt).toISOString(),
      snapshotRefreshHintMs: REFRESH_HINT_MS,
      schedule: [],
      isMock: false,
      calendarSource: 'static',
      calendarProvider: 'build-snapshot',
      calendarReason: `snapshot_generation_failed:${message}`,
    }
    await writeSnapshot(fallback)
    console.warn(`schedule snapshot generation skipped: ${message}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
