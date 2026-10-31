import { EXPENSE_CATEGORIES, formatRupees, totalsByCategory } from '@/lib/expenses';
import { useGame } from '@/state/useGame';

export function SpendBreakdown() {
  const { state } = useGame();
  const totals = totalsByCategory(state.expenses);
  const categorized = state.expenses.filter((expense) => expense.category !== null).length;
  const grandTotal = EXPENSE_CATEGORIES.reduce((sum, category) => sum + totals[category.id], 0);
  const largest = Math.max(...EXPENSE_CATEGORIES.map((category) => totals[category.id]), 0);

  return (
    <section aria-labelledby="breakdown-heading" className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="breakdown-heading" className="text-lg font-semibold text-ink">
          Spending breakdown
        </h2>
        <p className="text-sm font-semibold text-ink tabular-nums">{formatRupees(grandTotal)}</p>
      </div>

      {categorized === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">Sort a few transactions to see where your money goes.</p>
      ) : (
        <ul className="mt-5 space-y-4" aria-label="Spending by category">
          {EXPENSE_CATEGORIES.map((category) => {
            const amount = totals[category.id];
            const share = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
            const width = largest > 0 ? (amount / largest) * 100 : 0;
            return (
              <li key={category.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />
                    {category.label}
                  </span>
                  <span className="text-ink-muted tabular-nums">
                    {formatRupees(amount)} <span className="text-xs">({share}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper-deep">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${width}%`, backgroundColor: category.color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
