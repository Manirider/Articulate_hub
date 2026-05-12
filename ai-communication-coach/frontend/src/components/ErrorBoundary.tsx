'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  featureName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Production-grade Error Boundary for feature isolation.
 * Prevents cascading failures by containing errors within feature modules.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.featureName ? `: ${this.props.featureName}` : ''}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-2xl p-6 bg-rose-500/5 border border-rose-500/20 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-rose-500/10">
              <AlertCircle className="h-6 w-6 text-rose-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {this.props.featureName
              ? `${this.props.featureName} encountered an error`
              : 'Something went wrong'}
          </h3>
          <p className="text-sm text-white/50 mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
