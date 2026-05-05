import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyService } from 'src/core/api-tier/api-key.service';
import { ApiKeyAuthGuard } from 'src/http/api/shared/api-key-auth.guard';
import { JwtOrApiKeyGuard } from 'src/http/api/shared/jwt-or-api-key.guard';

function ctxFor(opts: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
}): { ctx: ExecutionContext; request: any } {
    const request: any = { headers: opts.headers ?? {}, cookies: opts.cookies ?? {} };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => undefined,
        getClass: () => undefined,
    } as unknown as ExecutionContext;
    return { ctx, request };
}

describe('JwtOrApiKeyGuard', () => {
    let apiKeySvc: jest.Mocked<Pick<ApiKeyService, 'resolveByRawKey' | 'touchLastUsed'>>;
    let apiKeyGuard: ApiKeyAuthGuard;
    let guard: JwtOrApiKeyGuard;
    // Stub the underlying passport JWT call so we can isolate routing logic.
    let jwtSpy: jest.SpyInstance;

    beforeEach(() => {
        apiKeySvc = { resolveByRawKey: jest.fn(), touchLastUsed: jest.fn() };
        apiKeyGuard = new ApiKeyAuthGuard(apiKeySvc as unknown as ApiKeyService);
        guard = new JwtOrApiKeyGuard(apiKeyGuard);
        jwtSpy = jest
            .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
            .mockResolvedValue(true);
    });

    afterEach(() => jwtSpy.mockRestore());

    it('rejects when neither API key nor JWT is presented', async () => {
        const { ctx } = ctxFor({});
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(jwtSpy).not.toHaveBeenCalled();
    });

    it('routes to API key path when X-API-Key header is present', async () => {
        const apiKey = new ApiKey({ id: 1, userId: 42, keyHash: 'h', keyPrefix: 'iwm_live_a', name: 'k' });
        apiKeySvc.resolveByRawKey.mockResolvedValue(apiKey);
        const { ctx, request } = ctxFor({ headers: { 'x-api-key': 'iwm_live_valid' } });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(request.apiKey).toBe(apiKey);
        expect(jwtSpy).not.toHaveBeenCalled();
    });

    it('routes to API key path when both API key header AND JWT cookie are present (no JWT bypass)', async () => {
        const apiKey = new ApiKey({ id: 1, userId: 42, keyHash: 'h', keyPrefix: 'iwm_live_a', name: 'k' });
        apiKeySvc.resolveByRawKey.mockResolvedValue(apiKey);
        const { ctx, request } = ctxFor({
            headers: { 'x-api-key': 'iwm_live_valid' },
            cookies: { authorization: 'cookie-jwt-here' },
        });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(request.apiKey).toBe(apiKey);
        // Critical: when an API key is presented, JWT path must NOT be taken even if a
        // cookie session also exists. Otherwise a developer could keep a logged-in browser
        // tab open and have their API-key requests counted under the cookie 200/min budget.
        expect(jwtSpy).not.toHaveBeenCalled();
    });

    it('rejects (no fallthrough) when API key header is present but invalid', async () => {
        apiKeySvc.resolveByRawKey.mockResolvedValue(null);
        const { ctx } = ctxFor({
            headers: { 'x-api-key': 'iwm_live_bogus' },
            cookies: { authorization: 'valid-cookie-jwt' },
        });
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        // An attacker presenting a bad API key alongside a valid cookie must NOT be
        // silently authenticated as the cookie user.
        expect(jwtSpy).not.toHaveBeenCalled();
    });

    it('treats Authorization: Bearer <jwt> as a JWT (not as an API key) when no iwm_live_ prefix', async () => {
        // A plain JWT in the Authorization header has no iwm_live_ prefix and must NOT
        // be misrouted into the API key resolver.
        const { ctx } = ctxFor({ headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig' } });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(apiKeySvc.resolveByRawKey).not.toHaveBeenCalled();
        expect(jwtSpy).toHaveBeenCalled();
    });

    it('takes the JWT path when only a cookie is present', async () => {
        const { ctx } = ctxFor({ cookies: { authorization: 'cookie-jwt' } });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(apiKeySvc.resolveByRawKey).not.toHaveBeenCalled();
        expect(jwtSpy).toHaveBeenCalled();
    });
});
