import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/state/useAuth';

export function AccountButton() {
  const { configured, user, error, signInWithGoogle, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!configured) return null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={() => run(signInWithGoogle)}
          disabled={busy}
          className="focus-ring flex h-10 items-center gap-2 rounded-xl border border-primary-600 bg-primary-50 px-3 text-sm font-semibold text-primary-600 transition hover:bg-primary-100 disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sign in with Google</span>
          <span className="sm:hidden">Sign in</span>
        </button>
        {error && (
          <p role="alert" className="mt-1 max-w-[16rem] text-right text-xs text-danger-500">
            {error}
          </p>
        )}
      </div>
    );
  }

  const name = user.displayName ?? user.email ?? 'Player';
  return (
    <div className="flex items-center gap-2">
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          referrerPolicy="no-referrer"
          className="h-10 w-10 rounded-xl border border-primary-600 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-600 bg-primary-50 font-display text-primary-600">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <button
        type="button"
        onClick={() => run(signOut)}
        disabled={busy}
        aria-label={`Sign out ${name}`}
        title={`Signed in as ${name}. Sign out`}
        className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-primary-500 hover:text-primary-700 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
