import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebase } from '@/lib/firebase';
import { isGameState } from '@/lib/xp';
import type { GameState } from '@/types';

const LOCAL_PROGRESS_KEY = 'chorequest_progress';

/** Guests save to this browser; signed-in players save to Firestore at users/{uid}. */
export type SaveTarget = { kind: 'local' } | { kind: 'cloud'; uid: string };

function normalize(state: unknown): GameState {
  if (!isGameState(state)) throw new Error('Saved progress has an unexpected format.');
  return {
    ...state,
    lastActiveDay: typeof state.lastActiveDay === 'string' ? state.lastActiveDay : null,
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    lastEmailAction: state.lastEmailAction ?? null,
    // Saves from before daily tracking existed start with an empty history.
    history: state.history && typeof state.history === 'object' ? state.history : {},
  };
}

export function loadLocal(): GameState | null {
  const raw = window.localStorage.getItem(LOCAL_PROGRESS_KEY);
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    // A corrupt local save should not lock the player out; start fresh instead.
    window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
    return null;
  }
}

function userDoc(uid: string) {
  if (!firebase) throw new Error('Firebase is not configured.');
  return doc(firebase.db, 'users', uid);
}

export async function loadProgress(target: SaveTarget): Promise<GameState | null> {
  if (target.kind === 'local') return loadLocal();
  const snapshot = await getDoc(userDoc(target.uid));
  if (!snapshot.exists()) return null;
  return normalize(snapshot.data().state);
}

export async function saveProgress(target: SaveTarget, state: GameState): Promise<void> {
  if (target.kind === 'local') {
    window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(state));
    return;
  }
  await setDoc(userDoc(target.uid), { state, updatedAt: serverTimestamp() });
}
