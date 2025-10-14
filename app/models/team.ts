export interface Team {
  id?: string;
  title: string;
  description: string;
  type: string;
  tier: string | null;
  damage: number | null;
  platform: string;
  isRanked: boolean;
  members: string[];
}
