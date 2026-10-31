import { StatementImport } from '@/components/expenses/StatementImport';
import { ExpenseAsteroids } from '@/components/expenses/ExpenseAsteroids';
import { SpendBreakdown } from '@/components/expenses/SpendBreakdown';

export function Expenses() {
  return (
    <section aria-labelledby="expenses-heading" className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 id="expenses-heading" className="text-3xl uppercase leading-tight text-primary-600 text-glow sm:text-4xl">
          Expense Bounty
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Shoot down each payment with the right category cannon to file it, earn XP and coins, and watch your
          spending take shape.
        </p>
      </div>

      <ExpenseAsteroids />

      <div className="grid gap-6 lg:grid-cols-2">
        <SpendBreakdown />
        <StatementImport />
      </div>
    </section>
  );
}
