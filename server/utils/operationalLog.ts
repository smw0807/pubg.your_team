export function createStatsErrorReporter(write: (record: string) => void = console.warn, now: () => number = Date.now) {
  const buckets = new Map<number, { last: number; suppressed: number }>();
  return (status: number, elapsedMs: number) => {
    if (![429, 502, 503, 504].includes(status)) return;
    const timestamp = now();
    const previous = buckets.get(status);
    if (previous && timestamp - previous.last < 60_000) { previous.suppressed++; return; }
    // No URL, nickname, user identity, SDK error or Authorization header.
    write(JSON.stringify({ event: 'pubg_stats_failure', status, elapsedMs: Number.isFinite(elapsedMs) ? Math.max(0, Math.round(elapsedMs)) : 0, suppressedSinceLastLog: previous?.suppressed ?? 0 }));
    buckets.set(status, { last: timestamp, suppressed: 0 });
  };
}
