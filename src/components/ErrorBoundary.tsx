import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackTitle?: string },
  State
> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-6 text-center my-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 mb-3">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {this.props.fallbackTitle || 'Section temporarily unavailable'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
