import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SetPriceHistory } from 'src/core/set/set-price-history.entity';
import { SetPriceHistoryRepositoryPort } from 'src/core/set/ports/set-price-history.repository.port';
import { Repository } from 'typeorm';
import { SetPriceHistoryMapper } from './set-price-history.mapper';
import { SetPriceHistoryOrmEntity } from './set-price-history.orm-entity';

@Injectable()
export class SetPriceHistoryRepository implements SetPriceHistoryRepositoryPort {
    constructor(
        @InjectRepository(SetPriceHistoryOrmEntity)
        private readonly repo: Repository<SetPriceHistoryOrmEntity>
    ) {}

    async findBySetCode(setCode: string, days?: number): Promise<SetPriceHistory[]> {
        const qb = this.repo
            .createQueryBuilder('sph')
            .leftJoinAndSelect('sph.set', 'set')
            .where('set.code = :setCode', { setCode })
            .orderBy('sph.date', 'ASC');

        if (days != null && days > 0) {
            qb.andWhere('sph.date >= CURRENT_DATE - :days::int', { days });
        }

        const results = await qb.getMany();
        return results.map(SetPriceHistoryMapper.toCore);
    }
}
