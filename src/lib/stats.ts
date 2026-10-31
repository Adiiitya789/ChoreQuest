import { localDayKey } from '@/lib/xp';
import type { DayStats } from '@/types';

// Pure helpers over GameState.history. Kept free of React so the dashboard,
// a cloud backend, or a chatbot tool can all answer the same questions.

export function emptyDay(): DayStats {
  return { emails: 0, quests: 0, expenses: 0, xpEmails: 0, xpQuests: 0, xpExpenses: 0, coins: 0 };
}

export function totalXp(stats: DayStats): number {
  return stats.xpEmails + stats.xpQuests + stats.xpExpenses;
}

export function addToDay(
  history: Record<string, DayStats>,
  day: string,
  delta: Partial<DayStats>,
): Record<string, DayStats> {
  const current = history[day] ?? emptyDay();
  const next = { ...current };
  for (const [key, value] of Object.entries(delta) as [keyof DayStats, number][]) {
    next[key] = Math.max(0, next[key] + value);
  }
  return { ...history, [day]: next };
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Sums every day from start to end, both inclusive. */
export function sumRange(history: Record<string, DayStats>, start: Date, end: Date): DayStats {
  const total = emptyDay();
  const last = localDayKey(end);
  for (let day = new Date(start); localDayKey(day) <= last; day = addDays(day, 1)) {
    const stats = history[localDayKey(day)];
    if (!stats) continue;
    for (const key of Object.keys(total) as (keyof DayStats)[]) total[key] += stats[key];
  }
  return total;
}

export function lastNDays(history: Record<string, DayStats>, count: number, today: Date) {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - count + 1);
    const day = localDayKey(date);
    return { day, date, stats: history[day] ?? emptyDay() };
  });
}

export interface PeriodComparison {
  label: string;
  currentLabel: string;
  previousLabel: string;
  current: DayStats;
  previous: DayStats;
}

/** Rolling 7 days vs the 7 before, and this month so far vs all of last month. */
export function comparePeriods(history: Record<string, DayStats>, today: Date): PeriodComparison[] {
  const lastMonthDay = addDays(startOfMonth(today), -1);
  return [
    {
      label: 'Week',
      currentLabel: 'Last 7 days',
      previousLabel: 'Previous 7 days',
      current: sumRange(history, addDays(today, -6), today),
      previous: sumRange(history, addDays(today, -13), addDays(today, -7)),
    },
    {
      label: 'Month',
      currentLabel: 'This month',
      previousLabel: 'Last month',
      current: sumRange(history, startOfMonth(today), today),
      previous: sumRange(history, startOfMonth(lastMonthDay), endOfMonth(lastMonthDay)),
    },
  ];
}

/** Percentage change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function firstTrackedDay(history: Record<string, DayStats>): string | null {
  const days = Object.keys(history).sort();
  return days[0] ?? null;
}

export function bestDay(history: Record<string, DayStats>): { day: string; xp: number } | null {
  let best: { day: string; xp: number } | null = null;
  for (const [day, stats] of Object.entries(history)) {
    const xp = totalXp(stats);
    if (xp > 0 && (!best || xp > best.xp)) best = { day, xp };
  }
  return best;
}
