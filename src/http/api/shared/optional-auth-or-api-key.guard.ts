import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AUTH_TOKEN_NAME } from 'src/http/auth/dto/auth.types';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiKeyAuthGuard, extractRawKey } from './api-key-auth.guard';

/**
 * Like OptionalAuthGuard but also accepts API keys. If an API key header is presented,
 * it must validate (no silent downgrade to anonymous on a bad key — the caller asked
 * to be authenticated). Otherwise behaves like OptionalAuthGuard: valid JWT → user;
 * no JWT → anonymous; invalid JWT → anonymous.
 */
@Injectable()
export class OptionalAuthOrApiKeyGuard extends AuthGuard('jwt') {
    private readonly LOGGER = getLogger(OptionalAuthOrApiKeyGuard.name);

    constructor(private readonly apiKeyGuard: ApiKeyAuthGuard) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
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
