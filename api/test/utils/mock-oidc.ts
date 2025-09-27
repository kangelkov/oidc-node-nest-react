import type { DecodedToken } from '../../src/auth/oidc.service';

export class MockOidcService {
    async onModuleInit() {
    }

    async verify(token: string): Promise<DecodedToken> {
        switch (token) {
            case 'reader':
                return { sub: 'reader-sub', realm_access: { roles: ['read'] } } as DecodedToken;
            case 'writerA':
                return { sub: 'writer-a', realm_access: { roles: ['read', 'write'] } } as DecodedToken;
            case 'writerB':
                return { sub: 'writer-b', realm_access: { roles: ['read', 'write'] } } as DecodedToken;
            case 'admin':
                return { sub: 'admin-sub', realm_access: { roles: ['read', 'write', 'admin'] } } as DecodedToken;
            default:
                throw new Error('invalid_token');
        }
    }

    extractRoles(payload: DecodedToken): string[] {
        const realm = payload.realm_access?.roles ?? [];
        const resource = Object.values(payload.resource_access ?? {}).flatMap(r => r.roles ?? []);
        return Array.from(new Set([...realm, ...resource]));
    }
}
