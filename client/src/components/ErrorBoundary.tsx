import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  public handleReset() {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message || "An unexpected runtime error occurred.";

      return (
        <div className="flex min-h-[300px] h-full w-full items-center justify-center bg-[#0a0a0c] p-6 text-zinc-100">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-left shadow-lg">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{this.props.fallbackTitle || "Application Render Error"}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-rose-300 break-words leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 text-xs font-medium text-zinc-100 border border-white/[0.08] transition-colors focus:outline-none focus:ring-1 focus:ring-white/20 active:scale-95"
              >
                <RotateCcw size={13} />
                <span>Reload View</span>
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
