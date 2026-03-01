import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistoryRepositoryPort } from 'src/core/card/price-history.repository.port';
import { Price } from 'src/core/card/price.entity';
import { Repository } from 'typeorm';
import { PriceHistoryMapper } from './price-history.mapper';
import { PriceHistoryOrmEntity } from './price-history.orm-entity';

@Injectable()
export class PriceHistoryRepository implements PriceHistoryRepositoryPort {
    constructor(
        @InjectRepository(PriceHistoryOrmEntity)
        private readonly repo: Repository<PriceHistoryOrmEntity>
    ) {}

    async findByCardId(cardId: string, days?: number): Promise<Price[]> {
        const qb = this.repo
            .createQueryBuilder('ph')
            .leftJoinAndSelect('ph.card', 'card')
            .where('card.id = :cardId', { cardId })
            .orderBy('ph.date', 'ASC');

        if (days != null && days > 0) {
            qb.andWhere('ph.date >= CURRENT_DATE - :days::int', { days });
        }

        const results = await qb.getMany();
        return results.map(PriceHistoryMapper.toCore);
    }
}
