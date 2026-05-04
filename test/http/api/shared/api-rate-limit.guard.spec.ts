import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { ApiUsageService } from 'src/core/api-tier/api-usage.service';
import { ApiRateLimitGuard } from 'src/http/api/shared/api-rate-limit.guard';

function makeContext(opts: {
    user?: { id: number };
    apiKey?: ApiKey;
    ip?: string;
}): { ctx: ExecutionContext; res: { headers: Record<string, string>; setHeader: jest.Mock } } {
    const headers: Record<string, string> = {};
    const setHeader = jest.fn((k: string, v: string) => {
        headers[k] = v;
    });
    const request = { user: opts.user, apiKey: opts.apiKey, ip: opts.ip };
    const response = { setHeader, headers };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ExecutionContext;
    return { ctx, res: response };
}

describe('ApiRateLimitGuard', () => {
    let subSvc: jest.Mocked<Pick<ApiSubscriptionService, 'getEffectiveTier'>>;
    let usageSvc: jest.Mocked<Pick<ApiUsageService, 'incrementCount' | 'getCount' | 'getRange'>>;
    let guard: ApiRateLimitGuard;

    beforeEach(() => {
        subSvc = { getEffectiveTier: jest.fn() };
        usageSvc = {
            incrementCount: jest.fn(),
            getCount: jest.fn(),
            getRange: jest.fn(),
        };
        guard = new ApiRateLimitGuard(
            subSvc as unknown as ApiSubscriptionService,
            usageSvc as unknown as ApiUsageService
        );
    });

    afterEach(() => {
        guard.onModuleDestroy();
    });

    describe('IP path (no user, no API key)', () => {
        it('allows up to the IP burst and rejects beyond', async () => {
            for (let i = 0; i < 60; i++) {
                const { ctx } = makeContext({ ip: '1.2.3.4' });
                await expect(guard.canActivate(ctx)).resolves.toBe(true);
            }
            const { ctx } = makeContext({ ip: '1.2.3.4' });
            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
        });

        it('does not call usage repo or sub service for anon traffic', async () => {
            const { ctx } = makeContext({ ip: '5.5.5.5' });
            await guard.canActivate(ctx);
            expect(subSvc.getEffectiveTier).not.toHaveBeenCalled();
            expect(usageSvc.incrementCount).not.toHaveBeenCalled();
        });
    });

    describe('JWT cookie path (user, no API key)', () => {
        it('uses 200/min limit and does NOT touch the daily counter', async () => {
            for (let i = 0; i < 200; i++) {
                const { ctx } = makeContext({ user: { id: 1 } });
                await expect(guard.canActivate(ctx)).resolves.toBe(true);
            }
            expect(usageSvc.incrementCount).not.toHaveBeenCalled();
            const { ctx } = makeContext({ user: { id: 1 } });
            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
        });
    });

    describe('API key path', () => {
        const apiKey = new ApiKey({
            id: 1,
            userId: 7,
            keyHash: 'h',
            keyPrefix: 'iwm_live_aaaa',
            name: 'k',
        });

        it('counts toward daily quota and sets X-RateLimit headers on success', async () => {
            subSvc.getEffectiveTier.mockResolvedValue(ApiTier.Free);
            usageSvc.incrementCount.mockResolvedValue(1);
            const { ctx, res } = makeContext({ user: { id: 7 }, apiKey });
            await expect(guard.canActivate(ctx)).resolves.toBe(true);
            expect(usageSvc.incrementCount).toHaveBeenCalledWith(7, expect.any(Date));
            expect(res.headers['X-RateLimit-Limit']).toBe('100');
            expect(res.headers['X-RateLimit-Remaining']).toBe('99');
            expect(res.headers['X-RateLimit-Reset']).toMatch(/^\d+$/);
        });

        it('rejects with 429 when daily quota exceeded and includes upgrade link for paid tiers', async () => {
            subSvc.getEffectiveTier.mockResolvedValue(ApiTier.Free);
            usageSvc.incrementCount.mockResolvedValue(101);
            const { ctx } = makeContext({ user: { id: 7 }, apiKey });
            try {
                await guard.canActivate(ctx);
                fail('expected HttpException');
            } catch (err) {
                expect(err).toBeInstanceOf(HttpException);
                expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
                const body = (err as HttpException).getResponse() as {
                    upgrade: string | null;
                    message: string;
                };
                expect(body.upgrade).toBe('/developer/pricing');
                expect(body.message).toMatch(/free/i);
            }
        });

        it('omits upgrade link at the Business tier (already top tier)', async () => {
            subSvc.getEffectiveTier.mockResolvedValue(ApiTier.Business);
            usageSvc.incrementCount.mockResolvedValue(50001);
            const { ctx } = makeContext({ user: { id: 7 }, apiKey });
            try {
                await guard.canActivate(ctx);
                fail('expected HttpException');
            } catch (err) {
                const body = (err as HttpException).getResponse() as { upgrade: string | null };
                expect(body.upgrade).toBeNull();
            }
        });

        it('uses tier-specific perMinute burst', async () => {
            subSvc.getEffectiveTier.mockResolvedValue(ApiTier.Free);
            usageSvc.incrementCount.mockResolvedValue(1);
            // Free tier perMinute = 60. After 60 successful, 61st burst-rejects.
            for (let i = 0; i < 60; i++) {
                const { ctx } = makeContext({ user: { id: 7 }, apiKey });
                await expect(guard.canActivate(ctx)).resolves.toBe(true);
            }
            const { ctx } = makeContext({ user: { id: 7 }, apiKey });
            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
        });
    });
});
