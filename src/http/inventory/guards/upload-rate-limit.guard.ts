import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';

const MAX_UPLOADS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class UploadRateLimitGuard implements CanActivate {
    private readonly LOGGER = getLogger(UploadRateLimitGuard.name);
    private readonly uploads = new Map<number, number[]>();

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
}
