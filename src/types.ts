export type Difficulty = 'easy' | 'medium' | 'hard';

export type EmailLabel = 'INBOX' | 'UNREAD' | 'STARRED';

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  labels: EmailLabel[];
}

export type GmailAction = 'ARCHIVE' | 'KEEP' | 'STAR';

export type ExpenseCategory = 'food' | 'travel' | 'bills' | 'shopping' | 'other';

export interface Expense {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: ExpenseCategory | null;
}

export interface ManualQuest {
  id: string;
  kind: 'manual';
  title: string;
  difficulty: Difficulty;
  done: boolean;
}

export interface CalendarQuest {
  id: string;
  kind: 'calendar';
  title: string;
  time: string;
  done: boolean;
}

export type Quest = ManualQuest | CalendarQuest;

export interface LastEmailAction {
  email: EmailMessage;
  action: GmailAction;
  xpGained: number;
  coinsGained: number;
  comboBefore: number;
  // Optional so saves made before these fields existed still load.
  streakBefore?: number;
  lastActiveDayBefore?: string | null;
  day?: string;
}

/** Activity totals for one local calendar day, keyed by YYYY-MM-DD in GameState.history. */
export interface DayStats {
  emails: number;
  quests: number;
  expenses: number;
  xpEmails: number;
  xpQuests: number;
  xpExpenses: number;
  coins: number;
}

export interface GameState {
  xp: number;
  coins: number;
  streak: number;
  lastActiveDay: string | null;
  combo: number;
  emailsSorted: number;
  questsCompleted: number;
  inbox: EmailMessage[];
  quests: Quest[];
  expenses: Expense[];
  lastEmailAction: LastEmailAction | null;
  history: Record<string, DayStats>;
}

export interface RewardPopup {
  id: string;
  label: string;
  xp: number;
  coins: number;
}
