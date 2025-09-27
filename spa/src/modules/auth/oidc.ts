import * as oauth from 'oauth4webapi';

export type OIDCMetadata = oauth.AuthorizationServer;

const ISSUER = import.meta.env.VITE_OIDC_ISSUER as string | undefined;
const OPENID_CONFIG = (import.meta.env.VITE_OIDC_OPENID_CONFIG as string | undefined) || undefined;

const CLIENT_ID = import.meta.env.VITE_SPA_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_SPA_REDIRECT_URI as string;
const LOGOUT_REDIRECT_URI = import.meta.env.VITE_SPA_LOGOUT_REDIRECT_URI as string;
const REQUESTED_SCOPES = (import.meta.env.VITE_REQUESTED_SCOPES as string) || 'openid profile email';

const AUTHORIZATION_ENDPOINT = import.meta.env.VITE_OIDC_AUTHORIZATION_ENDPOINT as string | undefined;
const TOKEN_ENDPOINT = import.meta.env.VITE_OIDC_TOKEN_ENDPOINT as string | undefined;
const USERINFO_ENDPOINT = import.meta.env.VITE_OIDC_USERINFO_ENDPOINT as string | undefined;
const END_SESSION_ENDPOINT = import.meta.env.VITE_OIDC_END_SESSION_ENDPOINT as string | undefined;

export type TokenSet = {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_at: number;
};

function buildManualServer(): OIDCMetadata | undefined {
    if (!ISSUER) return undefined;
    if (!AUTHORIZATION_ENDPOINT || !TOKEN_ENDPOINT) return undefined;
    const as: OIDCMetadata = {
        issuer: ISSUER,
        authorization_endpoint: AUTHORIZATION_ENDPOINT,
        token_endpoint: TOKEN_ENDPOINT,
        userinfo_endpoint: USERINFO_ENDPOINT,
        end_session_endpoint: END_SESSION_ENDPOINT
    };
    return as;
}

export async function discover(): Promise<OIDCMetadata> {
    if (OPENID_CONFIG) {
        try {
            const wellKnown = new URL(OPENID_CONFIG);
            const res = await oauth.discoveryRequest(wellKnown, { algorithm: 'oauth2' });
            const server = await oauth.processDiscoveryResponse(wellKnown, res);
            return server;
        } catch (e) {
            console.warn('Discovery failed, falling back to manual endpoints if provided:', e);
            const manual = buildManualServer();
            if (manual) return manual;
            throw new Error('Failed to fetch OIDC discovery and no manual endpoints configured.');
        }
    }
    const manual = buildManualServer();
    if (manual) return manual;
    throw new Error('Missing discovery and manual OIDC endpoints! :( Set VITE_OIDC_OPENID_CONFIG or VITE_OIDC_* endpoints.');
}

function randomString(bytes = 32) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input: string) {
    const enc = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    const bytes = new Uint8Array(hash);
    let str = '';
    bytes.forEach((b) => (str += String.fromCharCode(b)));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function beginAuth(server: OIDCMetadata) {
    const state = randomString(16);
    const nonce = randomString(16);
    const code_verifier = randomString(64);
    const code_challenge = await sha256(code_verifier);

    sessionStorage.setItem('oidc.state', state);
    sessionStorage.setItem('oidc.nonce', nonce);
    sessionStorage.setItem('oidc.code_verifier', code_verifier);

    const authorizationUrl = new URL(server.authorization_endpoint!);
    authorizationUrl.searchParams.set('client_id', CLIENT_ID);
    authorizationUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', REQUESTED_SCOPES);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('nonce', nonce);
    authorizationUrl.searchParams.set('code_challenge', code_challenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.assign(authorizationUrl.toString());
}

export async function handleCallback(server: OIDCMetadata): Promise<TokenSet> {
    const currentUrl = new URL(window.location.href);

    const returnedState = currentUrl.searchParams.get('state') ?? undefined;
    const expectedState = sessionStorage.getItem('oidc.state') ?? undefined;
    if (!returnedState || !expectedState || returnedState !== expectedState) {
        throw new Error('state_mismatch');
    }

    const code = currentUrl.searchParams.get('code');
    if (!code) throw new Error('missing_code');

    const code_verifier = sessionStorage.getItem('oidc.code_verifier')!;
    const nonce = sessionStorage.getItem('oidc.nonce')!;

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier
    });

    const tokenEndpoint = server.token_endpoint!;
    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body
    });

    const result = await oauth.processAuthorizationCodeOpenIDResponse(server, { client_id: CLIENT_ID }, response, nonce);
    if (oauth.isOAuth2Error(result)) {
        throw new Error(result.error_description ?? result.error);
    }

    const now = Math.floor(Date.now() / 1000);
    const expires_at = now + (result.expires_in ?? 300);

    sessionStorage.removeItem('oidc.state');
    sessionStorage.removeItem('oidc.nonce');
    sessionStorage.removeItem('oidc.code_verifier');

    return {
        access_token: result.access_token!,
        id_token: result.id_token,
        refresh_token: result.refresh_token,
        expires_at
    };
}

export async function refreshTokens(server: OIDCMetadata, refresh_token: string): Promise<TokenSet> {
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: CLIENT_ID
    });

    const response = await fetch(server.token_endpoint!, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body
    });

    const result = await oauth.processRefreshTokenResponse(server, { client_id: CLIENT_ID }, response);
    if (oauth.isOAuth2Error(result)) throw new Error(result.error_description ?? result.error);

    const now = Math.floor(Date.now() / 1000);
    const expires_at = now + (result.expires_in ?? 300);
    return {
        access_token: result.access_token!,
        id_token: result.id_token,
        refresh_token: result.refresh_token ?? refresh_token,
        expires_at
    };
}

export async function buildRpLogoutUrl(server: OIDCMetadata, id_token: string): Promise<string> {
    const end = server.end_session_endpoint;
    if (!end) throw new Error('end_session_endpoint not available');
    const url = new URL(end);
    url.searchParams.set('id_token_hint', id_token);
    url.searchParams.set('post_logout_redirect_uri', LOGOUT_REDIRECT_URI);
    return url.toString();
}
