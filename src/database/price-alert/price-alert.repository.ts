import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceAlert } from 'src/core/price-alert/price-alert.entity';
import {
    AlertWithPriceData,
    PriceAlertRepositoryPort,
} from 'src/core/price-alert/ports/price-alert.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { DataSource, In, Repository } from 'typeorm';
import { PriceAlertMapper } from './price-alert.mapper';
import { PriceAlertOrmEntity } from './price-alert.orm-entity';

@Injectable()
export class PriceAlertRepository implements PriceAlertRepositoryPort {
    private readonly LOGGER = getLogger(PriceAlertRepository.name);

    constructor(
        @InjectRepository(PriceAlertOrmEntity)
        private readonly repo: Repository<PriceAlertOrmEntity>,
        private readonly dataSource: DataSource
    ) {
        this.LOGGER.debug('Instantiated.');
    }

    async create(alert: PriceAlert): Promise<PriceAlert> {
        const orm = PriceAlertMapper.toOrmEntity(alert);
        const saved = await this.repo.save(orm);
        return PriceAlertMapper.toCore(saved);
    }

    async findById(id: number): Promise<PriceAlert | null> {
        const orm = await this.repo.findOneBy({ id });
        return orm ? PriceAlertMapper.toCore(orm) : null;
    }

    async findByUserAndCard(userId: number, cardId: string): Promise<PriceAlert | null> {
        const orm = await this.repo.findOneBy({ userId, cardId });
        return orm ? PriceAlertMapper.toCore(orm) : null;
    }

    async findByUser(userId: number, page: number, limit: number): Promise<PriceAlert[]> {
        const orms = await this.repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return orms.map(PriceAlertMapper.toCore);
    }

    async countByUser(userId: number): Promise<number> {
        return this.repo.countBy({ userId });
    }

    async findActiveWithPriceData(): Promise<AlertWithPriceData[]> {
        const rows = await this.dataSource.query(`
            SELECT
                a.id, a.user_id, a.card_id, a.increase_pct, a.decrease_pct,
                a.is_active, a.last_notified_at, a.created_at, a.updated_at,
                c.name AS card_name,
                c.set_code,
                p.normal AS current_price,
                ph.normal AS previous_price
            FROM price_alert a
            JOIN card c ON c.id = a.card_id
            LEFT JOIN price p ON p.card_id = a.card_id
            LEFT JOIN LATERAL (
                SELECT ph2.normal
                FROM price_history ph2
                WHERE ph2.card_id = a.card_id
                  AND ph2.date < CURRENT_DATE
                ORDER BY ph2.date DESC
                LIMIT 1
            ) ph ON true
            WHERE a.is_active = true
        `);

        interface AlertPriceRow {
            id: number;
            user_id: number;
            card_id: string;
            increase_pct: string | null;
            decrease_pct: string | null;
            is_active: boolean;
            last_notified_at: Date | null;
            created_at: Date;
            updated_at: Date;
            card_name: string;
            set_code: string;
            current_price: string | null;
            previous_price: string | null;
        }

        return (rows as AlertPriceRow[]).map((row) => ({
            alert: new PriceAlert({
                id: row.id,
                userId: row.user_id,
                cardId: row.card_id,
                increasePct: row.increase_pct != null ? Number(row.increase_pct) : null,
                decreasePct: row.decrease_pct != null ? Number(row.decrease_pct) : null,
                isActive: row.is_active,
                lastNotifiedAt: row.last_notified_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }),
            cardName: row.card_name,
            setCode: row.set_code,
            currentPrice: row.current_price != null ? Number(row.current_price) : null,
            previousPrice: row.previous_price != null ? Number(row.previous_price) : null,
        }));
    }

    async update(alert: PriceAlert): Promise<PriceAlert> {
        const orm = PriceAlertMapper.toOrmEntity(alert);
        orm.updatedAt = new Date();
        const saved = await this.repo.save(orm);
        return PriceAlertMapper.toCore(saved);
    }

    async delete(id: number): Promise<void> {
        await this.repo.delete(id);
    }

    async updateLastNotifiedAt(ids: number[], date: Date): Promise<void> {
        if (ids.length === 0) return;
        await this.repo.update({ id: In(ids) }, { lastNotifiedAt: date, updatedAt: date });
    }
}
