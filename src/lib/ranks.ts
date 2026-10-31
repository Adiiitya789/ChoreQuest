export const RANKS: { level: number; title: string }[] = [
  { level: 1, title: 'Initiate' },
  { level: 2, title: 'Operator' },
  { level: 3, title: 'Hacker' },
  { level: 5, title: 'Netrunner' },
  { level: 8, title: 'Architect' },
  { level: 12, title: 'The One' },
];

export function rankFor(level: number) {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (level >= rank.level) index = i;
  });
  return { current: RANKS[index], next: RANKS[index + 1] ?? null };
}
