import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { buildExport, downloadJson } from '../lib/export';

interface State {
  error: Error | null;
}

/**
 * A render crash used to leave a blank page with no way to reach Export or
 * Clear data. This keeps the recovery actions reachable.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack);
  }

  private exportData = () => {
    const state = useAppStore.getState();
    downloadJson(
      'workout-backup.json',
      buildExport({
        program: state.program,
        sessions: state.sessions,
        settings: state.settings,
        meta: state.meta,
        progression: state.progression,
      }),
    );
  };

  private clearData = () => {
    useAppStore.getState().clearAll();
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-dvh bg-bg px-5 py-10">
        <div className="mx-auto max-w-160 rounded-md border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle size={18} strokeWidth={1.5} />
            <h1 className="text-h3">Something broke while drawing this screen</h1>
          </div>
          <p className="mt-3 text-body-sm text-text-secondary">
            Your stored data is still there. Export it before trying anything else.
          </p>
          <pre className="mt-3 max-h-40 overflow-auto rounded-sm border border-border bg-surface-2 p-3 text-[12px] text-text-muted">
            {error.message}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.exportData}
              className="h-11 rounded-sm bg-accent px-4 text-[13px] font-medium text-accent-fg hover:bg-accent-hover cursor-pointer"
            >
              Export data
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 rounded-sm border border-border px-4 text-[13px] font-medium text-text hover:border-border-strong cursor-pointer"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.clearData}
              className="h-11 rounded-sm border border-border px-4 text-[13px] font-medium text-danger hover:border-border-strong cursor-pointer"
            >
              Clear data and reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
