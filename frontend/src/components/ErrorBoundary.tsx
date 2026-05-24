import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children?: ReactNode; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorInfo: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#220000', color: '#ffaaaa', fontFamily: 'monospace' }}>
          <h2>React Pipeline Crash</h2>
          <p>{this.state.error?.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
