import type { Expense, ExpenseCategory } from '@/types';

export interface CategoryDefinition {
  id: ExpenseCategory;
  label: string;
  key: string;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { id: 'food', label: 'Food', key: '1', color: '#F59E0B' },
  { id: 'travel', label: 'Travel', key: '2', color: '#38BDF8' },
  { id: 'bills', label: 'Bills', key: '3', color: '#A78BFA' },
  { id: 'shopping', label: 'Shopping', key: '4', color: '#F472B6' },
  { id: 'other', label: 'Other', key: '5', color: '#94A3B8' },
];

const CATEGORY_KEYWORDS: Partial<Record<ExpenseCategory, RegExp>> = {
  food: /zomato|swiggy|blinkit|starbucks|cafe|restaurant|domino|kfc|mcdonald|pizza|bigbasket/i,
  travel: /uber|ola|rapido|irctc|indigo|airline|metro|fuel|petrol|makemytrip/i,
  bills: /netflix|spotify|airtel|jio|electric|bescom|broadband|insurance|hotstar|water/i,
  shopping: /amazon|flipkart|myntra|ajio|nykaa|decathlon/i,
};

export function guessCategory(merchant: string): ExpenseCategory | null {
  const match = EXPENSE_CATEGORIES.find(({ id }) => CATEGORY_KEYWORDS[id]?.test(merchant));
  return match ? match.id : null;
}

export function categoryLabel(id: ExpenseCategory): string {
  return EXPENSE_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function expenseKey(expense: Pick<Expense, 'merchant' | 'amount' | 'date'>): string {
  return `${expense.merchant.toLowerCase()}|${expense.amount}|${expense.date}`;
}

export function mergeExpenses(existing: Expense[], incoming: Expense[]) {
  const seen = new Set(existing.map(expenseKey));
  const fresh: Expense[] = [];
  for (const expense of incoming) {
    const key = expenseKey(expense);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(expense);
  }
  return { expenses: [...existing, ...fresh], added: fresh.length, duplicates: incoming.length - fresh.length };
}

export function totalsByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const totals: Record<ExpenseCategory, number> = { food: 0, travel: 0, bills: 0, shopping: 0, other: 0 };
  for (const expense of expenses) {
    if (expense.category) totals[expense.category] += expense.amount;
  }
  return totals;
}

const RUPEE_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const WHOLE_RUPEE_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatRupees(amount: number): string {
  return (Number.isInteger(amount) ? WHOLE_RUPEE_FORMAT : RUPEE_FORMAT).format(amount);
}
