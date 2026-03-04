import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Digiiworks] Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="absolute inset-0 grid-overlay opacity-10" />
          <div className="relative z-10 mx-auto max-w-md px-6 text-center">
            <div className="glass-card p-10">
              <div className="mb-6 flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-purple opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-neon-purple" />
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-neon-purple">
                  System Maintenance
                </span>
              </div>

              <h1 className="mb-4 font-mono text-2xl font-bold text-foreground">
                Temporarily Offline
              </h1>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                Our systems are undergoing a scheduled update. All agents (Dex, Vantage, Pixel, Forge) will be back online shortly.
              </p>

              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="glow-blue rounded-lg bg-primary px-8 py-3 font-mono text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              >
                Retry Connection
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
