import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyService } from 'src/core/api-tier/api-key.service';
import { ConfigService } from '@nestjs/config';
import { ApiKeyAuthGuard } from 'src/http/api/shared/api-key-auth.guard';
import { OptionalAuthOrApiKeyGuard } from 'src/http/api/shared/optional-auth-or-api-key.guard';
import { RapidApiProxyGuard } from 'src/http/api/shared/rapidapi-proxy.guard';

function ctxFor(opts: { headers?: Record<string, string>; cookies?: Record<string, string> }) {
    const request: any = { headers: opts.headers ?? {}, cookies: opts.cookies ?? {} };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => undefined,
        getClass: () => undefined,
    } as unknown as ExecutionContext;
    return { ctx, request };
}

describe('OptionalAuthOrApiKeyGuard', () => {
    let apiKeySvc: jest.Mocked<Pick<ApiKeyService, 'resolveByRawKey' | 'touchLastUsed'>>;
    let guard: OptionalAuthOrApiKeyGuard;
    let jwtSpy: jest.SpyInstance;

    beforeEach(() => {
        apiKeySvc = { resolveByRawKey: jest.fn(), touchLastUsed: jest.fn() };
        const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
        guard = new OptionalAuthOrApiKeyGuard(
            new ApiKeyAuthGuard(apiKeySvc as unknown as ApiKeyService),
            new RapidApiProxyGuard(config)
        );
        jwtSpy = jest
            .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
            .mockResolvedValue(true);
    });

    afterEach(() => jwtSpy.mockRestore());

    it('allows anonymous (no headers, no cookies)', async () => {
        const { ctx, request } = ctxFor({});
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(request.apiKey).toBeUndefined();
    });

    it('rejects bad API key (no silent downgrade to anonymous)', async () => {
        apiKeySvc.resolveByRawKey.mockResolvedValue(null);
        const { ctx } = ctxFor({ headers: { 'x-api-key': 'iwm_live_bogus' } });
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('uses API key path when a valid key is presented (even with cookie session)', async () => {
        const apiKey = new ApiKey({ id: 1, userId: 9, keyHash: 'h', keyPrefix: 'iwm_live_a', name: 'k' });
        apiKeySvc.resolveByRawKey.mockResolvedValue(apiKey);
        const { ctx, request } = ctxFor({
            headers: { 'x-api-key': 'iwm_live_valid' },
            cookies: { authorization: 'jwt' },
        });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(request.apiKey).toBe(apiKey);
        expect(jwtSpy).not.toHaveBeenCalled();
    });
});
