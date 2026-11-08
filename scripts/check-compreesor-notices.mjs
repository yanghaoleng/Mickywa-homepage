import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export async function verifyCompreesorNotices(root = projectRoot) {
  const base = resolve(root, 'public/compreesor')
  const inventory = JSON.parse(await readFile(join(base, 'licenses/INVENTORY.json'), 'utf8'))
  const files = [...inventory.runtime_files, ...inventory.notice_files]
  assert.equal(new Set(files.map((f) => f.path)).size, files.length, 'Duplicate inventory path')
  for (const file of files) {
    const path = resolve(base, file.path)
    const local = relative(base, path)
    assert(local && !local.startsWith('..') && !isAbsolute(local), 'Inventory path outside mirror')
    const bytes = await readFile(path)
    assert.equal(bytes.length, file.bytes, 'Size changed: ' + file.path)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256,
      'Review component version and notices before replacing ' + file.path)
  }
  const actualWasm = []
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile() && entry.name.endsWith('.wasm')) actualWasm.push(relative(base, path))
    }
  }
  await walk(base)
  const expectedWasm = inventory.packages.flatMap((p) => p.matches.map((m) =>
    m.mirror_path.replace(/^public\/compreesor\//, '')))
  assert.deepEqual(actualWasm.sort(), expectedWasm.sort(), 'WASM inventory changed')
  const index = await readFile(join(base, 'index.html'), 'utf8')
  assert(index.includes('rel="license" href="./THIRD_PARTY_NOTICES.html"'), 'Missing notice link')
  return { runtimeFiles: inventory.runtime_files.length, notices: inventory.notice_files.length, wasm: actualWasm.length }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await verifyCompreesorNotices()
  console.log('Compreesor mirror notices verified:', JSON.stringify(result))
}

