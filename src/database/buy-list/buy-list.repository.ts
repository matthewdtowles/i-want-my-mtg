import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BuyListItem } from 'src/core/buy-list/buy-list-item.entity';
import { BuyListRepositoryPort } from 'src/core/buy-list/ports/buy-list.repository.port';
import { latestPriceCondition } from 'src/database/query/latest-price.sql';
import { activeEntityManager } from 'src/database/transaction-runner';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { BuyListMapper } from './buy-list.mapper';
import { BuyListOrmEntity } from './buy-list.orm-entity';

@Injectable()
export class BuyListRepository implements BuyListRepositoryPort {
    private readonly LOGGER = getLogger(BuyListRepository.name);

    constructor(
        @InjectRepository(BuyListOrmEntity)
        private readonly repository: Repository<BuyListOrmEntity>
    ) {}

    async findByUser(userId: number): Promise<BuyListItem[]> {
        this.LOGGER.debug(`findByUser ${userId}.`);
        // Join the card, its latest price row (for display + the 6.5 optimizer's
        // retail total), and its set (keyrune code), mirroring the inventory read.
        const items = await this.repository
            .createQueryBuilder('bl')
            .leftJoinAndSelect('bl.card', 'card')
            .leftJoinAndSelect(
                'card.prices',
                'prices',
                latestPriceCondition('prices', 'card')
            )
            .leftJoinAndSelect('card.set', 'set')
            .where('bl.userId = :userId', { userId })
            .orderBy('bl.createdAt', 'DESC')
            .getMany();
        return items.map((i) => BuyListMapper.toCore(i));
    }

    /**
     * The repository bound to the active transaction when one is open,
     * otherwise the default. Mutations and the locking read go through this so
     * the delta-quantity path commits atomically (see TransactionRunner).
     */
    private repo(): Repository<BuyListOrmEntity> {
        return activeEntityManager()?.getRepository(BuyListOrmEntity) ?? this.repository;
    }

    async findOne(userId: number, cardId: string, isFoil: boolean): Promise<BuyListItem | null> {
        const item = await this.repository.findOne({ where: { userId, cardId, isFoil } });
        return item ? BuyListMapper.toCore(item) : null;
    }

    async findOneForUpdate(
        userId: number,
        cardId: string,
        isFoil: boolean
    ): Promise<BuyListItem | null> {
        this.LOGGER.debug(`findOneForUpdate ${cardId} (foil=${isFoil}) for user ${userId}.`);
        const item = await this.repo()
            .createQueryBuilder('bl')
            .setLock('pessimistic_write')
            .where('bl.userId = :userId', { userId })
            .andWhere('bl.cardId = :cardId', { cardId })
            .andWhere('bl.isFoil = :isFoil', { isFoil })
            .getOne();
        return item ? BuyListMapper.toCore(item) : null;
    }

    async save(item: BuyListItem): Promise<BuyListItem> {
        const saved = await this.repo().save(BuyListMapper.toOrmEntity(item));
        return BuyListMapper.toCore(saved);
    }

    async increment(
        userId: number,
        cardId: string,
        isFoil: boolean,
        delta: number
    ): Promise<number> {
        const rows = await this.repository.query(
            `INSERT INTO buy_list (user_id, card_id, foil, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, card_id, foil)
             DO UPDATE SET quantity = buy_list.quantity + EXCLUDED.quantity
             RETURNING quantity`,
            [userId, cardId, isFoil, delta]
        );
        return Number(rows[0]?.quantity ?? delta);
    }

    async delete(userId: number, cardId: string, isFoil: boolean): Promise<void> {
        await this.repo().delete({ userId, cardId, isFoil });
    }

    async clear(userId: number): Promise<void> {
        await this.repository.delete({ userId });
    }

    async countByUser(userId: number): Promise<number> {
        return await this.repository.count({ where: { userId } });
    }
}
