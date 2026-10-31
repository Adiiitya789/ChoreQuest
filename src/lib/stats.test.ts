import { describe, expect, it } from 'vitest';
import { addToDay, bestDay, comparePeriods, emptyDay, firstTrackedDay, percentChange, sumRange, totalXp } from '@/lib/stats';
import type { DayStats } from '@/types';

const day = (xpEmails: number, extra: Partial<DayStats> = {}): DayStats => ({ ...emptyDay(), xpEmails, emails: 1, ...extra });
const TODAY = new Date(2026, 9, 31); // 31 Oct 2026

describe('addToDay', () => {
  it('adds to an existing bucket without mutating the input', () => {
    const history = { '2026-10-31': day(2) };
    const next = addToDay(history, '2026-10-31', { emails: 1, xpEmails: 2 });
    expect(next['2026-10-31'].emails).toBe(2);
    expect(history['2026-10-31'].emails).toBe(1);
  });

  it('never goes below zero', () => {
    const next = addToDay({}, '2026-10-31', { quests: -1, xpQuests: -25 });
    expect(next['2026-10-31'].quests).toBe(0);
    expect(next['2026-10-31'].xpQuests).toBe(0);
  });
});

describe('sumRange', () => {
  it('includes both the start and end day', () => {
    const history = { '2026-10-01': day(1), '2026-10-02': day(2), '2026-10-03': day(4) };
    expect(totalXp(sumRange(history, new Date(2026, 9, 1), new Date(2026, 9, 2)))).toBe(3);
  });
});

describe('comparePeriods', () => {
  it('splits the rolling week at seven days', () => {
    const history = { '2026-10-25': day(5), '2026-10-24': day(7), '2026-10-31': day(10) };
    const [week] = comparePeriods(history, TODAY);
    expect(totalXp(week.current)).toBe(15);
    expect(totalXp(week.previous)).toBe(7);
  });

  it('compares this month so far with all of last month', () => {
    const history = { '2026-09-01': day(3), '2026-09-30': day(4), '2026-10-01': day(9) };
    const [, month] = comparePeriods(history, TODAY);
    expect(totalXp(month.current)).toBe(9);
    expect(totalXp(month.previous)).toBe(7);
  });
});

describe('helpers', () => {
  it('percentChange is null without a baseline', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 10)).toBe(-50);
  });

  it('finds the first tracked day and the best day', () => {
    const history = { '2026-10-30': day(4), '2026-10-28': day(9) };
    expect(firstTrackedDay(history)).toBe('2026-10-28');
    expect(bestDay(history)).toEqual({ day: '2026-10-28', xp: 9 });
    expect(bestDay({})).toBeNull();
  });
});
