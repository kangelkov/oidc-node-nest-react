import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { discover, beginAuth, handleCallback, refreshTokens, buildRpLogoutUrl, TokenSet } from './oidc';
import { useLocation, useNavigate } from 'react-router-dom';

type DiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error';

type AuthContext = {
    isAuthenticated: boolean;
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    claims?: Record<string, any>;
    roles: string[];
    remainingSeconds?: number;

    login: () => Promise<void>;
    logout: () => Promise<void>;
    fetchWithAuth: typeof fetch;

    isReady: boolean;
    discoveryError?: string | null;
    retryDiscovery: () => Promise<void>;
};

const Ctx = createContext<AuthContext>(null as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [server, setServer] = useState<any>();
    const [discoveryStatus, setDiscoveryStatus] = useState<DiscoveryStatus>('idle');
    const [discoveryError, setDiscoveryError] = useState<string | null>(null);

    const [tokenSet, setTokenSet] = useState<TokenSet | undefined>(undefined);
    const [claims, setClaims] = useState<Record<string, any> | undefined>(undefined);
    const [roles, setRoles] = useState<string[]>([]);
    const [remaining, setRemaining] = useState<number | undefined>(undefined);

    const navigate = useNavigate();
    const location = useLocation();
    const refreshTimer = useRef<number | undefined>(undefined);

    const doDiscover = useCallback(async () => {
        setDiscoveryStatus('loading');
        setDiscoveryError(null);
        try {
            const issuer = import.meta.env.VITE_OIDC_ISSUER as string | undefined;
            const openidConfig = import.meta.env.VITE_OIDC_OPENID_CONFIG as string | undefined;
            if (!issuer && !openidConfig) {
                throw new Error('Missing VITE_OIDC_ISSUER or VITE_OIDC_OPENID_CONFIG in .env');
            }

            const s = await discover();
            setServer(s);
            setDiscoveryStatus('ready');
            setDiscoveryError(null);
            return s;
        } catch (e: any) {
            console.error('OIDC discovery failed:', e);
            setDiscoveryStatus('error');
            setDiscoveryError(e?.message ?? 'Discovery failed');
            return undefined;
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const s = await doDiscover();
            if (!mounted) return;
            if (!s) {
            }
        })();
        return () => { mounted = false; };
    }, [doDiscover]);

    useEffect(() => {
        const iv = window.setInterval(() => {
            if (tokenSet?.expires_at) {
                setRemaining(Math.max(0, tokenSet.expires_at - Math.floor(Date.now() / 1000)));
            } else {
                setRemaining(undefined);
            }
        }, 1000);
        return () => window.clearInterval(iv);
    }, [tokenSet?.expires_at]);

    useEffect(() => {
        if (!server || !tokenSet) return;
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);

        const now = Math.floor(Date.now() / 1000);
        const delaySec = Math.max(5, (tokenSet.expires_at - now) - 30);
        refreshTimer.current = window.setTimeout(async () => {
            try {
                if (tokenSet.refresh_token) {
                    const next = await refreshTokens(server, tokenSet.refresh_token);
                    setTokenSet(next);
                    decodeTokens(next);
                } else {
                    await login();
                }
            } catch (e) {
                console.error('Token renewal failed:', e);
                setTokenSet(undefined);
                setClaims(undefined);
                setRoles([]);
            }
        }, delaySec * 1000) as unknown as number;

        return () => {
            if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [server, tokenSet?.access_token, tokenSet?.refresh_token, tokenSet?.expires_at]);

    const decodeJwt = (t: string) => {
        const parts = t.split('.');
        const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodeURIComponent(escape(json)));
    };

    const decodeTokens = (ts: TokenSet) => {
        const idc = ts.id_token ? decodeJwt(ts.id_token) : undefined;
        const acc = decodeJwt(ts.access_token);
        setClaims(idc ?? acc);
        const realm = acc?.realm_access?.roles ?? [];
        const resRoles = acc?.resource_access
            ? Object.values(acc.resource_access).flatMap((r: any) => r.roles ?? [])
            : [];
        const all = Array.from(new Set([...(realm || []), ...resRoles]));
        setRoles(all);
    };

    const login = useCallback(async () => {
        console.log('Login clicked!!!!');
        let s = server;
        if (!s) {
            console.log('Server not ready; attempting discovery now…');
            s = await doDiscover();
            if (!s) {
                console.warn('Discovery failed, cannot start login.');
                return;
            }
        }
        console.log('Starting login flow');
        await beginAuth(s);
    }, [server, doDiscover]);

    const logout = useCallback(async () => {
        if (!tokenSet?.id_token || !server) {
            setTokenSet(undefined);
            setClaims(undefined);
            setRoles([]);
            navigate('/');
            return;
        }
        const url = await buildRpLogoutUrl(server, tokenSet.id_token);
        setTokenSet(undefined);
        setClaims(undefined);
        setRoles([]);
        window.location.assign(url);
    }, [server, tokenSet?.id_token, navigate]);

    useEffect(() => {
        if (!server) return;
        if (location.pathname !== '/callback') return;
        (async () => {
            try {
                const ts = await handleCallback(server);
                setTokenSet(ts);
                decodeTokens(ts);
                navigate('/app', { replace: true });
            } catch (e) {
                console.error('Callback handling failed:', e);
                navigate('/', { replace: true });
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [server, location.pathname]);

    const fetchWithAuth: typeof fetch = useCallback(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            if (!tokenSet?.access_token) throw new Error('not_authenticated');
            const headers = new Headers(init?.headers || {});
            headers.set('Authorization', `Bearer ${tokenSet.access_token}`);
            headers.set('Content-Type', 'application/json');
            const res = await fetch(input, { ...init, headers });
            if (res.status === 401) {
                setTokenSet(undefined);
                setClaims(undefined);
                setRoles([]);
            }
            return res;
        },
        [tokenSet?.access_token]
    );

    const retryDiscovery = useCallback(async () => {
        await doDiscover();
    }, [doDiscover]);

    const ctx: AuthContext = useMemo(
        () => ({
            isAuthenticated: !!tokenSet?.access_token,
            accessToken: tokenSet?.access_token,
            idToken: tokenSet?.id_token,
            refreshToken: tokenSet?.refresh_token,
            expiresAt: tokenSet?.expires_at,
            login,
            logout,
            claims,
            roles,
            remainingSeconds: remaining,
            fetchWithAuth,
            isReady: discoveryStatus === 'ready',
            discoveryError,
            retryDiscovery
        }),
        [tokenSet, login, logout, claims, roles, remaining, fetchWithAuth, discoveryStatus, discoveryError, retryDiscovery]
    );

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);

export const Callback: React.FC = () => {
    return <div style={{ padding: 24 }}>Completing sign-in…</div>;
};
