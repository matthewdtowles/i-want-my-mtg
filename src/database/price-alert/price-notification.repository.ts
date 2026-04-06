import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceNotification } from 'src/core/price-alert/price-notification.entity';
import { PriceNotificationRepositoryPort } from 'src/core/price-alert/ports/price-notification.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { DataSource, Repository } from 'typeorm';
import { PriceNotificationMapper } from './price-notification.mapper';
import { PriceNotificationOrmEntity } from './price-notification.orm-entity';

@Injectable()
export class PriceNotificationRepository implements PriceNotificationRepositoryPort {
    private readonly LOGGER = getLogger(PriceNotificationRepository.name);

    constructor(
        @InjectRepository(PriceNotificationOrmEntity)
        private readonly repo: Repository<PriceNotificationOrmEntity>,
        private readonly dataSource: DataSource
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

    async findByUserWithCardData(
        userId: number,
        page: number,
        limit: number
    ): Promise<PriceNotification[]> {
        const rows = await this.dataSource.query(
            `SELECT
                n.id, n.user_id, n.card_id, n.alert_id, n.direction,
                n.old_price, n.new_price, n.change_pct, n.is_read, n.created_at,
                c.name AS card_name, c.number AS card_number, c.set_code
            FROM price_notification n
            JOIN card c ON c.id = n.card_id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3`,
            [userId, limit, (page - 1) * limit]
        );

        return rows.map(
            (row: {
                id: number;
                user_id: number;
                card_id: string;
                alert_id: number | null;
                direction: 'increase' | 'decrease';
                old_price: string;
                new_price: string;
                change_pct: string;
                is_read: boolean;
                created_at: Date;
                card_name: string;
                card_number: string;
                set_code: string;
            }) =>
                new PriceNotification({
                    id: row.id,
                    userId: row.user_id,
                    cardId: row.card_id,
                    alertId: row.alert_id,
                    direction: row.direction,
                    oldPrice: Number(row.old_price),
                    newPrice: Number(row.new_price),
                    changePct: Number(row.change_pct),
                    isRead: row.is_read,
                    createdAt: row.created_at,
                    cardName: row.card_name,
                    cardNumber: row.card_number,
                    setCode: row.set_code,
                })
        );
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
