import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BuyListItem } from 'src/core/buy-list/buy-list-item.entity';
import { BuyListRepositoryPort } from 'src/core/buy-list/ports/buy-list.repository.port';
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
        // Join the card, its latest price row (so the page shows prices), and
        // its set (keyrune code), mirroring the inventory read.
        const items = await this.repository
            .createQueryBuilder('bl')
            .leftJoinAndSelect('bl.card', 'card')
            .leftJoinAndSelect(
                'card.prices',
                'prices',
                'prices.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = card.id)'
            )
            .leftJoinAndSelect('card.set', 'set')
            .where('bl.userId = :userId', { userId })
            .orderBy('bl.createdAt', 'DESC')
            .getMany();
        return items.map((i) => BuyListMapper.toCore(i));
    }

    async findOne(userId: number, cardId: string, isFoil: boolean): Promise<BuyListItem | null> {
        const item = await this.repository.findOne({ where: { userId, cardId, isFoil } });
        return item ? BuyListMapper.toCore(item) : null;
    }

    async save(item: BuyListItem): Promise<BuyListItem> {
        const saved = await this.repository.save(BuyListMapper.toOrmEntity(item));
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
        await this.repository.delete({ userId, cardId, isFoil });
    }

    async clear(userId: number): Promise<void> {
        await this.repository.delete({ userId });
    }

    async countByUser(userId: number): Promise<number> {
        return await this.repository.count({ where: { userId } });
    }
}
