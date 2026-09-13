import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStatsErrorReporter } from '../server/utils/operationalLog.ts';
import { checkProduction, productionChecks } from '../scripts/production-smoke.mjs';

test('operational error logs contain only safe fields and suppress floods per status', () => {
  let time = 0; const records = []; const report = createStatsErrorReporter((value) => records.push(JSON.parse(value)), () => time);
  report(400, 20); report(404, 20); assert.equal(records.length, 0);
  report(429, 21.8); report(429, 0); report(429, 0); report(502, 0);
  assert.equal(records.length, 2); time = 60_000; report(429, -2);
  assert.deepEqual(records[2], { event: 'pubg_stats_failure', status: 429, elapsedMs: 0, suppressedSinceLastLog: 2 });
  for (const value of records) assert.deepEqual(Object.keys(value), ['event', 'status', 'elapsedMs', 'suppressedSinceLastLog']);
});

test('production smoke only requests the fixed read-only paths, without real network', async () => {
  const paths = [];
  await checkProduction(undefined, async (url, options) => {
    paths.push(url); assert.equal(options.redirect, 'error');
    const expected = productionChecks.find(([path]) => url === 'https://www.pubgyourteam.kr' + path)[1];
    return new Response('', { status: expected, headers: { 'cache-control': 'no-store' } });
  });
  assert.equal(paths.length, 8); assert.ok(paths.every((path) => !path.includes('/internal/') && !path.includes('platform=steam&playerName=')));
  await assert.rejects(checkProduction('http://127.0.0.1', async () => assert.fail('must not request')), /canonical/);
});

test('production smoke rejects bad status or cache policy', async () => {
  await assert.rejects(checkProduction(undefined, async () => new Response('', { status: 200 })), /Production checks failed/);
});
