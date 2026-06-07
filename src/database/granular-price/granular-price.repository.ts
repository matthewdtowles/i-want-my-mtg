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
        // granular_price holds one row per series (current offer), so this is a
        // direct read -- no date-ordering or dedup needed.
        const rows = await this.repo
            .createQueryBuilder('gp')
            .where('gp.cardId = :cardId', { cardId })
            .andWhere('gp.priceType = :type', { type: 'buylist' })
            .getMany();
        return rows.map(GranularPriceMapper.toCore);
    }
}
