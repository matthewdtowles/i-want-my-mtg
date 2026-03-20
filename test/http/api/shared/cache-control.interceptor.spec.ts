import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { CacheControlInterceptor } from 'src/http/api/shared/cache-control.interceptor';

function createMockContext(overrides: { method?: string; user?: { id: number } } = {}): {
    context: ExecutionContext;
    setHeader: jest.Mock;
} {
    const setHeader = jest.fn();
    const req = {
        method: overrides.method ?? 'GET',
        user: overrides.user ?? undefined,
    };
    const res = { setHeader };
    const context = {
        switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
        getHandler: () => ({}),
        getClass: () => ({}),
    } as unknown as ExecutionContext;
    return { context, setHeader };
}

function createNext(): CallHandler {
    return { handle: () => of({ data: [] }) };
}

describe('CacheControlInterceptor', () => {
    let interceptor: CacheControlInterceptor;
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
        interceptor = new CacheControlInterceptor(reflector);
    });

    it('should set public cache header for unauthenticated GET', (done) => {
        const { context, setHeader } = createMockContext();
        interceptor.intercept(context, createNext()).subscribe(() => {
            expect(setHeader).toHaveBeenCalledWith(
                'Cache-Control',
                expect.stringContaining('public, max-age=60')
            );
            done();
        });
    });

    it('should set private cache header for authenticated GET', (done) => {
        const { context, setHeader } = createMockContext({ user: { id: 1 } });
        interceptor.intercept(context, createNext()).subscribe(() => {
            expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
            done();
        });
    });

    it('should set no-store for non-GET requests', (done) => {
        const { context, setHeader } = createMockContext({ method: 'POST' });
        interceptor.intercept(context, createNext()).subscribe(() => {
            expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
            done();
        });
    });

    it('should include stale-while-revalidate for public GET', (done) => {
        const { context, setHeader } = createMockContext();
        interceptor.intercept(context, createNext()).subscribe(() => {
            expect(setHeader).toHaveBeenCalledWith(
                'Cache-Control',
                expect.stringContaining('stale-while-revalidate=300')
            );
            done();
        });
    });

    it('should use custom TTL from CacheTTL decorator', (done) => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(120);
        const { context, setHeader } = createMockContext();
        interceptor.intercept(context, createNext()).subscribe(() => {
            expect(setHeader).toHaveBeenCalledWith(
                'Cache-Control',
                expect.stringContaining('max-age=120')
            );
            done();
        });
    });

    it('should set no-store when CacheTTL is 0', (done) => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(0);
        const { context, setHeader } = createMockContext();
        interceptor.intercept(context, createNext()).subscribe(() => {
            expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
            done();
        });
    });
});
