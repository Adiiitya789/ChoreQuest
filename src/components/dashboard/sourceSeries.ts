import type { DayStats } from '@/types';

// Validated categorical palette for the dark surface (all-pairs CVD and contrast pass).
export const SOURCE_SERIES = [
  { key: 'xpEmails', label: 'Emails', color: '#199E70' },
  { key: 'xpQuests', label: 'Quests', color: '#D95926' },
  { key: 'xpExpenses', label: 'Expenses', color: '#3987E5' },
] as const satisfies readonly { key: keyof DayStats; label: string; color: string }[];
