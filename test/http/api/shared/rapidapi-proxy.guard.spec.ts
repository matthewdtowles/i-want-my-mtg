import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    RapidApiProxyGuard,
    RAPIDAPI_PROXY_SECRET_HEADER,
    RAPIDAPI_USER_HEADER,
} from 'src/http/api/shared/rapidapi-proxy.guard';

function ctxFor(headers: Record<string, string | string[]> = {}) {
    const request: any = { headers };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => undefined,
        getClass: () => undefined,
    } as unknown as ExecutionContext;
    return { ctx, request };
}

function makeGuard(secret: string | undefined) {
    const config = { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
    return new RapidApiProxyGuard(config);
}

describe('RapidApiProxyGuard', () => {
    it('returns false when proxy header is absent', () => {
        const guard = makeGuard('s3cret');
        const { ctx, request } = ctxFor({});
        expect(guard.canActivate(ctx)).toBe(false);
        expect(request.rapidApi).toBeUndefined();
    });

    it('throws 401 when secret is unset but header is present', () => {
        const guard = makeGuard(undefined);
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 'whatever' });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws 401 on secret mismatch', () => {
        const guard = makeGuard('expected');
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 'wrong-but-same-len' });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws 401 when proxy header is duplicated (string[])', () => {
        const guard = makeGuard('s3cret');
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: ['s3cret', 's3cret'] });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('returns true and stamps request.rapidApi.user on match', () => {
        const guard = makeGuard('s3cret');
        const { ctx, request } = ctxFor({
            [RAPIDAPI_PROXY_SECRET_HEADER]: 's3cret',
            [RAPIDAPI_USER_HEADER]: 'rapid-user-42',
        });
        expect(guard.canActivate(ctx)).toBe(true);
        expect(request.rapidApi).toEqual({ user: 'rapid-user-42' });
    });

    it('returns true with undefined user when user header is absent', () => {
        const guard = makeGuard('s3cret');
        const { ctx, request } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 's3cret' });
        expect(guard.canActivate(ctx)).toBe(true);
        expect(request.rapidApi).toEqual({ user: undefined });
    });
});
