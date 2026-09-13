export interface Profile {
  id: string;
  steamNickname: string;
  kakaoNickname: string;
}

export interface TierInfo { tier: string; subTier: string }

export interface ModeStat {
  currentTier: TierInfo;
  currentRankPoint: number | null;
  bestTier: TierInfo;
  bestRankPoint: number | null;
  roundsPlayed: number;
  avgRank: number | null;
  winRatio: number | null;
  wins: number | null;
  kdr: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  damageDealt: number | null;
  dBNOs: number | null;
  teamKills: number | null;
}

export interface Stat {
  squad?: ModeStat;
  duo?: ModeStat;
  squadFpp?: ModeStat;
  duoFpp?: ModeStat;
  banType?: string;
  seasonId: string;
  fetchedAt: string;
}
