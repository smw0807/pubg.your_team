import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const directory = new URL('../.output/public/_nuxt/', import.meta.url);
const files = (await readdir(directory)).filter((name) => name.endsWith('.js'));
assert.ok(files.length, 'Build the app before checking client bundles');
const bundles = await Promise.all(files.map(async (name) => {
  const content = await readFile(new URL(name, directory));
  return { file: join('_nuxt', name), bytes: content.length, gzip: gzipSync(content).length };
}));
bundles.sort((a, b) => b.bytes - a.bytes);
console.table(bundles.slice(0, 5));
console.log(`Total JS: ${bundles.reduce((total, item) => total + item.bytes, 0)} bytes across ${bundles.length} chunks (not initial page transfer)`);
assert.ok(bundles[0].bytes <= 500_000, 'A client JS chunk exceeds the 500 kB budget; inspect imports instead of raising the limit');
