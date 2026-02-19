import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    OnModuleDestroy,
} from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';

const MAX_UPLOADS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class UploadRateLimitGuard implements CanActivate, OnModuleDestroy {
    private readonly LOGGER = getLogger(UploadRateLimitGuard.name);
    private readonly uploads = new Map<number, number[]>();
    private readonly cleanupTimer: NodeJS.Timeout;

    constructor() {
        this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
        // Allow Node to exit even if this timer is still pending
        if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }

    onModuleDestroy(): void {
        clearInterval(this.cleanupTimer);
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const userId: number = request.user?.id;

        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const now = Date.now();
        const windowStart = now - WINDOW_MS;
        const userUploads = (this.uploads.get(userId) ?? []).filter((t) => t > windowStart);

        if (userUploads.length >= MAX_UPLOADS) {
            this.LOGGER.warn(`Rate limit exceeded for user ${userId}.`);
            throw new HttpException(
                'Too Many Requests: upload limit is 10 per hour',
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        userUploads.push(now);
        this.uploads.set(userId, userUploads);
        return true;
    }

    /** Remove all users whose last upload falls outside the rate-limit window. */
    private cleanup(): void {
        const windowStart = Date.now() - WINDOW_MS;
        for (const [userId, timestamps] of this.uploads.entries()) {
            const active = timestamps.filter((t) => t > windowStart);
            if (active.length === 0) {
                this.uploads.delete(userId);
            } else {
                this.uploads.set(userId, active);
            }
        }
        this.LOGGER.debug(`Rate-limit cleanup: ${this.uploads.size} active users.`);
    }
}
