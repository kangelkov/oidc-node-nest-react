import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector, private cfg: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const rbacEnabled = (this.cfg.get<string>('REQUIRE_AUTH') ?? 'true').toLowerCase() === 'true';

        const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (!rbacEnabled || !required || required.length === 0) return true;

        const req = context.switchToHttp().getRequest();
        const roles: string[] = req.userRoles ?? [];
        const ok = required.some((r) => roles.includes(r));
        if (!ok) throw new ForbiddenException('forbidden');
        return true;
    }
}
