export interface Team {
  id: number;
  title: string;
  description: string;
  type: string;
  tier: string | null;
  damage: number | null;
  platform: string;
}
