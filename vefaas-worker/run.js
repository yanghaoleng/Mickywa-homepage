import { runUpdateOnce } from './update.js';

async function main() {
  const res = await runUpdateOnce();
  process.stdout.write(JSON.stringify({ ok: true, ...res }) + '\n');
}

main().catch((e) => {
  process.stderr.write(JSON.stringify({ ok: false, error: String(e?.message || e || '') }) + '\n');
  process.exitCode = 1;
});

