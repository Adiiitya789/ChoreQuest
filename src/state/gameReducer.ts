import { SAMPLE_INBOX } from '@/lib/sampleData';
import { mergeExpenses } from '@/lib/expenses';
import { addToDay } from '@/lib/stats';
import { EXPENSE_REWARD, emailActionXp, localDayKey, nextStreak, questReward } from '@/lib/xp';
import type { Difficulty, Expense, ExpenseCategory, GameState, GmailAction, Quest } from '@/types';

export type GameAction =
  | { type: 'HYDRATE'; state: GameState }
  | { type: 'SORT_EMAIL'; emailId: string; action: GmailAction; at: string }
  | { type: 'UNDO_EMAIL' }
  | { type: 'BREAK_COMBO' }
  | { type: 'REFILL_INBOX' }
  | { type: 'ADD_QUEST'; id: string; title: string; difficulty: Difficulty }
  | { type: 'TOGGLE_QUEST'; id: string; at: string }
  | { type: 'DELETE_QUEST'; id: string }
  | { type: 'IMPORT_EXPENSES'; incoming: Expense[] }
  | { type: 'CATEGORIZE_EXPENSE'; id: string; category: ExpenseCategory; at: string };

function touchStreak(state: GameState, at: Date) {
  return nextStreak(state.streak, state.lastActiveDay, at);
}

function sortEmail(state: GameState, emailId: string, action: GmailAction, at: string): GameState {
  const email = state.inbox.find((item) => item.id === emailId);
  if (!email) return state;

  const combo = state.combo + 1;
  const xpGained = emailActionXp(combo);
  const streak = touchStreak(state, new Date(at));
  const day = localDayKey(new Date(at));

  return {
    ...state,
    history: addToDay(state.history, day, { emails: 1, xpEmails: xpGained }),
    xp: state.xp + xpGained,
    combo,
    streak: streak.streak,
    lastActiveDay: streak.lastActiveDay,
    emailsSorted: state.emailsSorted + 1,
    inbox: state.inbox.filter((item) => item.id !== emailId),
    lastEmailAction: {
      email,
      action,
      xpGained,
      coinsGained: 0,
      comboBefore: state.combo,
      streakBefore: state.streak,
      lastActiveDayBefore: state.lastActiveDay,
      day,
    },
  };
}

function undoEmail(state: GameState): GameState {
  const last = state.lastEmailAction;
  if (!last) return state;

  return {
    ...state,
    history: last.day
      ? addToDay(state.history, last.day, { emails: -1, xpEmails: -last.xpGained, coins: -last.coinsGained })
      : state.history,
    xp: Math.max(0, state.xp - last.xpGained),
    coins: Math.max(0, state.coins - last.coinsGained),
    combo: last.comboBefore,
    streak: last.streakBefore ?? state.streak,
    lastActiveDay: last.lastActiveDayBefore !== undefined ? last.lastActiveDayBefore : state.lastActiveDay,
    emailsSorted: Math.max(0, state.emailsSorted - 1),
    inbox: [last.email, ...state.inbox],
    lastEmailAction: null,
  };
}

function toggleQuest(state: GameState, id: string, at: string): GameState {
  const quest = state.quests.find((item) => item.id === id);
  if (!quest) return state;

  const reward = questReward(quest);
  const completing = !quest.done;
  const direction = completing ? 1 : -1;
  const quests: Quest[] = state.quests.map((item) =>
    item.id === id ? { ...item, done: completing } : item,
  );

  const streak = completing ? touchStreak(state, new Date(at)) : null;

  return {
    ...state,
    history: addToDay(state.history, localDayKey(new Date(at)), {
      quests: direction,
      xpQuests: direction * reward.xp,
      coins: direction * reward.coins,
    }),
    quests,
    xp: Math.max(0, state.xp + direction * reward.xp),
    coins: Math.max(0, state.coins + direction * reward.coins),
    questsCompleted: Math.max(0, state.questsCompleted + direction),
    streak: streak ? streak.streak : state.streak,
    lastActiveDay: streak ? streak.lastActiveDay : state.lastActiveDay,
  };
}

function categorizeExpense(
  state: GameState,
  id: string,
  category: ExpenseCategory,
  at: string,
): GameState {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense || expense.category !== null) return state;

  const streak = touchStreak(state, new Date(at));
  return {
    ...state,
    expenses: state.expenses.map((item) => (item.id === id ? { ...item, category } : item)),
    history: addToDay(state.history, localDayKey(new Date(at)), {
      expenses: 1,
      xpExpenses: EXPENSE_REWARD.xp,
      coins: EXPENSE_REWARD.coins,
    }),
    xp: state.xp + EXPENSE_REWARD.xp,
    coins: state.coins + EXPENSE_REWARD.coins,
    streak: streak.streak,
    lastActiveDay: streak.lastActiveDay,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;
    case 'SORT_EMAIL':
      return sortEmail(state, action.emailId, action.action, action.at);
    case 'UNDO_EMAIL':
      return undoEmail(state);
    case 'BREAK_COMBO':
      return state.combo === 0 ? state : { ...state, combo: 0 };
    case 'REFILL_INBOX':
      return {
        ...state,
        inbox: SAMPLE_INBOX.map((email) => ({ ...email, labels: [...email.labels] })),
      };
    case 'ADD_QUEST':
      return {
        ...state,
        quests: [
          ...state.quests,
          { id: action.id, kind: 'manual', title: action.title, difficulty: action.difficulty, done: false },
        ],
      };
    case 'TOGGLE_QUEST':
      return toggleQuest(state, action.id, action.at);
    case 'DELETE_QUEST':
      return {
        ...state,
        quests: state.quests.filter((item) => !(item.id === action.id && !item.done)),
      };
    case 'IMPORT_EXPENSES':
      return { ...state, expenses: mergeExpenses(state.expenses, action.incoming).expenses };
    case 'CATEGORIZE_EXPENSE':
      return categorizeExpense(state, action.id, action.category, action.at);
  }
}
