import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload, JWTVerifyGetKey } from 'jose';

export interface DecodedToken extends JWTPayload {
    email?: string;
    preferred_username?: string;
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
}

@Injectable()
export class OidcService {
    private readonly logger = new Logger(OidcService.name);
    private issuer!: string;
    private audience?: string;
    private jwks!: JWTVerifyGetKey;
    private enabled = true;

    constructor(private readonly cfg: ConfigService) {}

    async onModuleInit() {
        this.enabled = (this.cfg.get<string>('REQUIRE_AUTH') ?? 'true').toLowerCase() === 'true';
        if (!this.enabled) {
            this.logger.log('REQUIRE_AUTH=false → skipping OIDC initialization');
            return;
        }

        const issuer = this.cfg.get<string>('OIDC_ISSUER');
        const jwksUri = this.cfg.get<string>('OIDC_JWKS_URI');
        const audience = this.cfg.get<string>('API_AUDIENCE') ?? undefined;

        if (!issuer || !jwksUri) throw new Error('Missing OIDC_ISSUER or OIDC_JWKS_URI');
        this.issuer = issuer;
        this.audience = audience;

        this.jwks = createRemoteJWKSet(new URL(jwksUri), { cacheMaxAge: 10 * 60_000 }); // 10m
        this.logger.log(`OIDC initialized (issuer ${issuer})`);
    }

    async verify(token: string): Promise<DecodedToken> {
        if (!this.enabled) throw new Error('oidc_disabled');
        const options: any = { issuer: this.issuer };
        if (this.audience) options.audience = this.audience;

        const { payload } = await jwtVerify(token, this.jwks, options);
        return payload as DecodedToken;
    }

    extractRoles(payload: DecodedToken): string[] {
        const realm = payload.realm_access?.roles ?? [];
        const resourceRoles = Object.values(payload.resource_access ?? {}).flatMap(r => r.roles ?? []);
        return [...new Set<string>([...realm, ...resourceRoles])];
    }
}
