import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    RAPIDAPI_PROXY_SECRET_HEADER,
    RAPIDAPI_USER_HEADER,
    RapidApiProxyGuard,
} from 'src/http/api/shared/rapidapi-proxy.guard';

function ctxFor(headers: Record<string, string | string[] | undefined>) {
    const request: any = { headers };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { ctx, request };
}

function makeGuard(secret: string | undefined): RapidApiProxyGuard {
    const config = {
        get: jest.fn().mockReturnValue(secret),
    } as unknown as ConfigService;
    return new RapidApiProxyGuard(config);
}

describe('RapidApiProxyGuard', () => {
    it('returns false when proxy header is absent (composes as opt-in pre-check)', () => {
        const guard = makeGuard('s3cret');
        const { ctx, request } = ctxFor({});
        expect(guard.canActivate(ctx)).toBe(false);
        expect(request.rapidApi).toBeUndefined();
    });

    it('throws 401 when secret env is unset but header is presented', () => {
        const guard = makeGuard(undefined);
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 'anything' });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws 401 when secret env is empty/whitespace', () => {
        const guard = makeGuard('   ');
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 'anything' });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws 401 on secret mismatch', () => {
        const guard = makeGuard('s3cret');
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 'wrong' });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('throws 401 on duplicated header (string[]) — does not silently fall through', () => {
        const guard = makeGuard('s3cret');
        const { ctx, request } = ctxFor({
            [RAPIDAPI_PROXY_SECRET_HEADER]: ['s3cret', 's3cret'],
        });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
        expect(request.rapidApi).toBeUndefined();
    });

    it('throws 401 on empty-string header (presented but malformed)', () => {
        const guard = makeGuard('s3cret');
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: '' });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('returns true and stamps request.rapidApi.user on match', () => {
        const guard = makeGuard('s3cret');
        const { ctx, request } = ctxFor({
            [RAPIDAPI_PROXY_SECRET_HEADER]: 's3cret',
            [RAPIDAPI_USER_HEADER]: 'alice',
        });
        expect(guard.canActivate(ctx)).toBe(true);
        expect(request.rapidApi).toEqual({ user: 'alice' });
    });

    it('stamps rapidApi with undefined user when user header is absent', () => {
        const guard = makeGuard('s3cret');
        const { ctx, request } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 's3cret' });
        expect(guard.canActivate(ctx)).toBe(true);
        expect(request.rapidApi).toEqual({ user: undefined });
    });

    it('rejects when secret length matches but bytes differ (constant-time check)', () => {
        const guard = makeGuard('aaaaaa');
        const { ctx } = ctxFor({ [RAPIDAPI_PROXY_SECRET_HEADER]: 'bbbbbb' });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
});
