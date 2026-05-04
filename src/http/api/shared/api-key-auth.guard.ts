import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyService } from 'src/core/api-tier/api-key.service';
import { getLogger } from 'src/logger/global-app-logger';

const RAW_KEY_PREFIX = 'iwm_live_';

declare module 'express' {
    interface Request {
        apiKey?: ApiKey;
    }
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    private readonly LOGGER = getLogger(ApiKeyAuthGuard.name);

    constructor(private readonly apiKeyService: ApiKeyService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const rawKey = extractRawKey(request);
        if (!rawKey) {
            throw new UnauthorizedException('API key required');
        }
        const apiKey = await this.apiKeyService.resolveByRawKey(rawKey);
        if (!apiKey) {
            this.LOGGER.debug(`Invalid or revoked API key presented (prefix=${rawKey.slice(0, 13)}).`);
            throw new UnauthorizedException('Invalid API key');
        }
        request.user = { id: apiKey.userId } as Express.User;
        request.apiKey = apiKey;
        if (apiKey.id !== null) this.apiKeyService.touchLastUsed(apiKey.id);
        return true;
    }
}

export function extractRawKey(request: Request): string | null {
    const headerKey = request.headers['x-api-key'];
    if (typeof headerKey === 'string' && headerKey.startsWith(RAW_KEY_PREFIX)) {
        return headerKey;
    }
    const auth = request.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        const token = auth.slice('Bearer '.length).trim();
        if (token.startsWith(RAW_KEY_PREFIX)) return token;
    }
    return null;
}
