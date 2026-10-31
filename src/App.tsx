import { lazy, Suspense, useMemo, useState } from 'react';
import { Layout, type PageId } from '@/components/Layout';
import { AuthProvider } from '@/state/AuthProvider';
import { GameProvider } from '@/state/GameProvider';
import { useAuth } from '@/state/useAuth';
import type { SaveTarget } from '@/services/progressStore';

// Each page is its own chunk, so the first load only pulls in the dashboard.
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Expenses = lazy(() => import('@/pages/Expenses').then((m) => ({ default: m.Expenses })));
const InboxSort = lazy(() => import('@/pages/InboxSort').then((m) => ({ default: m.InboxSort })));
const QuestBoard = lazy(() => import('@/pages/QuestBoard').then((m) => ({ default: m.QuestBoard })));

function PageFallback() {
  return (
    <p role="status" className="text-sm text-ink-muted">
      {'>'} loading module<span className="animate-pulse">_</span>
    </p>
  );
}

function ChoreQuest() {
  const [page, setPage] = useState<PageId>('dashboard');

  return (
    <Layout page={page} onNavigate={setPage}>
      <Suspense fallback={<PageFallback />}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'expenses' && <Expenses />}
        {page === 'inbox' && <InboxSort />}
        {page === 'quests' && <QuestBoard />}
      </Suspense>
    </Layout>
  );
}

function SavedGame() {
  const { ready, user } = useAuth();
  const uid = user?.uid ?? null;
  const target = useMemo<SaveTarget>(() => (uid ? { kind: 'cloud', uid } : { kind: 'local' }), [uid]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink-muted">
        <p className="text-sm font-medium">{'>'} connecting...</p>
      </div>
    );
  }

  return (
    <GameProvider key={uid ?? 'guest'} target={target}>
      <ChoreQuest />
    </GameProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <SavedGame />
    </AuthProvider>
  );
}

export default App;
