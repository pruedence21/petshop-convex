"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component for graceful error handling
 * Catches JavaScript errors anywhere in the child component tree
 * 
 * @example
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * @example With custom fallback
 * <ErrorBoundary fallback={CustomErrorUI}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for development
    console.error("Error caught by boundary:", error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error!}
            reset={this.handleReset}
          />
        );
      }

      return <DefaultErrorFallback error={this.state.error!} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 * Displays error message with retry option
 */
function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Terjadi Kesalahan</CardTitle>
          </div>
          <CardDescription>
            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau hubungi
            administrator jika masalah berlanjut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm font-mono text-destructive">
              {error.message || "Unknown error occurred"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Coba Lagi
          </Button>
          <Button
            onClick={() => window.location.href = "/dashboard"}
            variant="default"
            className="w-full"
          >
            Kembali ke Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Error fallback for data fetching errors
 * Provides more context-specific error handling
 */
export function DataErrorFallback({
  error,
  reset,
  title = "Gagal Memuat Data",
}: {
  error: Error;
  reset: () => void;
  title?: string;
}) {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message || "Terjadi kesalahan saat memuat data. Silakan coba lagi."}
          </p>
        </div>
        <Button onClick={reset} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Muat Ulang
        </Button>
      </div>
    </div>
  );
}
