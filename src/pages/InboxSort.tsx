import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, ArrowRight, Star, Undo2, type LucideIcon } from 'lucide-react';
import { InboxCardStack, type GhostCard } from '@/components/InboxCardStack';
import { COMBO_INTERVAL, emailActionXp } from '@/lib/xp';
import { useGame } from '@/state/useGame';
import type { GmailAction } from '@/types';

const COMBO_IDLE_MS = 8000;
const GHOST_MS = 320;

const ACTION_LABEL: Record<GmailAction, string> = {
  ARCHIVE: 'Archived',
  KEEP: 'Kept',
  STAR: 'Starred',
};

export function InboxSort() {
  const { state, dispatch, playSound, pushReward } = useGame();
  const [ghost, setGhost] = useState<GhostCard | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const ghostKey = useRef(0);

  const inboxEmpty = state.inbox.length === 0;
  const nextBonusIn = COMBO_INTERVAL - (state.combo % COMBO_INTERVAL);
  const comboPercent = ((state.combo % COMBO_INTERVAL) / COMBO_INTERVAL) * 100;

  const sort = useCallback(
    (action: GmailAction) => {
      const top = state.inbox[0];
      if (!top) return;

      const comboAfter = state.combo + 1;
      const xp = emailActionXp(comboAfter);
      const isBonus = comboAfter % COMBO_INTERVAL === 0;
      const isLastEmail = state.inbox.length === 1;

      dispatch({ type: 'SORT_EMAIL', emailId: top.id, action, at: new Date().toISOString() });
      ghostKey.current += 1;
      setGhost({ key: ghostKey.current, email: top, action });
      pushReward({
        label: isBonus ? `${comboAfter} in a row! Bonus` : ACTION_LABEL[action],
        xp,
        coins: 0,
      });
      playSound(isLastEmail ? 'bossDefeated' : isBonus ? 'combo' : 'swipe');
      setAnnouncement(
        isLastEmail
          ? 'Inbox zero. Boss defeated!'
          : `${ACTION_LABEL[action]}: ${top.subject}. Plus ${xp} XP.`,
      );
    },
    [state.inbox, state.combo, dispatch, pushReward, playSound],
  );

  const undo = useCallback(() => {
    const last = state.lastEmailAction;
    if (!last) return;
    dispatch({ type: 'UNDO_EMAIL' });
    pushReward({ label: 'Undone', xp: -last.xpGained, coins: -last.coinsGained });
    playSound('undo');
    setAnnouncement(`Undid ${last.email.subject}. Email is back on top.`);
  }, [state.lastEmailAction, dispatch, pushReward, playSound]);

  useEffect(() => {
    if (!ghost) return;
    const timer = window.setTimeout(() => setGhost(null), GHOST_MS);
    return () => window.clearTimeout(timer);
  }, [ghost]);

  useEffect(() => {
    if (state.combo === 0) return;
    const timer = window.setTimeout(() => dispatch({ type: 'BREAK_COMBO' }), COMBO_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [state.combo, dispatch]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          sort('ARCHIVE');
          break;
        case 'ArrowRight':
          event.preventDefault();
          sort('KEEP');
          break;
        case 'ArrowUp':
          event.preventDefault();
          sort('STAR');
          break;
        case 'z':
        case 'Z':
          undo();
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sort, undo]);

  return (
    <section aria-labelledby="inbox-sort-heading" className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 id="inbox-sort-heading" className="text-3xl uppercase leading-tight text-primary-600 text-glow sm:text-4xl">
          Inbox Sort
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Clear the inbox fast. Every decision earns XP and builds your combo.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card">
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="font-semibold text-ink tabular-nums">
            {state.combo > 0 ? `${state.combo} in a row` : 'Start a combo'}
          </p>
          <p className="text-ink-muted tabular-nums">
            {state.combo > 0 ? `${nextBonusIn} to bonus +10 XP` : `${state.inbox.length} emails left`}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Progress to next combo bonus"
          aria-valuemin={0}
          aria-valuemax={COMBO_INTERVAL}
          aria-valuenow={state.combo % COMBO_INTERVAL}
          className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 ease-out"
            style={{ width: `${comboPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-8">
        {inboxEmpty && !ghost ? (
          <div className="mx-auto flex h-[300px] max-w-xl flex-col items-center justify-center rounded-3xl border border-dashed border-primary-500 bg-surface px-8 text-center sm:h-[320px]">
            <p className="text-2xl font-semibold text-ink">Inbox Zero</p>
            <p className="mt-2 text-sm text-ink-muted">
              Boss defeated. You sorted {state.emailsSorted} emails in this run.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'REFILL_INBOX' })}
              className="focus-ring mt-6 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-700"
            >
              Start a new inbox
            </button>
          </div>
        ) : (
          <InboxCardStack emails={state.inbox} ghost={ghost} />
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionButton label="Archive" hint="Left arrow" disabled={inboxEmpty} onClick={() => sort('ARCHIVE')} tone="ink" icon={Archive} />
        <ActionButton label="Keep" hint="Right arrow" disabled={inboxEmpty} onClick={() => sort('KEEP')} tone="primary" icon={ArrowRight} />
        <ActionButton label="Star" hint="Up arrow" disabled={inboxEmpty} onClick={() => sort('STAR')} tone="secondary" icon={Star} />
        <ActionButton label="Undo" hint="Z key" disabled={!state.lastEmailAction} onClick={undo} tone="outline" icon={Undo2} />
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Keyboard: Left archives, Right keeps, Up stars, Z undoes the last decision.
      </p>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

interface ActionButtonProps {
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
  tone: 'ink' | 'primary' | 'secondary' | 'outline';
  icon: LucideIcon;
}

const TONE_CLASS: Record<ActionButtonProps['tone'], string> = {
  ink: 'border border-ink/70 bg-surface text-ink hover:border-primary-500 hover:text-primary-600',
  primary: 'bg-primary-500 text-paper hover:bg-primary-600',
  secondary: 'bg-secondary-300 text-paper hover:bg-secondary-200',
  outline: 'border border-line bg-surface text-ink hover:border-primary-500',
};

function ActionButton({ label, hint, disabled, onClick, tone, icon: Icon }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring flex flex-col items-center gap-1 rounded-2xl px-4 py-4 text-sm font-semibold shadow-card transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${TONE_CLASS[tone]}`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      <span className="text-xs font-medium opacity-75">{hint}</span>
    </button>
  );
}
