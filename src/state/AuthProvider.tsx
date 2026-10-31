import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { firebase } from '@/lib/firebase';
import { AuthContext, type AuthContextValue } from '@/state/AuthContext';

const DISMISSED_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebase);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebase) return;
    return onAuthStateChanged(firebase.auth, (next) => {
      setUser(next);
      setReady(true);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!firebase) return;
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(firebase.auth, provider);
    } catch (caught) {
      const code = errorCode(caught);
      if (DISMISSED_ERRORS.has(code)) return;
      // Some mobile browsers block popups; a full-page redirect still works there.
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(firebase.auth, provider);
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (firebase) await firebaseSignOut(firebase.auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ configured: firebase !== null, ready, user, error, signInWithGoogle, signOut }),
    [ready, user, error, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
