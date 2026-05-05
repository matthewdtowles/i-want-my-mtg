import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AUTH_TOKEN_NAME } from 'src/http/auth/dto/auth.types';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiKeyAuthGuard, extractRawKey } from './api-key-auth.guard';

/**
 * If a raw API key (`iwm_live_...`) is presented in `X-API-Key` or `Authorization: Bearer`,
 * authenticate strictly via ApiKeyAuthGuard (invalid keys 401 — never fall through).
 * Otherwise require a valid JWT cookie / Bearer JWT.
 */
@Injectable()
export class JwtOrApiKeyGuard extends AuthGuard('jwt') {
    private readonly LOGGER = getLogger(JwtOrApiKeyGuard.name);

    constructor(private readonly apiKeyGuard: ApiKeyAuthGuard) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        if (extractRawKey(request)) {
            return this.apiKeyGuard.canActivate(context) as Promise<boolean>;
        }
        const hasBearerToken = request.headers.authorization?.startsWith('Bearer ');
        const hasCookieToken = !!request.cookies?.[AUTH_TOKEN_NAME];
        if (!hasBearerToken && !hasCookieToken) {
            this.LOGGER.debug('No API key or JWT presented');
            throw new UnauthorizedException('Authentication required');
        }
        return !!(await super.canActivate(context));
    }
}
