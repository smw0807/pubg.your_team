import type { Timestamp } from 'firebase/firestore';

export interface Team {
  id?: string;
  title: string;
  description: string;
  mode: string;
  tier: string | null;
  damage: number | null;
  platform: string;
  isRanked: boolean;
  members: string[];
  createdAt: Date;
  closedAt?: Timestamp;
  closedBy?: string;
}

export type CreateTeam = Omit<Team, 'id' | 'createdAt' | 'closedAt' | 'closedBy'>;
