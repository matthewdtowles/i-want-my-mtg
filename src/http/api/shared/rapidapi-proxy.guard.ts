import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { getLogger } from 'src/logger/global-app-logger';

export const RAPIDAPI_PROXY_SECRET_HEADER = 'x-rapidapi-proxy-secret';
export const RAPIDAPI_USER_HEADER = 'x-rapidapi-user';

declare module 'express' {
    interface Request {
        rapidApi?: { user?: string };
    }
}

/**
 * Validates inbound traffic from the RapidAPI marketplace proxy.
 *
 * RapidAPI authenticates and meters end-users on their side, then forwards the
 * request to our origin with `X-RapidAPI-Proxy-Secret`. We trust requests whose
 * secret matches `RAPIDAPI_PROXY_SECRET` and stamp `request.rapidApi` so the
 * rate-limit guard knows to skip per-user daily quota (RapidAPI handles that).
 *
 * Returns false (not throws) when no secret header is present, so this guard
 * can be composed inside auth guards as an opt-in pre-check rather than the
 * sole gate.
 */
@Injectable()
export class RapidApiProxyGuard implements CanActivate {
    private readonly LOGGER = getLogger(RapidApiProxyGuard.name);
    private readonly secret: string | null;

    constructor(private readonly configService: ConfigService) {
        const raw = this.configService.get<string>('RAPIDAPI_PROXY_SECRET');
        this.secret = raw && raw.trim().length > 0 ? raw : null;
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        return this.tryAuthenticate(request);
    }

    /**
     * Returns true and stamps `request.rapidApi` if the proxy header validates;
     * returns false if the header is absent. Throws on invalid header — we don't
     * want to silently fall through to anonymous when someone is trying (and
     * failing) to impersonate the proxy.
     */
    tryAuthenticate(request: Request): boolean {
        const presented = request.headers[RAPIDAPI_PROXY_SECRET_HEADER];
        if (presented === undefined) return false;
        if (Array.isArray(presented)) {
            this.LOGGER.warn('Received multiple RapidAPI proxy secret headers.');
            throw new UnauthorizedException('Invalid proxy secret');
        }
        if (typeof presented !== 'string' || presented.length === 0) return false;
        if (!this.secret) {
            this.LOGGER.warn('Received RapidAPI proxy header but RAPIDAPI_PROXY_SECRET is unset.');
            throw new UnauthorizedException('RapidAPI proxy not configured');
        }
        if (!constantTimeEqual(presented, this.secret)) {
            this.LOGGER.warn('RapidAPI proxy secret mismatch.');
            throw new UnauthorizedException('Invalid proxy secret');
        }
        const userHeader = request.headers[RAPIDAPI_USER_HEADER];
        request.rapidApi = {
            user: typeof userHeader === 'string' ? userHeader : undefined,
        };
        return true;
    }
}

function constantTimeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
}
