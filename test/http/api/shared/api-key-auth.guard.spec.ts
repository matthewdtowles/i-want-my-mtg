import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyService } from 'src/core/api-tier/api-key.service';
import { ApiKeyAuthGuard } from 'src/http/api/shared/api-key-auth.guard';

function makeContext(headers: Record<string, string>): { ctx: ExecutionContext; request: any } {
    const request: any = { headers };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    return { ctx, request };
}

describe('ApiKeyAuthGuard', () => {
    let svc: jest.Mocked<Pick<ApiKeyService, 'resolveByRawKey' | 'touchLastUsed'>>;
    let guard: ApiKeyAuthGuard;

    beforeEach(() => {
        svc = { resolveByRawKey: jest.fn(), touchLastUsed: jest.fn() };
        guard = new ApiKeyAuthGuard(svc as unknown as ApiKeyService);
    });

    it('rejects requests with no API key header', async () => {
        const { ctx } = makeContext({});
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects bearer tokens that do not start with iwm_live_', async () => {
        const { ctx } = makeContext({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.foo' });
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(svc.resolveByRawKey).not.toHaveBeenCalled();
    });

    it('rejects unknown / revoked keys', async () => {
        svc.resolveByRawKey.mockResolvedValue(null);
        const { ctx } = makeContext({ 'x-api-key': 'iwm_live_revoked' });
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts X-API-Key header and populates request.user + request.apiKey', async () => {
        const apiKey = new ApiKey({
            id: 1,
            userId: 42,
            keyHash: 'h',
            keyPrefix: 'iwm_live_aaaa',
            name: 'k',
        });
        svc.resolveByRawKey.mockResolvedValue(apiKey);
        const { ctx, request } = makeContext({ 'x-api-key': 'iwm_live_validkey' });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(request.user).toEqual({ id: 42 });
        expect(request.apiKey).toBe(apiKey);
        expect(svc.touchLastUsed).toHaveBeenCalledWith(1);
    });

    it('accepts Authorization: Bearer iwm_live_... header', async () => {
        const apiKey = new ApiKey({
            id: 2,
            userId: 7,
            keyHash: 'h',
            keyPrefix: 'iwm_live_bbbb',
            name: 'k',
        });
        svc.resolveByRawKey.mockResolvedValue(apiKey);
        const { ctx, request } = makeContext({ authorization: 'Bearer iwm_live_bearer' });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(request.user).toEqual({ id: 7 });
        expect(svc.resolveByRawKey).toHaveBeenCalledWith('iwm_live_bearer');
    });
});
