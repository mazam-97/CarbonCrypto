import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">Something went wrong!</h3>
          <p className="text-sm mt-2">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm">Show error details</summary>
            <pre className="text-xs mt-2 whitespace-pre-wrap bg-red-50 p-2 rounded">
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
