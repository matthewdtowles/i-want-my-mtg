import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    OnModuleDestroy,
} from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';

const MAX_REQUESTS_USER = 200;
const MAX_REQUESTS_IP = 60;
const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class ApiRateLimitGuard implements CanActivate, OnModuleDestroy {
    private readonly LOGGER = getLogger(ApiRateLimitGuard.name);
    private readonly userRequests = new Map<number, number[]>();
    private readonly ipRequests = new Map<string, number[]>();
    private readonly cleanupTimer: NodeJS.Timeout;

    constructor() {
        this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
        // NOTE: In-memory, per-process. A shared store (e.g. Redis) would be needed
        // for global enforcement in a multi-instance deployment.
        if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }

    onModuleDestroy(): void {
        clearInterval(this.cleanupTimer);
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const userId: number = request.user?.id;

        if (!userId) {
            return this.checkIpLimit(request.ip);
        }

        return this.checkUserLimit(userId);
    }

    private checkUserLimit(userId: number): boolean {
        const now = Date.now();
        const windowStart = now - WINDOW_MS;
        const timestamps = (this.userRequests.get(userId) ?? []).filter((t) => t > windowStart);

        if (timestamps.length >= MAX_REQUESTS_USER) {
            this.LOGGER.warn(`API rate limit exceeded for user ${userId}.`);
            throw new HttpException(
                'Too Many Requests: API rate limit is 200 requests per minute',
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        timestamps.push(now);
        this.userRequests.set(userId, timestamps);
        return true;
    }

    private checkIpLimit(ip: string): boolean {
        const key = ip || 'unknown';
        const now = Date.now();
        const windowStart = now - WINDOW_MS;
        const timestamps = (this.ipRequests.get(key) ?? []).filter((t) => t > windowStart);

        if (timestamps.length >= MAX_REQUESTS_IP) {
            this.LOGGER.warn(`API rate limit exceeded for IP ${key}.`);
            throw new HttpException(
                'Too Many Requests: API rate limit exceeded',
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        timestamps.push(now);
        this.ipRequests.set(key, timestamps);
        return true;
    }

    private cleanup(): void {
        const windowStart = Date.now() - WINDOW_MS;
        for (const [userId, timestamps] of this.userRequests.entries()) {
            const active = timestamps.filter((t) => t > windowStart);
            if (active.length === 0) {
                this.userRequests.delete(userId);
            } else {
                this.userRequests.set(userId, active);
            }
        }
        for (const [ip, timestamps] of this.ipRequests.entries()) {
            const active = timestamps.filter((t) => t > windowStart);
            if (active.length === 0) {
                this.ipRequests.delete(ip);
            } else {
                this.ipRequests.set(ip, active);
            }
        }
        this.LOGGER.debug(
            `API rate-limit cleanup: ${this.userRequests.size} users, ${this.ipRequests.size} IPs.`
        );
    }
}
