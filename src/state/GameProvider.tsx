import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { playSfx, type SfxKind } from '@/lib/sound';
import { createStarterState } from '@/lib/sampleData';
import { levelFromXp } from '@/lib/xp';
import { loadLocal, loadProgress, saveProgress, type SaveTarget } from '@/services/progressStore';
import { GameContext, type GameContextValue } from '@/state/GameContext';
import { gameReducer } from '@/state/gameReducer';
import type { RewardPopup } from '@/types';

const SAVE_DEBOUNCE_MS = 800;
const MUTE_KEY = 'chorequest_muted';

type LoadStatus = 'loading' | 'ready' | 'error';

// Remount (via `key`) when the target changes, e.g. on sign-in or sign-out.
export function GameProvider({ target, children }: { target: SaveTarget; children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createStarterState);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [muted, setMuted] = useState(() => window.localStorage.getItem(MUTE_KEY) === 'true');
  const [rewards, setRewards] = useState<RewardPopup[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadProgress(target)
      .then((saved) => {
        if (cancelled) return;
        // First sign-in: no cloud save yet, so carry over this browser's guest progress.
        // The save effect then uploads it once status is ready.
        const initial = saved ?? (target.kind === 'cloud' ? loadLocal() : null);
        if (initial) dispatch({ type: 'HYDRATE', state: initial });
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Unknown error');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setTimeout(() => {
      saveProgress(target, state)
        .then(() => setSaveFailed(false))
        .catch(() => setSaveFailed(true));
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, status, target]);

  const levelRef = useRef<number | null>(null);
  useEffect(() => {
    if (status !== 'ready') return;
    const level = levelFromXp(state.xp);
    if (levelRef.current !== null && level > levelRef.current) {
      playSfx('levelUp', !muted);
    }
    levelRef.current = level;
  }, [state.xp, status, muted]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      window.localStorage.setItem(MUTE_KEY, String(!current));
      return !current;
    });
  }, []);

  const playSound = useCallback((kind: SfxKind) => playSfx(kind, !muted), [muted]);

  const pushReward = useCallback((reward: Omit<RewardPopup, 'id'>) => {
    setRewards((current) => [...current, { ...reward, id: crypto.randomUUID() }]);
  }, []);

  const dismissReward = useCallback((id: string) => {
    setRewards((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      muted,
      toggleMuted,
      playSound,
      rewards,
      pushReward,
      dismissReward,
      saveFailed,
    }),
    [state, muted, toggleMuted, playSound, rewards, pushReward, dismissReward, saveFailed],
  );

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink-muted">
        <p className="text-sm font-medium">Loading your quest log...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div role="alert" className="max-w-md rounded-2xl border border-danger-200 bg-surface p-8 text-center shadow-card">
          <h1 className="text-xl font-semibold text-ink">We could not load your progress</h1>
          <p className="mt-3 text-sm text-ink-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="focus-ring mt-6 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
