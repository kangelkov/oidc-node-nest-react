import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { OidcService } from './oidc.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly oidc: OidcService, private cfg: ConfigService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        const requireAuth = (this.cfg.get<string>('REQUIRE_AUTH') ?? 'true').toLowerCase() === 'true';

        if (!requireAuth) {
            req.user = null;
            req.userRoles = [];
            return true;
        }

        const auth = req.headers['authorization'];
        if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
            throw new UnauthorizedException('missing_bearer');
        }

        const token = auth.substring('Bearer '.length).trim();
        try {
            const payload = await this.oidc.verify(token);
            req.user = payload;
            const realm = payload?.realm_access?.roles ?? [];
            const resourceRoles = Object.values(payload?.resource_access ?? {}).flatMap((r: any) => r.roles ?? []);
            req.userRoles = Array.from(new Set([...(realm || []), ...resourceRoles]));
            return true;
        } catch {
            throw new UnauthorizedException('invalid_token');
        }
    }
}
