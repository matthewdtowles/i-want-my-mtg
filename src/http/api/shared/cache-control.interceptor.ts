import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

export const CACHE_TTL_KEY = 'cache-control-ttl';

/**
 * Set a custom Cache-Control max-age (seconds) on a handler or controller.
 * Use 0 to explicitly disable caching (no-store).
 */
export const CacheTTL = (seconds: number) => SetMetadata(CACHE_TTL_KEY, seconds);

/**
 * Adds Cache-Control headers to GET API responses.
 * - Authenticated endpoints (cookie/bearer): no-store
 * - Public GET endpoints: short TTL with stale-while-revalidate
 * - Non-GET requests: no-store
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
    private static readonly DEFAULT_TTL = 60;
    private static readonly STALE_WHILE_REVALIDATE = 300;

    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            tap(() => {
                const req = context.switchToHttp().getRequest();
                const res = context.switchToHttp().getResponse();

                if (res.headersSent) {
                    return;
                }

                if (req.method !== 'GET') {
                    res.setHeader('Cache-Control', 'no-store');
                    return;
                }

                const isAuthenticated = !!req.user;
                if (isAuthenticated) {
                    res.setHeader('Cache-Control', 'private, no-store');
                    return;
                }

                const ttl =
                    this.reflector.getAllAndOverride<number>(CACHE_TTL_KEY, [
                        context.getHandler(),
                        context.getClass(),
                    ]) ?? CacheControlInterceptor.DEFAULT_TTL;

                if (ttl === 0) {
                    res.setHeader('Cache-Control', 'no-store');
                    return;
                }

                res.setHeader(
                    'Cache-Control',
                    `public, max-age=${ttl}, stale-while-revalidate=${CacheControlInterceptor.STALE_WHILE_REVALIDATE}`
                );
            })
        );
    }
}
