import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AUTH_TOKEN_NAME } from 'src/http/auth/dto/auth.types';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiKeyAuthGuard, extractRawKey } from './api-key-auth.guard';
import { RapidApiProxyGuard } from './rapidapi-proxy.guard';

/**
 * Like OptionalAuthGuard but also accepts API keys and the RapidAPI proxy. Order:
 *   1. RapidAPI proxy header present → validate secret (throws on mismatch);
 *   2. IWMM API key header present → must validate (no silent downgrade);
 *   3. JWT cookie/Bearer present → validate, but fall through to anonymous on failure;
 *   4. Nothing presented → anonymous.
 */
@Injectable()
export class OptionalAuthOrApiKeyGuard extends AuthGuard('jwt') {
    private readonly LOGGER = getLogger(OptionalAuthOrApiKeyGuard.name);

    constructor(
        private readonly apiKeyGuard: ApiKeyAuthGuard,
        private readonly rapidApiGuard: RapidApiProxyGuard
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        if (this.rapidApiGuard.tryAuthenticate(request)) {
            return true;
        }
        if (extractRawKey(request)) {
            return this.apiKeyGuard.canActivate(context) as Promise<boolean>;
        }
        try {
            const hasBearerToken = request.headers.authorization?.startsWith('Bearer ');
            const hasCookieToken = !!request.cookies?.[AUTH_TOKEN_NAME];
            if (!hasBearerToken && !hasCookieToken) return true;
            return !!(await super.canActivate(context));
        } catch (error) {
            this.LOGGER.debug(`JWT failed; allowing anonymous: ${error?.message}`);
            return true;
        }
    }

    handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
        return user || (null as TUser);
    }
}
