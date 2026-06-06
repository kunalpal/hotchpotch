'use client';

import React, { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ActionErrorBoundaryProps {
  /** The content to render when no error has occurred */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ActionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ActionErrorBoundary catches errors in its child component tree and displays
 * a user-friendly error message with a retry mechanism.
 *
 * @example
 * ```tsx
 * <ActionErrorBoundary
 *   onError={(error) => logError(error)}
 *   fallback={<CustomErrorUI />}
 * >
 *   <ComponentThatMightError />
 * </ActionErrorBoundary>
 * ```
 */
export class ActionErrorBoundary extends Component<
  ActionErrorBoundaryProps,
  ActionErrorBoundaryState
> {
  constructor(props: ActionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ActionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('ActionErrorBoundary caught error:', error);
    console.error('Error info:', errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="text-destructive mb-4 h-10 w-10" />
          <h3 className="mb-2 text-lg font-medium">Something went wrong</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ActionErrorBoundary;
