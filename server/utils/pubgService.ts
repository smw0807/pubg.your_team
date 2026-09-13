import { PubgClient } from 'pubg-kit';
import { buildRankedStats, createRequestBudget, createStatsCache, StatsError } from './pubgStats.ts';

export function createPubgService(apiKey: string, client = new PubgClient({ apiKey, timeout: 5000, cache: false, rateLimit: false })) {
  const reserve = createRequestBudget();
  client.getHttp().interceptors.request.use((config) => { reserve(); return config; });
  const seasons = new Map<string, { expires: number; id: string }>();
  const pendingSeasons = new Map<string, Promise<string>>();
  const currentSeason = async (platform: 'steam' | 'kakao') => {
    const cached = seasons.get(platform);
    if (cached && cached.expires > Date.now()) return cached.id;
    const existing = pendingSeasons.get(platform);
    if (existing) return existing;
    const request = client.shard(platform).seasons.getAll().then((items) => {
      const current = items.find((season) => season.attributes.isCurrentSeason);
      if (!current) throw new StatsError(503, '현재 시즌 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
      seasons.set(platform, { id: current.id, expires: Date.now() + 3_600_000 });
      return current.id;
    }).finally(() => { pendingSeasons.delete(platform); });
    pendingSeasons.set(platform, request);
    return request;
  };
  return createStatsCache(async (platform, name) => {
    const shard = client.shard(platform);
    const player = (await shard.players.getByNames([name]))[0];
    if (!player) throw new StatsError(404, '플레이어를 찾을 수 없습니다. 닉네임을 확인해주세요.');
    const seasonId = await currentSeason(platform);
    const ranked = await shard.stats.getPlayerRankedStats(player.id, seasonId);
    return buildRankedStats(ranked, seasonId, player.attributes.banType);
  });
}
