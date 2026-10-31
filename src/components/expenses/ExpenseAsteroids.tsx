import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Pause, Play, Rocket, RotateCcw, Shield, Sparkles } from 'lucide-react';
import { AsteroidGame, MAX_SHIELDS, initialStats, type GameStats } from '@/components/expenses/asteroidGame';
import { EXPENSE_CATEGORIES, categoryLabel, formatRupees } from '@/lib/expenses';
import { EXPENSE_REWARD } from '@/lib/xp';
import { useGame } from '@/state/useGame';
import type { ExpenseCategory } from '@/types';

type Phase = 'ready' | 'playing' | 'paused' | 'over' | 'clear';

export function ExpenseAsteroids() {
  const { state, dispatch, playSound, pushReward } = useGame();
  const [phase, setPhase] = useState<Phase>('ready');
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [announcement, setAnnouncement] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<AsteroidGame | null>(null);

  const toSort = useMemo(
    () =>
      state.expenses
        .filter((expense) => expense.category === null)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.expenses],
  );

  // The queue can empty or refill outside the game (e.g. importing a statement).
  const view: Phase =
    phase === 'ready' && toSort.length === 0
      ? 'clear'
      : phase === 'clear' && toSort.length > 0
        ? 'ready'
        : phase;

  // The game loop reads these through refs so it never needs to restart.
  const toSortRef = useRef(toSort);
  const viewRef = useRef(view);
  const playSoundRef = useRef(playSound);
  useEffect(() => {
    toSortRef.current = toSort;
    viewRef.current = view;
    playSoundRef.current = playSound;
  }, [toSort, view, playSound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !field || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const game = new AsteroidGame(
      {
        candidates: () => toSortRef.current,
        onSpawn: (expense, suggested) => {
          const hint = suggested ? ` Looks like ${categoryLabel(suggested)}.` : '';
          setAnnouncement(`Incoming: ${expense.merchant}, ${formatRupees(expense.amount)}.${hint}`);
        },
        onHit: (expense, category) => {
          dispatch({ type: 'CATEGORIZE_EXPENSE', id: expense.id, category, at: new Date().toISOString() });
          pushReward({
            label: `Filed under ${categoryLabel(category)}`,
            xp: EXPENSE_REWARD.xp,
            coins: EXPENSE_REWARD.coins,
          });
          playSoundRef.current('explode');
          setAnnouncement(`${expense.merchant} filed under ${categoryLabel(category)}.`);
        },
        onMiss: (expense) => {
          playSoundRef.current('impact');
          setAnnouncement(`${expense.merchant} hit the shield. It will come around again.`);
        },
        onStats: (next) => {
          setStats(next);
          if (next.shields <= 0) {
            setPhase('over');
            playSoundRef.current('gameOver');
          }
        },
        onClear: () => {
          setPhase('clear');
          playSoundRef.current('bossDefeated');
        },
      },
      reduceMotion,
    );
    gameRef.current = game;

    const resize = () => {
      const width = field.clientWidth;
      const height = field.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      game.resize(width, height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(field);

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt, viewRef.current === 'playing');
      game.draw(ctx);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gameRef.current = null;
    };
  }, [dispatch, pushReward]);

  const launch = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    if (view === 'paused') {
      setPhase('playing');
      return;
    }
    if (toSortRef.current.length === 0) return;
    game.reset();
    setPhase('playing');
    playSound('combo');
  }, [view, playSound]);

  const fire = useCallback(
    (category: ExpenseCategory) => {
      if (viewRef.current !== 'playing') return;
      gameRef.current?.fire(category);
      playSound('laser');
    },
    [playSound],
  );

  const togglePause = useCallback(() => {
    if (view === 'playing') setPhase('paused');
    else if (view === 'paused') setPhase('playing');
  }, [view]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      const category = EXPENSE_CATEGORIES.find((item) => item.key === event.key);
      if (category) {
        if (view === 'playing') {
          event.preventDefault();
          fire(category.id);
        }
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        // A focused button already handles Space/Enter as a click.
        if (target?.closest('button, a')) return;
        if (view === 'ready' || view === 'paused' || view === 'over') {
          event.preventDefault();
          launch();
        }
      } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        togglePause();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, fire, launch, togglePause]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden && viewRef.current === 'playing') setPhase('paused');
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <section aria-labelledby="asteroids-heading" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div>
          <h2 id="asteroids-heading" className="text-lg uppercase tracking-widest text-primary-600 text-glow">
            Expense Asteroids
          </h2>
          <p className="text-xs text-ink-muted tabular-nums">{toSort.length} {toSort.length === 1 ? 'payment' : 'payments'} left to file</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1" aria-label={`${stats.shields} of ${MAX_SHIELDS} shields left`}>
            {Array.from({ length: MAX_SHIELDS }, (_, i) => (
              <Shield
                key={i}
                aria-hidden="true"
                className={`h-5 w-5 transition ${i < stats.shields ? 'fill-primary-600/30 text-primary-600' : 'text-ink-subtle/40'}`}
              />
            ))}
          </div>
          <StatChip label="Best" value={stats.bestCombo} />
          <StatChip label="Combo" value={stats.combo} highlight={stats.combo >= 3} />
          <button
            type="button"
            onClick={togglePause}
            disabled={view !== 'playing' && view !== 'paused'}
            aria-label={view === 'paused' ? 'Resume game' : 'Pause game'}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink transition hover:border-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {view === 'paused' ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div ref={fieldRef} className="relative h-[440px] select-none bg-[#010A03] sm:h-[520px]">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />

        {view !== 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#010502]/70 px-6 backdrop-blur-[2px]">
            <div className="max-w-md text-center">
              {view === 'ready' && (
                <Overlay
                  icon={<Rocket className="h-7 w-7" aria-hidden="true" />}
                  title="Expense Asteroids"
                  body={
                    <>
                      Every asteroid is a payment. Fire the matching cannon with keys{' '}
                      <Kbd>1</Kbd>–<Kbd>5</Kbd> to break it and file it in that category. Let one reach the
                      ground and you lose a shield.
                    </>
                  }
                  meta={`${toSort.length} asteroids incoming`}
                  action="Launch"
                  actionIcon={<Rocket className="h-4 w-4" aria-hidden="true" />}
                  onAction={launch}
                />
              )}
              {view === 'paused' && (
                <Overlay
                  icon={<Pause className="h-7 w-7" aria-hidden="true" />}
                  title="Paused"
                  body="Take a breather. The asteroid will wait."
                  action="Resume"
                  actionIcon={<Play className="h-4 w-4" aria-hidden="true" />}
                  onAction={launch}
                />
              )}
              {view === 'over' && (
                <Overlay
                  icon={<Shield className="h-7 w-7" aria-hidden="true" />}
                  title="Shields down"
                  body={`You filed ${stats.filed} payment${stats.filed === 1 ? '' : 's'} this run with a best combo of ${stats.bestCombo}. Missed payments stay in the queue, so nothing is lost.`}
                  action="Relaunch"
                  actionIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                  onAction={launch}
                  danger
                />
              )}
              {view === 'clear' && (
                <Overlay
                  icon={<Sparkles className="h-7 w-7" aria-hidden="true" />}
                  title="Sector clear"
                  body={
                    stats.filed > 0
                      ? `All payments filed. You cleared ${stats.filed} this run with a best combo of ${stats.bestCombo}. Load a demo wave or upload a statement below to keep going.`
                      : 'Every payment is filed. Load a demo wave or upload a statement below to spawn more asteroids.'
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1.5 border-t border-line p-3 sm:gap-2 sm:p-4">
        {EXPENSE_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => fire(category.id)}
            disabled={view !== 'playing'}
            className="focus-ring flex flex-col items-center gap-0.5 rounded-xl border border-line bg-paper px-1 py-2.5 text-xs font-semibold text-ink transition hover:border-[var(--cat)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            style={{ '--cat': category.color } as CSSProperties}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />
              {category.label}
            </span>
            <span className="font-mono text-[11px] font-medium text-ink-muted">Key {category.key}</span>
          </button>
        ))}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

function StatChip({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition ${
        highlight ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-line bg-paper text-ink'
      }`}
    >
      <span className="text-ink-muted">{label}</span> {value}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-primary-500/50 bg-primary-50 px-1.5 py-0.5 font-mono text-xs text-primary-700">{children}</kbd>
  );
}

interface OverlayProps {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  meta?: string;
  action?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  danger?: boolean;
}

function Overlay({ icon, title, body, meta, action, actionIcon, onAction, danger = false }: OverlayProps) {
  return (
    <>
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
          danger ? 'bg-danger-500/15 text-danger-500' : 'bg-primary-600/15 text-primary-600'
        }`}
      >
        {icon}
      </div>
      <p className="mt-4 font-display text-3xl uppercase tracking-widest text-primary-600 text-glow">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink">{body}</p>
      {meta && <p className="mt-3 text-xs font-medium uppercase tracking-wider text-primary-700/80">{meta}</p>}
      {action && onAction && (
        <>
          <button
            type="button"
            onClick={onAction}
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-paper shadow-lift transition hover:bg-primary-700"
          >
            {actionIcon}
            {action}
          </button>
          <p className="mt-2 text-xs text-ink-muted">or press Space</p>
        </>
      )}
    </>
  );
}
