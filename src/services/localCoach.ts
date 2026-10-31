import { buildCoachTools, runTool, type ToolArgs } from '@/lib/coachTools';
import { categoryLabel, formatRupees } from '@/lib/expenses';
import { addDays, endOfMonth, startOfMonth } from '@/lib/stats';
import { localDayKey } from '@/lib/xp';
import type { CoachReply, CoachSession, ToolCall } from '@/services/coach';
import type { ExpenseCategory, GameState } from '@/types';

// On-device coach engine. It routes the question to the same tools Gemini uses,
// then writes the reply from the tool results, so every number it quotes comes
// from the player's real data.

interface Totals {
  total_xp: number;
  emails_sorted: number;
  quests_completed: number;
  expenses_filed: number;
  coins_earned: number;
}

interface Metric {
  current: number;
  previous: number;
  change: number;
  percent_change: number | null;
}

interface Profile {
  level: number;
  rank: string;
  next_rank: { title: string; at_level: number } | null;
  total_xp: number;
  xp_needed_for_next_level: number;
  coins: number;
  day_streak: number;
  lifetime: { emails_sorted: number; quests_completed: number; expenses_filed: number };
  emails_left_in_inbox: number;
  expenses_waiting_to_be_filed: number;
  open_quests: string[];
  today_so_far: Totals;
  daily_history_starts_on: string | null;
}

