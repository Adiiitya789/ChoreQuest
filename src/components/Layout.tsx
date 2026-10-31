import type { ReactNode } from 'react';
import { CloudOff, Inbox, LayoutDashboard, ReceiptText, ScrollText, Swords, Volume2, VolumeX } from 'lucide-react';
import { Hud } from '@/components/Hud';
import { MatrixBackdrop } from '@/components/MatrixBackdrop';
import { RewardLayer } from '@/components/RewardLayer';
import { AccountButton } from '@/components/AccountButton';
import { CoachChat } from '@/components/CoachChat';
import { useAuth } from '@/state/useAuth';
import { useGame } from '@/state/useGame';

export type PageId = 'dashboard' | 'inbox' | 'quests' | 'expenses';

const TABS: { id: PageId; label: string; icon: typeof Inbox }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'inbox', label: 'Inbox Sort', icon: Inbox },
  { id: 'quests', label: 'Quest Board', icon: ScrollText },
];

interface LayoutProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export function Layout({ page, onNavigate, children }: LayoutProps) {
  const { muted, toggleMuted, saveFailed } = useGame();
  const { configured, user } = useAuth();

  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to main content
      </a>
      <MatrixBackdrop />
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-600 bg-primary-50 text-primary-600 shadow-card">
              <Swords className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-lg leading-tight tracking-widest text-primary-600 text-glow">CHOREQUEST</p>
              <p className="text-xs leading-tight text-ink-muted">
                {user
                  ? `> ${user.displayName ?? user.email ?? 'player'} · synced to cloud`
                  : configured
                    ? '> guest · saved on this device'
                    : '> offline mode · saved on this device'}
              </p>
            </div>
          </div>

          <div className="order-3 flex w-full items-center justify-between gap-4 sm:order-none sm:w-auto sm:justify-end">
            <Hud />
            <button
              type="button"
              onClick={toggleMuted}
              aria-pressed={!muted}
              aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-primary-500 hover:text-primary-700"
            >
              {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            </button>
            <AccountButton />
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Main">
          <ul className="flex gap-2 pb-3">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = page === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`focus-ring flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-primary-600 text-paper shadow-card'
                        : 'text-ink-muted hover:bg-primary-50 hover:text-primary-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {saveFailed && (
        <div role="status" className="relative z-10 mx-auto mt-4 flex max-w-6xl items-center gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-2 text-sm text-warning-800">
            <CloudOff className="h-4 w-4" aria-hidden="true" />
            Progress could not be saved. It will retry after your next action.
          </div>
        </div>
      )}

      <main id="main" tabIndex={-1} className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <RewardLayer />
      <CoachChat />
      <div aria-hidden="true" className="crt-overlay pointer-events-none fixed inset-0 z-50 opacity-40" />
    </div>
  );
}
