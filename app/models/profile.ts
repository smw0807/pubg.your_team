export interface Profile {
  id: string;
  name: string;
  email: string;
  steamNickname: string;
  kakaoNickname: string;
}

export interface TierInfo {
  tier: string;
  subTier: string;
}

export interface ModeStat {
  currentTier: TierInfo;
  currentRankPoint: number;
  bestTier: TierInfo;
  bestRankPoint: number;
  roundsPlayed: number;
  avgRank: number;
  avgSurvivalTime: number;
  top10Ratio: number;
  winRatio: number;
  assists: number;
  wins: number;
  kda: number;
  kdr: number;
  kills: number;
  deaths: number;
  roundMostKills: number;
  longestKill: number;
  headshotKills: number;
  headshotKillRatio: number;
  damageDealt: number;
  dBNOs: number;
  reviveRatio: number;
  revives: number;
  heals: number;
  boosts: number;
  weaponsAcquired: number;
  teamKills: number;
  playTime: number;
  killStreak: number;
}

export interface Stat {
  squad?: ModeStat;
  duo?: ModeStat;
  banType?: string;
}