interface DateRange {
  start: string;
  end: string;
  label: string;
}

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shortDate(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function detectRange(text: string, today: Date): DateRange | null {
  const key = localDayKey;
  const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return { start: explicit[1], end: explicit[1], label: `on ${shortDate(explicit[1])}` };
  if (/\byesterday\b/.test(text)) {
    const day = key(addDays(today, -1));
    return { start: day, end: day, label: 'yesterday' };
  }
  if (/\btoday\b|\bso far\b/.test(text)) return { start: key(today), end: key(today), label: 'today' };
  if (/\b(last|previous) month\b/.test(text)) {
    const inLastMonth = addDays(startOfMonth(today), -1);
    return { start: key(startOfMonth(inLastMonth)), end: key(endOfMonth(inLastMonth)), label: 'last month' };
  }
  if (/\bthis month\b/.test(text)) return { start: key(startOfMonth(today)), end: key(today), label: 'this month' };
  if (/\b(last|previous) week\b/.test(text)) {
    return { start: key(addDays(today, -13)), end: key(addDays(today, -7)), label: 'the week before' };
  }
  if (/\b(this|past) week\b|\blast 7 days\b/.test(text)) {
    return { start: key(addDays(today, -6)), end: key(today), label: 'the last 7 days' };
  }
  return null;
}

function nextAction(p: Profile) {
  if (p.expenses_waiting_to_be_filed > 0) {
    return `${plural(p.expenses_waiting_to_be_filed, 'payment')} ${p.expenses_waiting_to_be_filed === 1 ? 'is' : 'are'} still falling toward you on the Expenses screen. Blast them for 3 XP each.`;
  }
  if (p.emails_left_in_inbox > 0) {
    return `${plural(p.emails_left_in_inbox, 'email')} waiting in Inbox Sort. Chain 10 in a row for the combo bonus.`;
  }
  if (p.open_quests.length > 0) return `Next target: ${p.open_quests[0]}.`;
  return 'Your board is clear. Add a quest and keep the momentum going.';
}

function profileReply(p: Profile) {
  const toNext = `${p.xp_needed_for_next_level} XP to level ${p.level + 1}`;
  const rankLine = p.next_rank ? ` ${p.next_rank.title} unlocks at level ${p.next_rank.at_level}.` : '';
  return [
    `You're level ${p.level}, rank ${p.rank}, with ${p.total_xp} XP and ${p.coins} coins. That leaves ${toNext}.${rankLine}`,
    `Streak: ${plural(p.day_streak, 'day')}. Lifetime you've sorted ${plural(p.lifetime.emails_sorted, 'email')}, filed ${plural(p.lifetime.expenses_filed, 'expense')} and cleared ${plural(p.lifetime.quests_completed, 'quest')}.`,
    nextAction(p),
  ].join(' ');
}

function compareReply(result: Record<string, unknown>, p: Profile) {
  const metrics = result.metrics as Record<string, Metric>;
  const asPhrase = (label: unknown) => {
    const text = String(label).toLowerCase();
    return /^(last|previous) \d/.test(text) ? `the ${text}` : text;
  };
  const current = asPhrase(result.current_label);
  const previous = asPhrase(result.previous_label);
  const startedOn = result.daily_history_starts_on as string | null;
  const xp = metrics.total_xp;
  const lines: string[] = [];

  if (xp.current === 0 && xp.previous === 0) {
    lines.push(`No XP logged in ${current} or ${previous} yet${startedOn ? ` (your daily log starts ${shortDate(startedOn)})` : ''}.`);
  } else if (xp.previous === 0) {
    lines.push(
      `You've banked ${xp.current} XP in ${current}. There's nothing on record for ${previous}${
        startedOn ? `, because tracking began on ${shortDate(startedOn)}` : ''
      }, so this is your baseline. Every point from here is a measurable gain.`,
    );
  } else if (xp.change > 0) {
    lines.push(`You scored ${xp.change} XP more in ${current} than ${previous}: ${xp.current} vs ${xp.previous}, up ${xp.percent_change}%.`);
  } else if (xp.change < 0) {
    lines.push(`You're ${-xp.change} XP behind ${previous}: ${xp.current} in ${current} vs ${xp.previous}, ${xp.percent_change}%.`);
  } else {
    lines.push(`Dead even: ${xp.current} XP in both ${current} and ${previous}.`);
  }

  if (xp.current > 0 || xp.previous > 0) {
    const e = metrics.emails_sorted;
    const q = metrics.quests_completed;
    const x = metrics.expenses_filed;
    lines.push(
      `Breakdown: ${plural(e.current, 'email')} (${signed(e.change)}), ${plural(q.current, 'quest')} (${signed(q.change)}), ${plural(x.current, 'expense')} (${signed(x.change)}).`,
    );
  }

  if (xp.change < 0) {
    const gap = -xp.change;
    lines.push(`Close the ${gap} XP gap: file ${Math.ceil(gap / 3)} expenses, or take down a hard quest for 50.`);
  } else if (xp.change > 0) {
    lines.push(pick(['The code is bending around you. Keep it going.', 'That is what leveling up looks like. Do not stop now.', 'You are faster than you think.']) + ' ' + nextAction(p));
  } else {
    lines.push(nextAction(p));
  }
  return lines.join(' ');
}

function activityReply(result: Record<string, unknown>, range: DateRange, p: Profile) {
  const totals = result.totals as Totals;
  const startedOn = result.daily_history_starts_on as string | null;
  if (totals.total_xp === 0) {
    if (startedOn && range.end < startedOn) {
      return `Tracking hadn't started yet for ${range.label}. Your daily log begins on ${shortDate(startedOn)}. ${nextAction(p)}`;
    }
    return `Nothing logged ${range.label}. No judgment, only a fresh start. ${nextAction(p)}`;
  }
  const daily = (result.daily_breakdown as ({ date: string } & Totals)[] | undefined) ?? [];
  const best = daily.length > 1 ? daily.reduce((a, b) => (b.total_xp > a.total_xp ? b : a)) : null;
  return [
    `${capitalise(range.label)} you earned ${totals.total_xp} XP: ${plural(totals.emails_sorted, 'email')} sorted, ${plural(totals.quests_completed, 'quest')} done, ${plural(totals.expenses_filed, 'expense')} filed and +${totals.coins_earned} coins.`,
    best ? `Your strongest day was ${shortDate(best.date)} with ${best.total_xp} XP.` : '',
    nextAction(p),
  ].filter(Boolean).join(' ');
}

function spendingReply(result: Record<string, unknown>, range: DateRange | null) {
  const total = result.total_filed as number;
  const unfiled = result.payments_unfiled as number;
  const byCategory = result.by_category as Record<ExpenseCategory, number>;
  const where = range ? ` ${range.label}` : '';
  const unfiledLine = unfiled > 0 ? ` ${plural(unfiled, 'payment')} still unfiled, so shoot them down to get the full picture.` : '';
  if (total === 0) return `No filed spending${where} yet.${unfiledLine}`;

  const ranked = (Object.entries(byCategory) as [ExpenseCategory, number][])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const [topId, topAmount] = ranked[0];
  const share = Math.round((topAmount / total) * 100);
  const list = ranked.map(([id, amount]) => `${categoryLabel(id).toLowerCase()} ${formatRupees(amount)}`).join(', ');
  return `You've filed ${formatRupees(total)}${where}: ${list}. ${categoryLabel(topId)} is your biggest line at ${share}%.${unfiledLine}`;
}

function questReply(p: Profile) {
  if (p.open_quests.length === 0) {
    return 'No open quests right now. Add one on the Quest Board. Hard quests pay 50 XP and 25 coins.';
  }
  const shown = p.open_quests.slice(0, 4).join('; ');
  const hard = p.open_quests.find((q) => q.includes('(hard)'));
  return `You have ${plural(p.open_quests.length, 'open quest')}: ${shown}${p.open_quests.length > 4 ? ' and more' : ''}. ${
    hard ? `Start with ${hard.replace(' (hard)', '')}, it's worth 50 XP.` : 'Pick the quickest one and get a win on the board.'
  }`;
}

function pepTalk(p: Profile) {
  const expensesToLevel = Math.ceil(p.xp_needed_for_next_level / 3);
  return [
    pick(["Everyone has slow days. What matters is you're still here.", "There's a difference between knowing the path and walking it.", 'Small wins compound. Let us grab one.']),
    `You've already sorted ${plural(p.lifetime.emails_sorted, 'email')} and filed ${plural(p.lifetime.expenses_filed, 'expense')}.`,
    `Level ${p.level + 1} is only ${p.xp_needed_for_next_level} XP away, about ${plural(expensesToLevel, 'expense')}.`,
    nextAction(p),
  ].join(' ');
}

