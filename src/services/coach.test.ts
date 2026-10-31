import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCoachTools, runTool } from '@/lib/coachTools';
import { createStarterState } from '@/lib/sampleData';
import { emptyDay } from '@/lib/stats';
import { createLocalCoach } from '@/services/localCoach';
import type { GameState } from '@/types';

function playerState(): GameState {
  return {
    ...createStarterState(),
    xp: 120,
    history: {
      '2026-10-31': { ...emptyDay(), emails: 3, xpEmails: 6, expenses: 2, xpExpenses: 6, coins: 2 },
      '2026-09-15': { ...emptyDay(), quests: 1, xpQuests: 25, coins: 12 },
    },
    expenses: [
      { id: 'a', merchant: 'Swiggy', amount: 600, date: '2026-10-20', category: 'food' },
      { id: 'b', merchant: 'Uber', amount: 400, date: '2026-10-21', category: 'travel' },
      { id: 'c', merchant: 'Amazon', amount: 999, date: '2026-09-02', category: 'shopping' },
      { id: 'd', merchant: 'Zomato', amount: 250, date: '2026-10-22', category: null },
    ],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 31, 12));
});
afterEach(() => vi.useRealTimers());

describe('coach tools', () => {
  const tools = buildCoachTools(playerState);

  it('compare_periods reports change against last month', () => {
    const result = runTool(tools, 'compare_periods', { period: 'month' }) as {
      metrics: Record<string, { current: number; previous: number; change: number }>;
    };
    expect(result.metrics.total_xp).toMatchObject({ current: 12, previous: 25, change: -13 });
  });

  it('get_spending_summary filters by date and counts unfiled payments', () => {
    const result = runTool(tools, 'get_spending_summary', { start_date: '2026-10-01', end_date: '2026-10-31' });
    expect(result.total_filed).toBe(1000);
    expect(result.payments_unfiled).toBe(1);
  });

  it('rejects malformed dates instead of guessing', () => {
    const result = runTool(tools, 'get_activity_between', { start_date: '2026-13-01', end_date: '2026-10-31' });
    expect(result.error).toBeDefined();
  });
});

describe('local coach engine', () => {
  async function ask(question: string) {
    const coach = createLocalCoach(playerState, 'Aditya Test');
    const pending = coach.send(question);
    await vi.runAllTimersAsync();
    return pending;
  }

  it('answers "how much less did I score last month" with real numbers', async () => {
    const reply = await ask('how much less did i score last month?');
    expect(reply.toolCalls.map((c) => c.name)).toContain('compare_periods');
    expect(reply.text).toContain('13 XP behind');
  });

  it('routes money questions to the spending tool', async () => {
    const reply = await ask('where did my money go this month');
    expect(reply.toolCalls[0]).toEqual({
      name: 'get_spending_summary',
      args: { start_date: '2026-10-01', end_date: '2026-10-31' },
    });
    expect(reply.text).toContain('₹1,000');
  });

  it('treats "lazy today" as a request for motivation', async () => {
    const reply = await ask("i'm feeling lazy today, motivate me");
    expect(reply.toolCalls.map((c) => c.name)).toEqual(['get_player_profile']);
  });
});
