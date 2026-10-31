import { Schema, type FunctionDeclaration } from 'firebase/ai';
import { EXPENSE_CATEGORIES, totalsByCategory } from '@/lib/expenses';
import { rankFor } from '@/lib/ranks';
import { comparePeriods, firstTrackedDay, lastNDays, sumRange, totalXp } from '@/lib/stats';
import { levelProgress, localDayKey } from '@/lib/xp';
import type { DayStats, GameState } from '@/types';

// Tools Gemini can call to read the signed-in player's progress. They run in the
// browser against the same state that is synced to Firestore, so the model only
// ever sees real numbers and never invents them.

const MAX_RANGE_DAYS = 400;
const MAX_DAILY_ROWS = 62;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return localDayKey(date) === value ? date : null;
}

function describe(stats: DayStats) {
  return {
    total_xp: totalXp(stats),
    xp_from_emails: stats.xpEmails,
    xp_from_quests: stats.xpQuests,
    xp_from_expenses: stats.xpExpenses,
    emails_sorted: stats.emails,
    quests_completed: stats.quests,
    expenses_filed: stats.expenses,
    coins_earned: stats.coins,
  };
}

function diff(current: DayStats, previous: DayStats) {
  const a = describe(current);
  const b = describe(previous);
  return Object.fromEntries(
    (Object.keys(a) as (keyof typeof a)[]).map((key) => {
      const change = a[key] - b[key];
      const percent = b[key] === 0 ? null : Math.round((change / b[key]) * 100);
      return [key, { current: a[key], previous: b[key], change, percent_change: percent }];
    }),
  );
}

