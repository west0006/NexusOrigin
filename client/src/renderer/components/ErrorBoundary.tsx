import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--color-error)', marginBottom: 16 }}>页面发生未知错误</h2>
                    <p style={{ color: 'var(--color-ink-muted)', marginBottom: 24 }}>{this.state.error?.message}</p>
                    <button className="button button-primary" onClick={() => this.setState({ hasError: false })}>
                        重试
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}