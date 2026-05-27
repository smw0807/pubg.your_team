import { PubgClient } from 'pubg-kit';
import type {
  PlatformShard,
  RankedGameModeStats,
  GameModeStats,
} from 'pubg-kit';
import type { Stat, ModeStat } from '~/models/profile';

export default defineEventHandler(async (event) => {
  const { platform, playerName } = getQuery(event) as {
    platform: string;
    playerName: string;
  };

  if (!platform || !playerName) {
    throw createError({
      statusCode: 400,
      message: 'platform과 playerName은 필수입니다.',
    });
  }

  const apiKey = useRuntimeConfig().pubgApiKey as string;
  const client = new PubgClient({ apiKey });
  const shard = client.shard(platform as PlatformShard);

  const players = await shard.players.getByNames([playerName]);
  const player = players[0];
  if (!player) {
    throw createError({
      statusCode: 404,
      message: '플레이어를 찾을 수 없습니다.',
    });
  }

  const seasons = await shard.seasons.getAll();
  const currentSeason = seasons.find((s) => s.attributes.isCurrentSeason);
  if (!currentSeason) {
    throw createError({
      statusCode: 404,
      message: '현재 시즌 정보를 찾을 수 없습니다.',
    });
  }

  const [rankedRes, seasonRes] = await Promise.all([
    shard.stats.getPlayerRankedStats(player.id, currentSeason.id),
    shard.stats.getPlayerStats(player.id, currentSeason.id),
  ]);

  const rankedStats = rankedRes.data.attributes.rankedGameModeStats;
  const seasonStats = seasonRes.data.attributes.gameModeStats;

  const buildModeStat = (
    ranked: RankedGameModeStats | undefined,
    season: GameModeStats | undefined,
  ): ModeStat => ({
    currentTier: ranked?.currentTier ?? { tier: 'Unranked', subTier: '-' },
    currentRankPoint: ranked?.currentRankPoint ?? 0,
    bestTier: ranked?.bestTier ?? { tier: 'Unranked', subTier: '-' },
    bestRankPoint: ranked?.bestRankPoint ?? 0,
    roundsPlayed: ranked?.roundsPlayed ?? 0,
    avgKill: ranked?.kdr ?? 0,
    avgRank: ranked?.avgRank ?? 0,
    avgSurvivalTime: ranked?.avgSurvivalTime ?? 0,
    top10Ratio: ranked?.top10Ratio ?? 0,
    winRatio: ranked?.winRatio ?? 0,
    wins: ranked?.wins ?? 0,
    kda: ranked?.kda ?? 0,
    kdr: ranked?.kdr ?? 0,
    kills: ranked?.kills ?? 0,
    deaths: ranked?.deaths ?? 0,
    assists: season?.assists ?? 0,
    damageDealt: season?.damageDealt ?? 0,
    dBNOs: season?.dBNOs ?? 0,
    teamKills: season?.teamKills ?? 0,
    roundMostKills: season?.roundMostKills ?? 0,
    longestKill: season?.longestKill ?? 0,
    headshotKills: season?.headshotKills ?? 0,
    headshotKillRatio: season?.kills ? season.headshotKills / season.kills : 0,
    revives: season?.revives ?? 0,
    reviveRatio: season?.roundsPlayed
      ? season.revives / season.roundsPlayed
      : 0,
    heals: season?.heals ?? 0,
    boosts: season?.boosts ?? 0,
    weaponsAcquired: season?.weaponsAcquired ?? 0,
    playTime: season?.timeSurvived ?? 0,
    killStreak: season?.maxKillStreaks ?? 0,
  });

  const result: Stat = {
    banType: player.attributes.banType,
  };

  const squadRanked = rankedStats['squad'] ?? rankedStats['squad-fpp'];
  const squadSeason = seasonStats['squad'] ?? seasonStats['squad-fpp'];
  if (squadRanked) result.squad = buildModeStat(squadRanked, squadSeason);

  const duoRanked = rankedStats['duo'] ?? rankedStats['duo-fpp'];
  const duoSeason = seasonStats['duo'] ?? seasonStats['duo-fpp'];
  if (duoRanked) result.duo = buildModeStat(duoRanked, duoSeason);

  return result;
});
