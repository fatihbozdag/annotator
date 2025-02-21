import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="w-full max-w-4xl mx-auto mt-4">
          <AlertDescription>
            Something went wrong. Please try refreshing the page.
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-2 text-xs">
                {this.state.error?.message}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 