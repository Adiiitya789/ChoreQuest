import { describe, expect, it } from 'vitest';
import { createStarterState } from '@/lib/sampleData';
import { emailActionXp, levelFromXp } from '@/lib/xp';
import { gameReducer } from '@/state/gameReducer';
import type { GameState } from '@/types';

const AT = new Date(2026, 9, 31, 12).toISOString();
const DAY = '2026-10-31';

function freshState(): GameState {
  return {
    ...createStarterState(),
    expenses: [{ id: 'e1', merchant: 'Swiggy', amount: 450, date: DAY, category: null }],
  };
}

describe('xp rules', () => {
  it('levels follow the square-root curve', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(399)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
  });

  it('every 10th email in a combo pays a bonus', () => {
    expect(emailActionXp(9)).toBe(2);
    expect(emailActionXp(10)).toBe(12);
  });
});

describe('gameReducer', () => {
  it('filing an expense awards XP and coins once and logs the day', () => {
    const once = gameReducer(freshState(), { type: 'CATEGORIZE_EXPENSE', id: 'e1', category: 'food', at: AT });
    expect(once.xp).toBe(3);
    expect(once.coins).toBe(1);
    expect(once.history[DAY]).toMatchObject({ expenses: 1, xpExpenses: 3, coins: 1 });

    const twice = gameReducer(once, { type: 'CATEGORIZE_EXPENSE', id: 'e1', category: 'bills', at: AT });
    expect(twice).toBe(once);
  });

  it('undo reverses a sorted email, including the daily log', () => {
    const start = freshState();
    expect(start.inbox.length).toBeGreaterThan(0);
    const sorted = gameReducer(start, { type: 'SORT_EMAIL', emailId: start.inbox[0].id, action: 'ARCHIVE', at: AT });
    expect(sorted.xp).toBe(2);
    expect(sorted.history[DAY].emails).toBe(1);

    const undone = gameReducer(sorted, { type: 'UNDO_EMAIL' });
    expect(undone.xp).toBe(0);
    expect(undone.inbox).toHaveLength(start.inbox.length);
    expect(undone.history[DAY].emails).toBe(0);
  });

  it('completing then reopening a quest nets to zero', () => {
    const added = gameReducer(freshState(), { type: 'ADD_QUEST', id: 'q1', title: 'Clean garage', difficulty: 'hard' });
    const done = gameReducer(added, { type: 'TOGGLE_QUEST', id: 'q1', at: AT });
    expect(done.xp).toBe(50);
    expect(done.questsCompleted).toBe(1);

    const reopened = gameReducer(done, { type: 'TOGGLE_QUEST', id: 'q1', at: AT });
    expect(reopened.xp).toBe(0);
    expect(reopened.history[DAY].xpQuests).toBe(0);
  });
});