export function buildCoachTools(getState: () => GameState): FunctionDeclaration[] {
  return [
    {
      name: 'get_player_profile',
      description:
        "Current snapshot of the player: level, rank, XP, coins, streak, lifetime totals, open quests and today's date. Call this first for general questions.",
      functionReference: () => {
        const state = getState();
        const progress = levelProgress(state.xp);
        const rank = rankFor(progress.level);
        const today = new Date();
        return {
          today: localDayKey(today),
          weekday: today.toLocaleDateString('en-IN', { weekday: 'long' }),
          level: progress.level,
          rank: rank.current.title,
          next_rank: rank.next ? { title: rank.next.title, at_level: rank.next.level } : null,
          total_xp: state.xp,
          xp_needed_for_next_level: progress.xpForNext - progress.xpIntoLevel,
          coins: state.coins,
          day_streak: state.streak,
          last_active_day: state.lastActiveDay,
          lifetime: {
            emails_sorted: state.emailsSorted,
            quests_completed: state.questsCompleted,
            expenses_filed: state.expenses.filter((e) => e.category !== null).length,
          },
          emails_left_in_inbox: state.inbox.length,
          expenses_waiting_to_be_filed: state.expenses.filter((e) => e.category === null).length,
          open_quests: state.quests
            .filter((q) => !q.done)
            .map((q) => (q.kind === 'calendar' ? `${q.title} (calendar, ${q.time})` : `${q.title} (${q.difficulty})`)),
          today_so_far: describe(lastNDays(state.history, 1, today)[0].stats),
          daily_history_starts_on: firstTrackedDay(state.history),
          note: 'Per-day history only exists from daily_history_starts_on; lifetime totals include earlier activity.',
        };
      },
    },
    {
      name: 'get_activity_between',
      description:
        'Totals of XP, emails sorted, quests completed, expenses filed and coins for an inclusive date range, plus a per-day breakdown for ranges up to 62 days. Use for specific days, calendar weeks or months.',
      parameters: Schema.object({
        properties: {
          start_date: Schema.string({ description: 'First day, YYYY-MM-DD (local time).' }),
          end_date: Schema.string({ description: 'Last day, YYYY-MM-DD (local time), inclusive.' }),
        },
      }),
      functionReference: (args: { start_date?: unknown; end_date?: unknown }) => {
        const start = parseDay(args.start_date);
        const end = parseDay(args.end_date);
        if (!start || !end) return { error: 'start_date and end_date must be valid YYYY-MM-DD dates.' };
        if (start > end) return { error: 'start_date must be on or before end_date.' };
        const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
        if (days > MAX_RANGE_DAYS) return { error: `Ranges are limited to ${MAX_RANGE_DAYS} days.` };

        const state = getState();
        const daily = days <= MAX_DAILY_ROWS
          ? lastNDays(state.history, days, end)
              .filter((d) => totalXp(d.stats) > 0 || d.stats.coins > 0)
              .map((d) => ({ date: d.day, ...describe(d.stats) }))
          : undefined;
        return {
          start_date: args.start_date,
          end_date: args.end_date,
          days_in_range: days,
          totals: describe(sumRange(state.history, start, end)),
          active_days: daily?.length,
          daily_breakdown: daily,
          daily_history_starts_on: firstTrackedDay(state.history),
        };
      },
    },
    {
      name: 'compare_periods',
      description:
        "Compares two periods with changes and percentages. 'week' = last 7 days vs the 7 days before; 'month' = this month so far vs all of last month. Use for 'how much more or less did I do' questions.",
      parameters: Schema.object({
        properties: {
          period: Schema.enumString({ enum: ['week', 'month'], description: 'Which comparison to run.' }),
        },
      }),
      functionReference: (args: { period?: unknown }) => {
        const state = getState();
        const [week, month] = comparePeriods(state.history, new Date());
        const chosen = args.period === 'month' ? month : week;
        return {
          period: chosen.label.toLowerCase(),
          current_label: chosen.currentLabel,
          previous_label: chosen.previousLabel,
          metrics: diff(chosen.current, chosen.previous),
          daily_history_starts_on: firstTrackedDay(state.history),
        };
      },
    },
    {
      name: 'get_spending_summary',
      description:
        'Rupee totals of filed expenses by category (food, travel, bills, shopping, other), optionally limited to a date range, plus how many payments are still unfiled.',
      parameters: Schema.object({
        properties: {
          start_date: Schema.string({ description: 'Optional first day, YYYY-MM-DD.' }),
          end_date: Schema.string({ description: 'Optional last day, YYYY-MM-DD, inclusive.' }),
        },
        optionalProperties: ['start_date', 'end_date'],
      }),
      functionReference: (args: { start_date?: unknown; end_date?: unknown }) => {
        const start = args.start_date ? parseDay(args.start_date) : null;
        const end = args.end_date ? parseDay(args.end_date) : null;
        if ((args.start_date && !start) || (args.end_date && !end)) {
          return { error: 'Dates must be valid YYYY-MM-DD values.' };
        }
        const inRange = getState().expenses.filter((expense) => {
          if (start && expense.date < localDayKey(start)) return false;
          if (end && expense.date > localDayKey(end)) return false;
          return true;
        });
        const totals = totalsByCategory(inRange);
        const filed = inRange.filter((e) => e.category !== null);
        return {
          currency: 'INR',
          range: { start_date: args.start_date ?? null, end_date: args.end_date ?? null },
          total_filed: filed.reduce((sum, e) => sum + e.amount, 0),
          by_category: Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, totals[c.id]])),
          payments_filed: filed.length,
          payments_unfiled: inRange.length - filed.length,
        };
      },
    },
  ];
}

export type ToolArgs = Record<string, unknown>;
export type ToolResult = Record<string, unknown>;

/** Runs a declared tool by name, exactly as the SDK does during automatic function calling. */
export function runTool(tools: FunctionDeclaration[], name: string, args: ToolArgs = {}): ToolResult {
  const tool = tools.find((t) => t.name === name);
  if (!tool?.functionReference) return { error: `Unknown tool ${name}` };
  return (tool.functionReference as (a: ToolArgs) => ToolResult)(args);
}
