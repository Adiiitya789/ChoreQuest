import { useMemo, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Flame,
  Inbox,
  Minus,
  ReceiptText,
  ScrollText,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { SOURCE_SERIES } from '@/components/dashboard/sourceSeries';
import { XpHistoryChart } from '@/components/dashboard/XpHistoryChart';
import { EXPENSE_CATEGORIES, formatRupees, totalsByCategory } from '@/lib/expenses';
import {
  bestDay,
  comparePeriods,
  firstTrackedDay,
  lastNDays,
  percentChange,
  totalXp,
  type PeriodComparison,
} from '@/lib/stats';
import { rankFor } from '@/lib/ranks';
import { levelProgress } from '@/lib/xp';
import { useGame } from '@/state/useGame';
import type { DayStats } from '@/types';

const METRICS: { label: string; value: (stats: DayStats) => number }[] = [
  { label: 'XP earned', value: totalXp },
  { label: 'Emails sorted', value: (s) => s.emails },
  { label: 'Quests done', value: (s) => s.quests },
  { label: 'Expenses filed', value: (s) => s.expenses },
  { label: 'Coins', value: (s) => s.coins },
];

const formatDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function Dashboard() {
  const { state } = useGame();
  const today = useMemo(() => new Date(), []);

  const progress = levelProgress(state.xp);
  const rank = rankFor(progress.level);
  const filed = state.expenses.filter((expense) => expense.category !== null);
  const openQuests = state.quests.filter((quest) => !quest.done).length;
  const spend = totalsByCategory(state.expenses);
  const topCategory = EXPENSE_CATEGORIES.reduce((top, category) => (spend[category.id] > spend[top.id] ? category : top));
  const totalSpend = filed.reduce((sum, expense) => sum + expense.amount, 0);

  const days = useMemo(() => lastNDays(state.history, 14, today), [state.history, today]);
  const periods = useMemo(() => comparePeriods(state.history, today), [state.history, today]);
  const trackedSince = firstTrackedDay(state.history);
  const best = bestDay(state.history);
  const todayStats = days[days.length - 1].stats;

  const sourceTotals = SOURCE_SERIES.map((series) => ({
    ...series,
    value: Object.values(state.history).reduce((sum, stats) => sum + stats[series.key], 0),
  }));
  const sourceSum = sourceTotals.reduce((sum, series) => sum + series.value, 0);

  return (
    <section aria-labelledby="dashboard-heading" className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 id="dashboard-heading" className="text-3xl uppercase leading-tight text-primary-600 text-glow sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {'>'} system status: every XP point, sorted email, filed payment and finished quest.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-primary-600 bg-primary-50 shadow-lift">
              <span className="text-[10px] uppercase tracking-widest text-ink-muted">Level</span>
              <span className="font-display text-4xl leading-none text-primary-600 text-glow">{progress.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-widest text-ink-muted">Rank</p>
              <p className="font-display text-2xl uppercase tracking-wider text-primary-700">{rank.current.title}</p>
              <div className="mt-3 flex items-baseline justify-between text-xs text-ink-muted tabular-nums">
                <span>{progress.xpIntoLevel} / {progress.xpForNext} XP</span>
                <span>{progress.xpForNext - progress.xpIntoLevel} to level {progress.level + 1}</span>
              </div>
              <div
                role="progressbar"
                aria-label="Progress to next level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.percent)}
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper-deep"
              >
                <div className="h-full rounded-full bg-primary-600 shadow-card" style={{ width: `${progress.percent}%` }} />
              </div>
              {rank.next && (
                <p className="mt-2 text-xs text-ink-subtle">
                  Next rank: <span className="text-ink-muted">{rank.next.title}</span> at level {rank.next.level}
                </p>
              )}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
            <MiniStat icon={Zap} label="Total XP" value={state.xp.toLocaleString('en-IN')} />
            <MiniStat icon={Coins} label="Coins" value={state.coins.toLocaleString('en-IN')} />
            <MiniStat icon={Flame} label="Day streak" value={String(state.streak)} />
          </dl>
        </Panel>

        <Panel title="Today">
          <dl className="grid grid-cols-2 gap-3">
            <MiniStat icon={Zap} label="XP today" value={String(totalXp(todayStats))} />
            <MiniStat icon={Inbox} label="Emails" value={String(todayStats.emails)} />
            <MiniStat icon={ScrollText} label="Quests" value={String(todayStats.quests)} />
            <MiniStat icon={ReceiptText} label="Expenses" value={String(todayStats.expenses)} />
          </dl>
          <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs text-ink-muted">
            <Trophy className="h-4 w-4 text-primary-600" aria-hidden="true" />
            {best ? (
              <span>
                Best day: <span className="text-ink">{best.xp} XP</span> on {formatDay(best.day)}
              </span>
            ) : (
              'Your best day will show up here.'
            )}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigStat icon={Inbox} label="Emails sorted" value={state.emailsSorted} />
        <BigStat icon={ScrollText} label="Quests completed" value={state.questsCompleted} hint={`${openQuests} still open`} />
        <BigStat icon={ReceiptText} label="Expenses filed" value={filed.length} hint={`${state.expenses.length - filed.length} waiting`} />
        <BigStat
          icon={Coins}
          label="Spend filed"
          value={formatRupees(totalSpend)}
          hint={totalSpend > 0 ? `Most on ${topCategory.label}` : undefined}
        />
      </div>

      <Panel title="XP per day" subtitle="Last 14 days, by where it came from">
        <XpHistoryChart days={days} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {periods.map((period) => (
          <ComparisonPanel key={period.label} period={period} />
        ))}
      </div>

      <Panel title="Where your XP comes from" subtitle={trackedSince ? `Since ${formatDay(trackedSince)}` : undefined}>
        {sourceSum === 0 ? (
          <p className="text-sm text-ink-muted">Earn some XP and the split between emails, quests and expenses shows here.</p>
        ) : (
          <>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {sourceTotals
                .filter((series) => series.value > 0)
                .map((series) => (
                  <div key={series.key} style={{ width: `${(series.value / sourceSum) * 100}%`, backgroundColor: series.color }} />
                ))}
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {sourceTotals.map((series) => (
                <li key={series.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} aria-hidden="true" />
                    {series.label}
                  </span>
                  <span className="tabular-nums text-ink">
                    {series.value} XP <span className="text-xs text-ink-subtle">({Math.round((series.value / sourceSum) * 100)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4 text-xs text-ink-subtle">
          Daily history started {trackedSince ? `on ${formatDay(trackedSince)}` : 'today'}. Lifetime totals above include
          everything from before then.
        </p>
      </Panel>
    </section>
  );
}

function Panel({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      {title && (
        <div className="mb-4">
          <h2 className="text-lg uppercase tracking-widest text-primary-700">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-muted">
        <Icon className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl leading-none text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function BigStat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted">
        <Icon className="h-4 w-4 text-primary-600" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 font-display text-3xl leading-none text-primary-700 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

function ComparisonPanel({ period }: { period: PeriodComparison }) {
  return (
    <Panel title={period.label === 'Week' ? 'This week vs last' : 'This month vs last'} subtitle={`${period.currentLabel} vs ${period.previousLabel.toLowerCase()}`}>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-ink-muted">
            <th className="pb-2 font-medium">Metric</th>
            <th className="pb-2 text-right font-medium">{period.currentLabel}</th>
            <th className="pb-2 text-right font-medium">{period.previousLabel}</th>
            <th className="pb-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {METRICS.map((metric) => {
            const current = metric.value(period.current);
            const previous = metric.value(period.previous);
            return (
              <tr key={metric.label} className="border-t border-line">
                <td className="py-2 text-ink-muted">{metric.label}</td>
                <td className="py-2 text-right text-ink">{current}</td>
                <td className="py-2 text-right text-ink-muted">{previous}</td>
                <td className="py-2 text-right">
                  <Change current={current} previous={previous} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function Change({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const percent = percentChange(current, previous);
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        same
      </span>
    );
  }
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-primary-600' : 'text-danger-500'}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {up ? '+' : ''}
      {diff}
      {percent !== null && <span className="font-normal text-ink-muted">({up ? '+' : ''}{percent}%)</span>}
      <span className="sr-only">{up ? 'more than' : 'less than'} before</span>
    </span>
  );
}
