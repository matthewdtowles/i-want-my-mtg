import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { Set } from 'src/core/set/set.entity';
import { SetRepositoryPort } from 'src/core/set/set.repository.port';
import { BaseRepository } from 'src/database/base.repository';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SetMapper } from './set.mapper';
import { SetOrmEntity } from './set.orm-entity';
import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';

@Injectable()
export class SetRepository extends BaseRepository<SetOrmEntity> implements SetRepositoryPort {
    private readonly LOGGER = getLogger(SetRepository.name);

    readonly TABLE = 'set';

    constructor(
        @InjectRepository(SetOrmEntity) protected readonly repository: Repository<SetOrmEntity>
    ) {
        super();
        this.LOGGER.debug(`Instantiated.`);
    }

    async findAllSetsMeta(options: SafeQueryOptions): Promise<Set[]> {
        this.LOGGER.debug(`Finding all sets meta.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.setPrice`, 'setPrice');
        if (options.baseOnly) {
            qb.where(`${this.TABLE}.baseSize > 0`);
        }
        this.addFilters(qb, options.filter);
        this.addPagination(qb, options);
        this.addSetOrdering(qb, options);
        const results = (await qb.getMany()).map((set: SetOrmEntity) => SetMapper.toCore(set));
        this.LOGGER.debug(`Found ${results.length} sets.`);
        return results;
    }

    async findByCode(code: string): Promise<Set | null> {
        this.LOGGER.debug(`Finding set by code: ${code}.`);
        const set: SetOrmEntity = await this.repository.findOne({
            where: { code },
            relations: ['setPrice'],
        });
        this.LOGGER.debug(`Set ${set ? 'found' : 'not found'} for code: ${code}.`);
        return set ? SetMapper.toCore(set) : null;
    }

    async totalSets(options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting total sets.`);
        const qb = this.repository.createQueryBuilder(this.TABLE);
        if (options.baseOnly) {
            qb.where(`${this.TABLE}.baseSize > 0`);
        }
        this.addFilters(qb, options.filter);
        const count = await qb.getCount();
        this.LOGGER.debug(`Total sets: ${count}.`);
        return count;
    }

    async totalInSet(code: string, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Get total cards in set: ${code}`);
        const set = await this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.code = :code`, { code })
            .getOne();
        if (!set) {
            this.LOGGER.debug(`Set not found: ${code}.`);
            return 0;
        }
        return options.baseOnly ? (set.baseSize ?? 0) : (set.totalSize ?? 0);
    }

    async totalValueForSet(
        code: string,
        includeFoil: boolean,
        options: SafeQueryOptions
    ): Promise<number> {
        const priceColumn = PriceCalculationPolicy.setPriceColumn(includeFoil, options.baseOnly);
        this.LOGGER.debug(`Get ${priceColumn} for set ${code}`);

        const result = await this.repository.query(
            `SELECT ${priceColumn} AS total_value FROM set_price WHERE set_code = $1`,
            [code]
        );
        return Number(result[0]?.total_value ?? 0);
    }

    private addSetOrdering(qb: SelectQueryBuilder<SetOrmEntity>, options: SafeQueryOptions): void {
        if (!options.sort) {
            // Default: release date desc, then name asc
            qb.orderBy(`${this.TABLE}.releaseDate`, this.DESC, this.NULLS_LAST);
            qb.addOrderBy(`${this.TABLE}.name`, this.ASC, this.NULLS_LAST);
            return;
        }

        const direction = options.ascend ? this.ASC : this.DESC;

        if (options.sort === SortOptions.SET_BASE_PRICE) {
            // Use addSelect with raw SQL for COALESCE, then order by the alias
            qb.addSelect(
                `COALESCE(NULLIF(setPrice.basePrice, 0), NULLIF(setPrice.basePriceAll, 0), NULLIF(setPrice.totalPrice, 0), setPrice.totalPriceAll)`,
                'effective_price'
            ).orderBy('effective_price', direction, this.NULLS_LAST);
        } else {
            qb.orderBy(options.sort, direction, this.NULLS_LAST);
        }
    }
}
