import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React Error Boundary for the RNSIT Alumni Intelligence Dashboard.
 * Catches unexpected render/runtime exceptions and presents a clean, institutional
 * fallback UI without exposing stack traces or sensitive data to end users.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Uncaught runtime exception:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-8 space-y-6">
            <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900">
                Application Exception Encountered
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                An unexpected error occurred in the RNSIT Alumni Intelligence Portal.
                The system failed closed to protect session and data integrity.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono text-red-800">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              >
                <RefreshCw size={14} />
                Reload Application
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
              >
                <Home size={14} />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
