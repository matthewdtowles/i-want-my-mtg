import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    OnModuleDestroy,
} from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';

const MAX_REQUESTS = 60;
const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class ApiRateLimitGuard implements CanActivate, OnModuleDestroy {
    private readonly LOGGER = getLogger(ApiRateLimitGuard.name);
    private readonly requests = new Map<number, number[]>();
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
            // Allow unauthenticated API requests (public endpoints) without rate limiting by user
            return true;
        }

        const now = Date.now();
        const windowStart = now - WINDOW_MS;
        const userRequests = (this.requests.get(userId) ?? []).filter((t) => t > windowStart);

        if (userRequests.length >= MAX_REQUESTS) {
            this.LOGGER.warn(`API rate limit exceeded for user ${userId}.`);
            throw new HttpException(
                'Too Many Requests: API rate limit is 60 requests per minute',
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        userRequests.push(now);
        this.requests.set(userId, userRequests);
        return true;
    }

    private cleanup(): void {
        const windowStart = Date.now() - WINDOW_MS;
        for (const [userId, timestamps] of this.requests.entries()) {
            const active = timestamps.filter((t) => t > windowStart);
            if (active.length === 0) {
                this.requests.delete(userId);
            } else {
                this.requests.set(userId, active);
            }
        }
        this.LOGGER.debug(`API rate-limit cleanup: ${this.requests.size} active users.`);
    }
}
