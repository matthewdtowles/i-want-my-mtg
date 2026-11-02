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

export const SHARED_CACHE_TTL_KEY = 'cache-control-shared-ttl';

/**
 * Let shared caches (CloudFront) keep a public response for `seconds` (s-maxage) while
 * browsers keep the max-age above. A browser's cache key has no cookie, so a long
 * browser TTL would show a visitor who just signed in a page cached while signed out;
 * CloudFront's cache key includes the auth cookie, so it can hold pages longer.
 */
export const SharedCacheTTL = (seconds: number) => SetMetadata(SHARED_CACHE_TTL_KEY, seconds);

/**
 * Adds Cache-Control headers to GET API responses.
 * - Authenticated endpoints (cookie/bearer): no-store
 * - Public GET endpoints: short TTL with stale-while-revalidate
 * - Non-GET requests: no-store
 *
 * Registered as a global interceptor, so it runs after every route handler.
 * Handlers that set Cache-Control explicitly (e.g. @Header on /sw.js) win;
 * this interceptor only fills in the header when none was set.
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

                if (res.headersSent || res.getHeader('Cache-Control')) {
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

                const sharedTtl = this.reflector.getAllAndOverride<number>(SHARED_CACHE_TTL_KEY, [
                    context.getHandler(),
                    context.getClass(),
                ]);
                res.setHeader(
                    'Cache-Control',
                    `public, max-age=${ttl}, ` +
                        (sharedTtl ? `s-maxage=${sharedTtl}, ` : '') +
                        `stale-while-revalidate=${CacheControlInterceptor.STALE_WHILE_REVALIDATE}`
                );
            })
        );
    }
}
