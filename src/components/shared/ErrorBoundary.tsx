"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center"
          role="alert"
        >
          <div className="w-12 h-12 rounded-full bg-coral-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-coral-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {this.props.fallbackTitle || "오류가 발생했습니다"}
          </h3>
          <p className="text-sm text-slate-400 mb-2 max-w-md">
            {this.state.error?.message || "예기치 않은 오류가 발생했습니다. 다시 시도해 주세요."}
          </p>
          <p className="text-xs text-slate-600 mb-6">
            문제가 지속되면 페이지를 새로고침 해주세요
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm text-slate-300 hover:bg-surface-600 hover:text-white transition-colors duration-200 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
