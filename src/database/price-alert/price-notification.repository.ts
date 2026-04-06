import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceNotification } from 'src/core/price-alert/price-notification.entity';
import { PriceNotificationRepositoryPort } from 'src/core/price-alert/ports/price-notification.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { PriceNotificationMapper } from './price-notification.mapper';
import { PriceNotificationOrmEntity } from './price-notification.orm-entity';

@Injectable()
export class PriceNotificationRepository implements PriceNotificationRepositoryPort {
    private readonly LOGGER = getLogger(PriceNotificationRepository.name);

    constructor(
        @InjectRepository(PriceNotificationOrmEntity)
        private readonly repo: Repository<PriceNotificationOrmEntity>
    ) {
        this.LOGGER.debug('Instantiated.');
    }

    async createMany(notifications: PriceNotification[]): Promise<PriceNotification[]> {
        if (notifications.length === 0) return [];
        const orms = notifications.map(PriceNotificationMapper.toOrmEntity);
        const saved = await this.repo.save(orms);
        return saved.map(PriceNotificationMapper.toCore);
    }

    async findByUser(userId: number, page: number, limit: number): Promise<PriceNotification[]> {
        const orms = await this.repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return orms.map(PriceNotificationMapper.toCore);
    }

    async countByUser(userId: number): Promise<number> {
        return this.repo.countBy({ userId });
    }

    async countUnreadByUser(userId: number): Promise<number> {
        return this.repo.countBy({ userId, isRead: false });
    }

    async markAsRead(id: number, userId: number): Promise<number> {
        const result = await this.repo.update({ id, userId }, { isRead: true });
        return result.affected ?? 0;
    }

    async markAllAsRead(userId: number): Promise<void> {
        await this.repo.update({ userId, isRead: false }, { isRead: true });
    }
}
