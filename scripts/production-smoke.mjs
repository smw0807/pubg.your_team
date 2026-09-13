import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export const productionChecks = [
  ['/', 200], ['/teams/steam', 200], ['/teams/kakao', 200], ['/teams/invalid', 404],
  ['/test', 404], ['/_stats-check', 404], ['/api/stats/rank', 400],
  ['/api/stats/rank?platform=invalid&playerName=Player', 400],
];

export async function checkProduction(base = 'https://www.pubgyourteam.kr', request = fetch) {
  // Read-only public pages and invalid input only: no Auth, Firestore writes,
  // cleanup endpoint or successful PUBG requests/keys are used.
  assert.equal(base, 'https://www.pubgyourteam.kr', 'Only the canonical production origin is permitted');
  const failures = [];
  for (const [path, expected] of productionChecks) {
    try {
      const response = await request(`${base}${path}`, { redirect: 'error', signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, expected, `Expected ${expected}, received ${response.status}`);
      if (path.startsWith('/api/stats')) assert.equal(response.headers.get('cache-control'), 'no-store');
      await response.arrayBuffer();
      console.log(`PASS ${expected} ${path}`);
    } catch {
      // Do not include response bodies, SDK errors, or credentials in CI output.
      failures.push(path);
      console.error(`FAIL ${path}`);
    }
  }
  assert.equal(failures.length, 0, `Production checks failed: ${failures.join(', ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await checkProduction();
