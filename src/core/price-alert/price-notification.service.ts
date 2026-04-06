import { Inject, Injectable } from '@nestjs/common';
import { DomainNotFoundError } from 'src/core/errors/domain.errors';
import { PriceNotification } from './price-notification.entity';
import { PriceNotificationRepositoryPort } from './ports/price-notification.repository.port';

@Injectable()
export class PriceNotificationService {
    constructor(
        @Inject(PriceNotificationRepositoryPort)
        private readonly repository: PriceNotificationRepositoryPort
    ) {}

    async findByUser(userId: number, page: number, limit: number): Promise<PriceNotification[]> {
        return this.repository.findByUser(userId, page, limit);
    }

    async countByUser(userId: number): Promise<number> {
        return this.repository.countByUser(userId);
    }

    async countUnreadByUser(userId: number): Promise<number> {
        return this.repository.countUnreadByUser(userId);
    }

    async markAsRead(id: number, userId: number): Promise<void> {
        const affected = await this.repository.markAsRead(id, userId);
        if (affected === 0) {
            throw new DomainNotFoundError('Notification not found');
        }
    }

    async markAllAsRead(userId: number): Promise<void> {
        return this.repository.markAllAsRead(userId);
    }
}
