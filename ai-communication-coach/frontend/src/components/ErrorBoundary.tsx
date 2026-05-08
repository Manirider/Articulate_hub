'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack ?? undefined });
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-8 max-w-lg w-full text-center">
            <div className="flex justify-center mb-4">
              <div 
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(244, 63, 94, 0.1)' }}
              >
                <AlertCircle className="h-8 w-8" style={{ color: 'var(--accent-rose)' }} />
              </div>
            </div>
            
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
              Something went wrong
            </h1>
            
            <p className="text-sm mb-6" style={{ color: 'var(--ink-secondary)' }}>
              We apologize for the inconvenience. The error has been logged and our team will investigate.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div 
                className="rounded-xl p-4 mb-6 text-left overflow-auto max-h-48"
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              >
                <p style={{ color: 'var(--accent-rose)' }}>{this.state.error.message}</p>
                {this.state.errorInfo && (
                  <pre style={{ color: 'var(--ink-muted)', marginTop: '8px' }}>
                    {this.state.errorInfo}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
                  color: 'var(--ink)',
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 rounded-xl font-medium transition-all hover:scale-105"
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--ink-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
