import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface AuthContextValue {
  /** False when Firebase env vars are missing; sign-in is then hidden. */
  configured: boolean;
  /** False until Firebase has restored any previous session. */
  ready: boolean;
  user: User | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
