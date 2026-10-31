import { localDayKey } from '@/lib/xp';
import type { CalendarQuest, EmailMessage, Expense, ExpenseCategory, GameState, ManualQuest } from '@/types';

interface DemoTransaction {
  merchant: string;
  amount: number;
  daysAgo: number;
  category: ExpenseCategory | null;
}

const DEMO_TRANSACTIONS: DemoTransaction[] = [
  { merchant: 'Zomato', amount: 486, daysAgo: 1, category: 'food' },
  { merchant: 'Uber', amount: 212, daysAgo: 1, category: 'travel' },
  { merchant: 'Netflix', amount: 649, daysAgo: 2, category: 'bills' },
  { merchant: 'Amazon', amount: 2499, daysAgo: 3, category: 'shopping' },
  { merchant: 'Blinkit', amount: 1126, daysAgo: 0, category: null },
  { merchant: 'Swiggy Instamart', amount: 342, daysAgo: 0, category: null },
  { merchant: 'Airtel Postpaid', amount: 599, daysAgo: 1, category: null },
  { merchant: 'Ola', amount: 178, daysAgo: 2, category: null },
  { merchant: 'Starbucks', amount: 420, daysAgo: 2, category: null },
  { merchant: 'IRCTC', amount: 1150, daysAgo: 4, category: null },
  { merchant: 'Myntra', amount: 1299, daysAgo: 4, category: null },
  { merchant: 'BESCOM Electricity', amount: 864, daysAgo: 5, category: null },
  { merchant: 'Spotify', amount: 119, daysAgo: 6, category: null },
  { merchant: 'Flipkart', amount: 749, daysAgo: 6, category: null },
  { merchant: 'Cult.fit', amount: 1500, daysAgo: 7, category: null },
];

export function buildDemoExpenses(makeId: () => string): Expense[] {
  const today = new Date();
  return DEMO_TRANSACTIONS.map((transaction) => {
    const date = new Date(today);
    date.setDate(today.getDate() - transaction.daysAgo);
    return {
      id: makeId(),
      merchant: transaction.merchant,
      amount: transaction.amount,
      date: localDayKey(date),
      category: transaction.category,
    };
  });
}

const WAVE_MERCHANTS: { merchant: string; min: number; max: number }[] = [
  { merchant: 'Zomato', min: 180, max: 900 },
  { merchant: 'Swiggy', min: 150, max: 800 },
  { merchant: 'Blinkit', min: 120, max: 1500 },
  { merchant: 'Starbucks', min: 250, max: 650 },
  { merchant: "Domino's Pizza", min: 300, max: 900 },
  { merchant: 'Uber', min: 90, max: 600 },
  { merchant: 'Ola', min: 80, max: 500 },
  { merchant: 'Rapido', min: 40, max: 200 },
  { merchant: 'IRCTC', min: 400, max: 2500 },
  { merchant: 'IndiGo Airlines', min: 3500, max: 9000 },
  { merchant: 'Airtel Postpaid', min: 399, max: 999 },
  { merchant: 'Jio Recharge', min: 239, max: 749 },
  { merchant: 'BESCOM Electricity', min: 600, max: 2200 },
  { merchant: 'Netflix', min: 199, max: 649 },
  { merchant: 'Amazon', min: 300, max: 4000 },
  { merchant: 'Flipkart', min: 250, max: 3500 },
  { merchant: 'Myntra', min: 500, max: 2500 },
  { merchant: 'Decathlon', min: 400, max: 3000 },
  { merchant: 'Apollo Pharmacy', min: 120, max: 900 },
  { merchant: 'PVR Cinemas', min: 300, max: 1200 },
];

/** A random batch of uncategorised payments, so the demo can be replayed after every wave is cleared. */
export function buildDemoWave(makeId: () => string, size = 10): Expense[] {
  const today = new Date();
  const pool = [...WAVE_MERCHANTS].sort(() => Math.random() - 0.5).slice(0, size);
  return pool.map(({ merchant, min, max }) => {
    const date = new Date(today);
    date.setDate(today.getDate() - Math.floor(Math.random() * 14));
    return {
      id: makeId(),
      merchant,
      amount: Math.round(min + Math.random() * (max - min)),
      date: localDayKey(date),
      category: null,
    };
  });
}

