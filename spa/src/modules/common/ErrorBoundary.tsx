import React from 'react';

type State = { hasError: boolean; error?: unknown };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: unknown): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary caught an error:', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    handleReload = () => {
        window.location.assign('/');
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
                    <h2>Something went wrong.</h2>
                    <p style={{ color: '#555' }}>
                        The app hit an unexpected error. You can try again or go back to the home screen.
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={this.handleRetry}>Try again</button>
                        <button onClick={this.handleReload}>Go to Home</button>
                    </div>
                    <details style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
                        <summary>Technical details</summary>
                        {String(this.state.error)}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}
