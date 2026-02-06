import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PendingUserRepository } from 'src/database/user/pending-user.repository';
import { getLogger } from 'src/logger/global-app-logger';

@Injectable()
export class PendingUserCleanupService {
    private readonly LOGGER = getLogger(PendingUserCleanupService.name);

    constructor(
        @Inject(PendingUserRepository)
        private readonly pendingUserRepository: PendingUserRepository
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredPendingUsers(): Promise<void> {
        const deleted = await this.pendingUserRepository.deleteExpired();
        if (deleted > 0) {
            this.LOGGER.debug(`Cleaned up ${deleted} expired pending user registrations`);
        }
    }
}
