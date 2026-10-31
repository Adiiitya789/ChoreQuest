import type { CalendarQuest, Difficulty, GameState, ManualQuest } from '@/types';

export const EMAIL_XP = 2;
export const COMBO_BONUS_XP = 10;
export const COMBO_INTERVAL = 10;

export const EXPENSE_REWARD = { xp: 3, coins: 1 };

export const QUEST_REWARDS: Record<Difficulty | 'calendar', { xp: number; coins: number }> = {
  easy: { xp: 10, coins: 5 },
  medium: { xp: 25, coins: 12 },
  hard: { xp: 50, coins: 25 },
  calendar: { xp: 15, coins: 5 },
};

export function questReward(quest: ManualQuest | CalendarQuest) {
  return quest.kind === 'calendar' ? QUEST_REWARDS.calendar : QUEST_REWARDS[quest.difficulty];
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForLevel(level: number): number {
  return 100 * (level - 1) ** 2;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  const percent = Math.min(100, ((xp - start) / (end - start)) * 100);
  return { level, percent, xpIntoLevel: xp - start, xpForNext: end - start };
}

export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nextStreak(
  streak: number,
  lastActiveDay: string | null,
  today: Date,
): { streak: number; lastActiveDay: string } {
  const todayKey = localDayKey(today);
  if (lastActiveDay === todayKey) return { streak: Math.max(1, streak), lastActiveDay: todayKey };

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const continues = lastActiveDay === localDayKey(yesterday);
  return { streak: continues ? streak + 1 : 1, lastActiveDay: todayKey };
}

export function emailActionXp(comboAfterAction: number): number {
  const bonus = comboAfterAction > 0 && comboAfterAction % COMBO_INTERVAL === 0 ? COMBO_BONUS_XP : 0;
  return EMAIL_XP + bonus;
}

export function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<GameState>;
  return (
    typeof v.xp === 'number' &&
    typeof v.coins === 'number' &&
    typeof v.streak === 'number' &&
    typeof v.combo === 'number' &&
    typeof v.emailsSorted === 'number' &&
    typeof v.questsCompleted === 'number' &&
    Array.isArray(v.inbox) &&
    Array.isArray(v.quests)
  );
}
