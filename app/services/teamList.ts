import { collection, onSnapshot, orderBy, query, where, type Firestore } from 'firebase/firestore';
import type { GameMode, GameType, Platform, Tier } from '../models/common.ts';
import type { Team } from '../models/team.ts';
import { readTeam } from './room.ts';

export interface TeamFilters {
  platform: Platform;
  gameType: GameType;
  mode: GameMode;
  tier: Tier;
}

export type SubscribeTeams = (
  filters: TeamFilters,
  next: (teams: Team[], fromCache: boolean) => void,
  error: (error: unknown) => void,
) => () => void;

export function teamListQuery(db: Firestore, filters: TeamFilters) {
  let result = query(collection(db, 'TEAMS'), where('platform', '==', filters.platform), orderBy('createdAt', 'desc'));
  if (filters.gameType !== 'all') result = query(result, where('isRanked', '==', filters.gameType === 'ranked'));
  if (filters.mode !== 'all') result = query(result, where('mode', '==', filters.mode));
  if (filters.tier !== 'all') result = query(result, where('tier', '==', filters.tier));
  return result;
}

export function subscribeTeams(db: Firestore): SubscribeTeams {
  return (filters, next, error) => onSnapshot(teamListQuery(db, filters), { includeMetadataChanges: true }, (snapshot) => {
    try {
      const teams = snapshot.docs.filter((entry) => !entry.data().closedAt).map((entry) => readTeam(entry.id, entry.data()));
      next(teams, snapshot.metadata.fromCache);
    } catch (cause) { error(cause); }
  }, error);
}

export function teamListError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return '팀 목록을 읽을 권한이 없습니다. 잠시 후 다시 시도해주세요.';
  if (code.includes('unavailable')) return '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
  return '팀 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
}
