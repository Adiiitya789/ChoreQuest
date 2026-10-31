import { Coins, Flame } from 'lucide-react';
import { levelProgress } from '@/lib/xp';
import { useGame } from '@/state/useGame';

export function Hud() {
  const { state } = useGame();
  const { level, percent, xpIntoLevel, xpForNext } = levelProgress(state.xp);

  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-600 bg-primary-50 font-display text-base text-primary-600 shadow-card text-glow"
          aria-label={`Level ${level}`}
        >
          {level}
        </div>
        <div className="hidden w-36 sm:block">
          <div className="flex items-baseline justify-between text-xs font-medium text-ink-muted">
            <span>Level {level}</span>
            <span className="tabular-nums">
              {xpIntoLevel}/{xpForNext} XP
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progress to next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-deep"
          >
            <div
              className="h-full rounded-full bg-primary-500 transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink tabular-nums"
        title="Coins"
      >
        <Coins className="h-4 w-4 text-primary-500" aria-hidden="true" />
        <span>{state.coins}</span>
        <span className="sr-only">coins</span>
      </div>

      <div
        className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink tabular-nums"
        title="Daily streak"
      >
        <Flame className="h-4 w-4 text-danger-500" aria-hidden="true" />
        <span>{state.streak}</span>
        <span className="sr-only">day streak</span>
      </div>
    </div>
  );
}
