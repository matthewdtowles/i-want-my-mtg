import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { BaseRepository } from "src/database/base.repository";
import { getLogger } from "src/logger/global-app-logger";
import { Repository, SelectQueryBuilder } from "typeorm";
import { SetMapper } from "./set.mapper";
import { SetOrmEntity } from "./set.orm-entity";

@Injectable()
export class SetRepository extends BaseRepository<SetOrmEntity> implements SetRepositoryPort {

    private readonly LOGGER = getLogger(SetRepository.name);

    readonly TABLE = "set";

    constructor(@InjectRepository(SetOrmEntity) protected readonly repository: Repository<SetOrmEntity>) {
        super();
        this.LOGGER.debug(`Instantiated.`);
    }

    async findAllSetsMeta(options: SafeQueryOptions): Promise<Set[]> {
        this.LOGGER.debug(`Finding all sets meta.`);
        const qb = this.createBaseQuery().leftJoinAndSelect(`${this.TABLE}.setPrice`, 'setPrice');
        this.addFilters(qb, options.filter);
        this.addPagination(qb, options);
        this.addOrdering(qb, options, SortOptions.RELEASE_DATE, true);
        // extra order clause for default
        if (!options.sort) qb.addOrderBy(`${SortOptions.SET}`, this.ASC, this.NULLS_LAST);
        const results = (await qb.getMany()).map((set: SetOrmEntity) => SetMapper.toCore(set));
        this.LOGGER.debug(`Found ${results.length} sets.`);
        return results;
    }

    async findByCode(code: string): Promise<Set | null> {
        this.LOGGER.debug(`Finding set by code: ${code}.`);
        const set: SetOrmEntity = await this.repository.findOne({
            where: { code },
            relations: ["setPrice"],
        });
        this.LOGGER.debug(`Set ${set ? "found" : "not found"} for code: ${code}.`);
        return set ? SetMapper.toCore(set) : null;
    }

    async totalSets(options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting total sets.`);
        const qb = this.createBaseQuery();
        this.addFilters(qb, options.filter);
        const count = await qb.getCount();
        this.LOGGER.debug(`Total sets: ${count}.`);
        return count;
    }

    async totalInSet(code: string, baseOnly: boolean): Promise<number> {
        this.LOGGER.debug(`Get total cards in${baseOnly ? " main " : " "}set: ${code}.`);
        const set = await this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.code = :code`, { code })
            .getOne();
        if (!set) {
            this.LOGGER.debug(`Set not found: ${code}.`);
            return 0;
        }
        return baseOnly ? (set.baseSize ?? 0) : (set.totalSize ?? 0);
    }

    async totalValueForSet(code: string, includeFoil: boolean, baseOnly: boolean): Promise<number> {
        this.LOGGER.debug(`Calculating total value for set ${code}${includeFoil ? " with foils" : ""}.`);
        const select_price = this.determineWhichPrice(includeFoil, baseOnly);
        const result = await this.repository.query(
            `SELECT ${select_price} AS total_value FROM set_price WHERE set_code = $1`,
            [code]
        );
        const total = Number(result[0]?.total_value ?? 0);
        this.LOGGER.debug(`${code.toUpperCase()} ${select_price} is \$${total}`)
        return total;
    }

    private determineWhichPrice(includeFoil: boolean, baseOnly: boolean): string {
        if (!includeFoil && baseOnly) {
            return "base_price";
        } else if (includeFoil && baseOnly) {
            return "total_price";
        } else if (!includeFoil && !baseOnly) {
            return "base_price_all";
        } else {
            return "total_price_all";
        }
    }

    private createBaseQuery(): SelectQueryBuilder<SetOrmEntity> {
        return this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.baseSize > 0`);
    }
}
