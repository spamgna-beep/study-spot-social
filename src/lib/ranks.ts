export interface StudyRank {
  name: string;
  emoji: string;
  color: string;
  minHours: number;
}

const RANKS: StudyRank[] = [
  { name: 'Diamond', emoji: '💎', color: 'hsl(200, 80%, 70%)', minHours: 40 },
  { name: 'Gold', emoji: '🥇', color: 'hsl(48, 94%, 56%)', minHours: 30 },
  { name: 'Silver', emoji: '🥈', color: 'hsl(0, 0%, 75%)', minHours: 20 },
  { name: 'Bronze', emoji: '🥉', color: 'hsl(30, 60%, 50%)', minHours: 10 },
];

export function getStudyRank(totalHours: number): StudyRank | null {
  for (const rank of RANKS) {
    if (totalHours >= rank.minHours) return rank;
  }
  return null;
}

export function formatStudyHours(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
