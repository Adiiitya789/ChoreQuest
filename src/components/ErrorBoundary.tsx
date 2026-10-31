import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render errors so one broken screen shows a recovery message instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ChoreQuest crashed while rendering.', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center text-ink">
        <p className="font-display text-2xl tracking-widest text-primary-600 text-glow">SYSTEM FAILURE</p>
        <p className="max-w-md text-sm text-ink-muted">
          Something went wrong on this screen. Your progress is saved, so reloading is safe.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="focus-ring rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-700"
        >
          Reload
        </button>
      </div>
    );
  }
}
