import React from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
    const { isAuthenticated, login, logout, claims, roles, remainingSeconds, isReady, discoveryError, retryDiscovery } = useAuth();

    return (
        <div style={{ padding: 24, maxWidth: 800 }}>
            <h1>OIDC React SPA</h1>

            {!isAuthenticated ? (
                <>
                    <p>You are logged out.</p>

                    {!isReady && !discoveryError && <p>Initializing OIDC…</p>}
                    {discoveryError && (
                        <div style={{ background: '#fee', padding: 12, margin: '12px 0' }}>
                            <b>OIDC discovery error:</b> {discoveryError}
                            <div style={{ marginTop: 8 }}>
                                <button onClick={retryDiscovery}>Retry discovery</button>
                            </div>
                            <p style={{ marginTop: 8, color: '#666' }}>
                                Check your <code>.env</code> values:
                                <br />
                                <code>VITE_OIDC_ISSUER</code> or <code>VITE_OIDC_OPENID_CONFIG</code>
                            </p>
                        </div>
                    )}

                    <button onClick={() => login()} style={{ padding: '8px 12px' }} disabled={!!discoveryError}>
                        Login with OIDC
                    </button>
                </>
            ) : (
                <>
                    <p>
                        You are logged in. Go to <Link to="/app">Todos</Link>
                    </p>
                    <button onClick={() => logout()} style={{ padding: '8px 12px' }}>
                        Logout
                    </button>

                    <h3 style={{ marginTop: 24 }}>Token & Claims</h3>
                    <ul>
                        <li>
                            <b>sub:</b> {claims?.sub}
                        </li>
                        {claims?.email && (
                            <li>
                                <b>email:</b> {claims.email}
                            </li>
                        )}
                        <li>
                            <b>expires in:</b> {remainingSeconds ?? 0}s
                        </li>
                        <li>
                            <b>roles:</b> {roles.join(', ') || '(none)'}
                        </li>
                    </ul>
                </>
            )}
        </div>
    );
};