function greeting(p: Profile, name: string) {
  const today = p.today_so_far;
  const status = today.total_xp > 0
    ? `You're at ${today.total_xp} XP today already.`
    : "Today's log is still empty, which means it's all upside.";
  return `${pick([`Wake up, ${name}.`, `Hey ${name}, the Matrix has you.`, `Welcome back, ${name}.`])} ${status} ${nextAction(p)}`;
}

const HELP =
  "Ask me things like: 'How much more did I score this week?', 'Compare this month to last month', 'What did I do yesterday?', 'Where did my money go this month?' or 'What should I do next?'";

export function createLocalCoach(getState: () => GameState, playerName: string): CoachSession {
  const tools = buildCoachTools(getState);
  const firstName = playerName.split(' ')[0] || 'Operator';

  function answer(message: string): CoachReply {
    const text = message.toLowerCase();
    const toolCalls: ToolCall[] = [];
    const call = (name: string, args: ToolArgs = {}) => {
      toolCalls.push({ name, args });
      return runTool(tools, name, args);
    };
    const reply = (value: string): CoachReply => ({ text: value, toolCalls });
    const today = new Date();
    const range = detectRange(text, today);

    if (/\b(thanks|thank you|thx|ty)\b/.test(text)) {
      return reply(pick(['Anytime. Now go bend some spoons.', 'Always. Keep the streak alive.', 'Glad to help. Back to the grind, Operator.']));
    }
    if (/spen[dt]|expens|money|rupee|₹|budget|categor|cost|paid|payment/.test(text)) {
      const result = call('get_spending_summary', range ? { start_date: range.start, end_date: range.end } : {});
      return reply(spendingReply(result, range));
    }

    const profile = call('get_player_profile') as unknown as Profile;

    if (/motivat|tired|lazy|bored|stuck|sad|give up|can'?t|procrastinat|demotiv|unmotiv|help me/.test(text)) {
      return reply(pepTalk(profile));
    }
    if (/\bweek|month|7 days\b/.test(text) && !/\byesterday|today\b/.test(text)) {
      const period = /month/.test(text) ? 'month' : 'week';
      return reply(compareReply(call('compare_periods', { period }), profile));
    }
    if (range) {
      return reply(activityReply(call('get_activity_between', { start_date: range.start, end_date: range.end }), range, profile));
    }
    if (/quest|task|todo|to-do|what should i|next|plan/.test(text)) return reply(questReply(profile));
    if (/streak|level|rank|xp|coin|stat|progress|how am i|how'?s it going|score|doing/.test(text)) {
      return reply(profileReply(profile));
    }
    if (/^\s*(hi|hey|hello|yo|sup|hola|namaste|gm|good (morning|afternoon|evening))\b/.test(text)) {
      return reply(greeting(profile, firstName));
    }
    if (/help|what can you|who are you/.test(text)) {
      return reply(`I'm Neo, your coach. I read your synced progress and keep you moving. ${HELP}`);
    }
    return reply(`${profileReply(profile)} ${HELP}`);
  }

  return {
    backend: 'local',
    async send(message) {
      const result = answer(message);
      await wait(450 + Math.random() * 500 + result.toolCalls.length * 180);
      return result;
    },
  };
}
