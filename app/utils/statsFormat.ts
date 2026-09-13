export function formatStat(value: number | null, digits = 0): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function averageDamage(damage: number | null, rounds: number): number | null {
  return damage !== null && Number.isFinite(damage) && damage >= 0 && Number.isFinite(rounds) && rounds > 0 ? damage / rounds : null;
}

export function recentMatchUrl(base: string, platform: string, nickname: string): string | null {
  if (!base || !['steam', 'kakao'].includes(platform) || !/^[A-Za-z0-9_-]{3,64}$/.test(nickname)) return null;
  try {
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.pathname = `${url.pathname.replace(/\/$/, '')}/player/${encodeURIComponent(platform)}/${encodeURIComponent(nickname)}`;
    url.search = ''; url.hash = '';
    return url.toString();
  } catch { return null; }
}
