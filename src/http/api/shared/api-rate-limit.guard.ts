import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    OnModuleDestroy,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { getTierLimits } from 'src/core/api-tier/api-tier-limits';
import { ApiUsageService } from 'src/core/api-tier/api-usage.service';
import { getLogger } from 'src/logger/global-app-logger';

const COOKIE_USER_BURST_PER_MIN = 200;
const IP_BURST_PER_MIN = 60;
const WINDOW_MS = 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const PRICING_URL = '/developer/pricing';

@Injectable()
export class ApiRateLimitGuard implements CanActivate, OnModuleDestroy {
    private readonly LOGGER = getLogger(ApiRateLimitGuard.name);
    private readonly cookieBursts = new Map<number, number[]>();
    private readonly apiKeyBursts = new Map<number, number[]>();
    private readonly ipBursts = new Map<string, number[]>();
    private readonly cleanupTimer: NodeJS.Timeout;

    constructor(
        private readonly apiSubscriptionService: ApiSubscriptionService,
        private readonly apiUsageService: ApiUsageService
    ) {
        this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
        if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }

    onModuleDestroy(): void {
        clearInterval(this.cleanupTimer);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse<Response>();
        const userId: number | undefined = request.user?.id;
        const isApiKeyAuth = !!request.apiKey;

        if (isApiKeyAuth && userId) {
            return this.checkApiKeyTier(userId, response);
        }
        if (userId) {
            return this.checkBurst(this.cookieBursts, userId, COOKIE_USER_BURST_PER_MIN, `user ${userId}`);
        }
        return this.checkBurst(this.ipBursts, request.ip || 'unknown', IP_BURST_PER_MIN, `IP ${request.ip}`);
    }

    private async checkApiKeyTier(userId: number, response: Response): Promise<boolean> {
        const tier = await this.apiSubscriptionService.getEffectiveTier(userId);
        const limits = getTierLimits(tier);

        // Per-minute burst tracked in a dedicated map so API-key traffic cannot consume
        // the cookie-user budget (and vice versa) for the same user_id.
        this.checkBurst(this.apiKeyBursts, userId, limits.perMinute, `user ${userId} (${tier})`);

        // Daily quota: atomic INSERT/INCREMENT — count includes this request.
        const today = new Date();
        const count = await this.apiUsageService.incrementCount(userId, today);
        this.setRateLimitHeaders(response, limits.perDay, count, today);

        if (count > limits.perDay) {
            this.LOGGER.warn(
                `Daily quota exceeded for user ${userId} on ${tier} tier (${count}/${limits.perDay}).`
            );
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: `Daily API quota of ${limits.perDay} requests exceeded for the ${tier} tier.`,
                    upgrade: tier === ApiTier.Business ? null : PRICING_URL,
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
        return true;
    }

    private checkBurst(
        store: Map<number, number[]> | Map<string, number[]>,
        key: number | string,
        max: number,
        label: string
    ): boolean {
        const now = Date.now();
        const windowStart = now - WINDOW_MS;
        const map = store as Map<number | string, number[]>;
        const timestamps = (map.get(key) ?? []).filter((t) => t > windowStart);
        if (timestamps.length >= max) {
            this.LOGGER.warn(`Burst rate-limit exceeded for ${label}.`);
            throw new HttpException(
                `Too Many Requests: burst limit is ${max} requests per minute`,
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
        timestamps.push(now);
        map.set(key, timestamps);
        return true;
    }

    private setRateLimitHeaders(response: Response, limit: number, count: number, day: Date): void {
        const remaining = Math.max(0, limit - count);
        const resetEpoch = Math.floor(this.nextUtcMidnight(day).getTime() / 1000);
        response.setHeader('X-RateLimit-Limit', String(limit));
        response.setHeader('X-RateLimit-Remaining', String(remaining));
        response.setHeader('X-RateLimit-Reset', String(resetEpoch));
    }

    private nextUtcMidnight(now: Date): Date {
        const next = new Date(now);
        next.setUTCHours(24, 0, 0, 0);
        return next;
    }

    private cleanup(): void {
        const windowStart = Date.now() - WINDOW_MS;
        const sweep = <K>(store: Map<K, number[]>): void => {
            for (const [k, ts] of store.entries()) {
                const active = ts.filter((t) => t > windowStart);
                if (active.length === 0) store.delete(k);
                else store.set(k, active);
            }
        };
        sweep(this.cookieBursts);
        sweep(this.apiKeyBursts);
        sweep(this.ipBursts);
    }
}
