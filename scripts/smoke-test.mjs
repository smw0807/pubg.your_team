import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';

const probe = createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));

// Intentionally unset the runtime key. Smoke tests must never call the real PUBG API.
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NUXT_PUBG_API_KEY: '', ROOM_CLEANUP_ENABLED: 'false' },
  stdio: 'ignore',
});
const exited = new Promise((resolve) => server.once('exit', resolve));
let startupError;
server.once('error', (error) => { startupError = error; });
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError;
    if (server.exitCode !== null) throw new Error(`Server exited with code ${server.exitCode}`);
    try {
      await fetch(`${base}/api/stats/rank`, { signal: AbortSignal.timeout(1000) });
      ready = true;
      break;
    } catch { await setTimeout(100); }
  }
  assert.ok(ready, 'Production server did not start');
  for (const [path, expected] of [
    ['/', 200], ['/teams/steam', 200], ['/teams/kakao', 200], ['/test', 404],
    ['/api/internal/rooms/cleanup', 503],
    ['/api/stats/rank', 400],
    ['/api/stats/rank?platform=invalid&playerName=Player', 400],
    ['/api/stats/rank?platform=steam&platform=kakao&playerName=Player', 400],
    ['/api/stats/rank?platform=steam&playerName=Player&playerName=Other', 400],
    ['/api/stats/rank?platform=steam&playerName=..%2Fprivate', 400],
    ['/api/stats/rank?platform=steam&playerName=Player', 503],
  ]) {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, expected, path);
    console.log(`${expected} ${path}`);
  }
} finally {
  server.kill('SIGTERM');
  await Promise.race([exited, setTimeout(3000)]);
  if (server.exitCode === null && server.signalCode === null) {
    server.kill('SIGKILL');
    await exited;
  }
}
