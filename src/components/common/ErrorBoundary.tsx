import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl p-6">
          <h2 className="font-heading text-2xl text-destructive">Něco se pokazilo</h2>
          <pre className="mt-3 overflow-auto rounded bg-muted p-3 text-xs">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