export const SAMPLE_INBOX: EmailMessage[] = [
  {
    id: 'e1',
    from: 'Stripe Receipts',
    subject: 'Your receipt from Netflix ($15.49)',
    snippet: 'Thanks for your payment. Your subscription renews next month.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e2',
    from: 'Dev Weekly',
    subject: 'This week: 14 JavaScript tools you will never use',
    snippet: 'A curated list of libraries you will bookmark and forget.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e3',
    from: 'Priya (Team Lead)',
    subject: 'Re: Q3 roadmap draft',
    snippet: 'Can you take a look at section 2 before Thursday?',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e4',
    from: 'Zoom',
    subject: 'Reminder: Team Sync starts in 10 minutes',
    snippet: 'Join from your browser or the desktop app.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e5',
    from: 'FlashDeals',
    subject: 'FLASH SALE: 70% off everything, ends in 2 hours!!',
    snippet: 'Hurry, these deals will not last. Unsubscribe anytime.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e6',
    from: 'Grandma Ruth',
    subject: 'Photos from the lake house',
    snippet: 'Look at the size of that fish your uncle caught!',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e7',
    from: 'Uber Eats',
    subject: 'Your order is on the way',
    snippet: 'Your driver arrives in 12 minutes. Tip before you forget.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e8',
    from: 'City Water Utility',
    subject: 'Your bill for October is ready',
    snippet: 'Amount due: $48.20. Pay by the 15th to avoid a late fee.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e9',
    from: 'LinkedIn',
    subject: 'You appeared in 27 searches this week',
    snippet: 'See who is looking at your profile.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e10',
    from: 'Calendar Bot',
    subject: 'Invitation: Gym Session (Thu 6:30 PM)',
    snippet: 'You have been invited to Gym Session by yourself.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e11',
    from: 'Spotify',
    subject: 'Your Wrapped is here. You listened to 4 songs 900 times.',
    snippet: 'Find out your top artist of the year.',
    labels: ['INBOX', 'UNREAD'],
  },
  {
    id: 'e12',
    from: 'Landlord Office',
    subject: 'Scheduled maintenance on Saturday',
    snippet: 'Plumbers will visit between 9 AM and noon. Please clear the sink area.',
    labels: ['INBOX', 'UNREAD'],
  },
];

export const SAMPLE_CALENDAR: CalendarQuest[] = [
  { id: 'c1', kind: 'calendar', title: 'Sprint Planning', time: '10:00 AM', done: false },
  { id: 'c2', kind: 'calendar', title: 'Team Sync', time: '4:00 PM', done: false },
  { id: 'c3', kind: 'calendar', title: 'Gym Session', time: '6:30 PM', done: false },
];

const STARTER_QUESTS: Omit<ManualQuest, 'id'>[] = [
  { kind: 'manual', title: 'Empty the dishwasher', difficulty: 'easy', done: false },
  { kind: 'manual', title: 'Reply to the landlord about the sink', difficulty: 'medium', done: false },
  { kind: 'manual', title: 'Clean out the garage', difficulty: 'hard', done: false },
];

export function createStarterState(): GameState {
  return {
    xp: 0,
    coins: 0,
    streak: 0,
    lastActiveDay: null,
    combo: 0,
    emailsSorted: 0,
    questsCompleted: 0,
    inbox: SAMPLE_INBOX.map((email) => ({ ...email, labels: [...email.labels] })),
    quests: [
      ...STARTER_QUESTS.map((quest) => ({ ...quest, id: crypto.randomUUID() })),
      ...SAMPLE_CALENDAR.map((event) => ({ ...event })),
    ],
    expenses: buildDemoExpenses(() => crypto.randomUUID()),
    lastEmailAction: null,
    history: {},
  };
}
