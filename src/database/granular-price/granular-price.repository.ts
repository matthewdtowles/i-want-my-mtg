import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GranularPrice } from 'src/core/card/granular-price.entity';
import { GranularPriceRepositoryPort } from 'src/core/card/ports/granular-price.repository.port';
import { Repository } from 'typeorm';
import { GranularPriceMapper } from './granular-price.mapper';
import { GranularPriceOrmEntity } from './granular-price.orm-entity';

@Injectable()
export class GranularPriceRepository implements GranularPriceRepositoryPort {
    constructor(
        @InjectRepository(GranularPriceOrmEntity)
        private readonly repo: Repository<GranularPriceOrmEntity>
    ) {}

    async findCurrentBuylistByCardId(cardId: string): Promise<GranularPrice[]> {
        const rows = await this.repo
            .createQueryBuilder('gp')
            .where('gp.cardId = :cardId', { cardId })
            .andWhere('gp.priceType = :type', { type: 'buylist' })
            .orderBy('gp.date', 'DESC')
            .getMany();

        // Keep the most recent row per provider/finish/condition. Rows are
        // date-DESC, so the first one seen for a key is the current offer.
        const current = new Map<string, GranularPriceOrmEntity>();
        for (const row of rows) {
            const key = `${row.provider}|${row.finish}|${row.condition}`;
            if (!current.has(key)) {
                current.set(key, row);
            }
        }
        return Array.from(current.values()).map(GranularPriceMapper.toCore);
    }
}
