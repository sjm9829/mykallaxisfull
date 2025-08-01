"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // 사용자 정의 에러 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 에러 로깅 (실제 서비스에서는 에러 리포팅 서비스로 전송)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // 여기서 실제 에러 리포팅 서비스(Sentry, LogRocket 등)로 전송할 수 있습니다
    console.log('Error logged:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // 사용자 정의 fallback UI가 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
          <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
              앗, 문제가 발생했습니다!
            </h1>

            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로 돌아가 보세요.
            </p>

            {/* 개발 환경에서만 에러 세부 정보 표시 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 p-3 bg-gray-100 dark:bg-zinc-700 rounded text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                  에러 세부 정보 (개발 모드)
                </summary>
                <div className="mt-2 text-red-600 dark:text-red-400 font-mono text-xs whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <div className="mt-2 opacity-75">
                      {this.state.error.stack}
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </Button>

              <Button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                홈으로
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 특정 컴포넌트를 위한 간단한 에러 바운더리 HOC
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// 함수형 컴포넌트를 위한 훅
export function useErrorHandler() {
  return (error: Error, errorInfo?: Record<string, unknown>) => {
    console.error('Manual error report:', error, errorInfo);

    // 여기서 에러 리포팅 서비스로 전송
    if (typeof window !== 'undefined') {
      // 실제 구현에서는 에러 서비스 API 호출
      console.log('Error reported to service:', {
        error: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        additionalInfo: errorInfo,
      });
    }
  };
}
