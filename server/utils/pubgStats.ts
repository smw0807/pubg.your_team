import type { ModeStat, Stat, TierInfo } from '../../app/models/profile.ts';

export class StatsError extends Error {
  readonly statusCode: number;
  readonly retryAfter?: number;
  constructor(statusCode: number, message: string, retryAfter?: number) {
    super(message);
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export function statsError(error: unknown): StatsError {
  if (error instanceof StatsError) return error;
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  if (value.status === 429) return new StatsError(429, '전적 조회 요청이 많습니다. 잠시 후 다시 시도해주세요.', 60);
  if (value.status === 404) return new StatsError(404, '플레이어 또는 해당 시즌 전적을 찾을 수 없습니다.');
  if (value.status === 401 || value.status === 403) return new StatsError(503, '전적 조회 서비스 설정을 확인 중입니다.');
  if (value.code === 'ECONNABORTED' || value.code === 'ETIMEDOUT') return new StatsError(504, '전적 서버 응답이 늦어지고 있습니다. 다시 시도해주세요.');
  return new StatsError(502, '전적 서버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
}

export function parseStatsQuery(query: Record<string, unknown>): { platform: 'steam' | 'kakao'; playerName: string } {
  const { platform, playerName } = query;
  if ((platform !== 'steam' && platform !== 'kakao') || typeof playerName !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(playerName)) {
    throw new StatsError(400, '지원하는 플랫폼과 올바른 게임 닉네임을 입력해주세요.');
  }
  return { platform, playerName };
}

const numeric = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const tierInfo = (value: unknown): TierInfo => {
  const tier = object(value);
  return { tier: typeof tier?.tier === 'string' ? tier.tier : '확인 불가', subTier: typeof tier?.subTier === 'string' ? tier.subTier : '-' };
};

export function rankedMode(value: unknown): ModeStat | undefined {
  const data = object(value);
  if (!data) throw new StatsError(502, '전적 데이터 형식이 올바르지 않습니다.');
  const roundsPlayed = numeric(data.roundsPlayed);
  if (roundsPlayed === null) throw new StatsError(502, '전적 데이터 형식이 올바르지 않습니다.');
  if (roundsPlayed === 0) return;
  // Missing ranked values mean unavailable, never borrow general-season fields.
  return {
    currentTier: tierInfo(data.currentTier), bestTier: tierInfo(data.bestTier), roundsPlayed,
    currentRankPoint: numeric(data.currentRankPoint), bestRankPoint: numeric(data.bestRankPoint),
    avgRank: numeric(data.avgRank), winRatio: numeric(data.winRatio), wins: numeric(data.wins),
    kdr: numeric(data.kdr), kills: numeric(data.kills), deaths: numeric(data.deaths),
    assists: numeric(data.assists), damageDealt: numeric(data.damageDealt), dBNOs: numeric(data.dBNOs), teamKills: numeric(data.teamKills),
  };
}

export function buildRankedStats(response: unknown, seasonId: string, banType: string | undefined, now = Date.now()): Stat {
  const modes = object(object(object(object(response)?.data)?.attributes)?.rankedGameModeStats);
  if (!modes) throw new StatsError(502, '전적 데이터 형식이 올바르지 않습니다.');
  const result: Stat = { seasonId, fetchedAt: new Date(now).toISOString(), banType };
  for (const [source, target] of [['squad', 'squad'], ['duo', 'duo'], ['squad-fpp', 'squadFpp'], ['duo-fpp', 'duoFpp']] as const) {
    if (modes[source] !== undefined) result[target] = rankedMode(modes[source]);
  }
  return result;
}

// Instance-local upstream budget; no unbounded SDK waiting queue.
export function createRequestBudget(now = Date.now, maxRequests = 10) {
  let requests: number[] = [];
  return () => {
    const time = now();
    requests = requests.filter((entry) => time - entry < 60_000);
    if (requests.length >= maxRequests) throw new StatsError(429, '전적 조회 요청이 많습니다. 잠시 후 다시 시도해주세요.', Math.max(1, Math.ceil((requests[0]! + 60_000 - time) / 1000)));
    requests.push(time);
  };
}

export function createStatsCache(load: (platform: 'steam' | 'kakao', name: string) => Promise<Stat>, now = Date.now, maxEntries = 200) {
  const cache = new Map<string, { expires: number; value?: Stat; error?: StatsError }>();
  const pending = new Map<string, Promise<Stat>>();
  let cooldownUntil = 0;
  return async (platform: 'steam' | 'kakao', name: string): Promise<Stat> => {
    const key = `${platform}:${name}`;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) {
      if (cached.error) throw cached.error;
      return cached.value!;
    }
    cache.delete(key);
    const existing = pending.get(key);
    if (existing) return existing;
    if (now() < cooldownUntil) throw new StatsError(429, '전적 조회 요청이 많습니다. 잠시 후 다시 시도해주세요.', Math.ceil((cooldownUntil - now()) / 1000));
    if (pending.size >= 10) throw new StatsError(429, '전적 조회 요청이 많습니다. 잠시 후 다시 시도해주세요.', 5);
    const save = (entry: { expires: number; value?: Stat; error?: StatsError }) => {
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value!);
      cache.set(key, entry);
    };
    const request = Promise.resolve().then(() => load(platform, name)).then((value) => {
      save({ expires: now() + 300_000, value });
      return value;
    }).catch((cause: unknown) => {
      const error = statsError(cause);
      if (error.statusCode === 404) save({ expires: now() + 30_000, error });
      if (error.statusCode === 429) cooldownUntil = Math.max(cooldownUntil, now() + (error.retryAfter ?? 60) * 1000);
      throw error;
    }).finally(() => { pending.delete(key); });
    pending.set(key, request);
    return request;
  };
}
