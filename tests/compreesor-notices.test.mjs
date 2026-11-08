import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdtemp, rm, writeFile, readFile, appendFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyCompreesorNotices } from '../scripts/check-compreesor-notices.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
async function withCopy(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'mirror-notices-test-'))
  try {
    await cp(resolve(root, 'public/compreesor'), join(dir, 'public/compreesor'), { recursive: true })
    await fn(dir)
  } finally { await rm(dir, { recursive: true, force: true }) }
}
test('reviewed mirror and original notices pass', async () => {
  const result = await verifyCompreesorNotices(root)
  assert.equal(result.wasm, 18)
  assert.equal(result.runtimeFiles, 26)
})
test('notice tampering is rejected', () => withCopy(async (dir) => {
  await appendFile(join(dir, 'public/compreesor/licenses/jsquash-avif/LICENSE'), '\nchanged\n')
  await assert.rejects(verifyCompreesorNotices(dir), /Size changed/)
}))
test('unreviewed new WASM is rejected', () => withCopy(async (dir) => {
  await writeFile(join(dir, 'public/compreesor/assets/new.wasm'), 'unreviewed')
  await assert.rejects(verifyCompreesorNotices(dir), /WASM inventory changed/)
}))
test('same-size runtime replacement is rejected', () => withCopy(async (dir) => {
  const path = join(dir, 'public/compreesor/assets/index-TFok_gyz.js')
  const bytes = await readFile(path); bytes[0] ^= 1; await writeFile(path, bytes)
  await assert.rejects(verifyCompreesorNotices(dir), /Review component version/)
}))

