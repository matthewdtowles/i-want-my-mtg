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

    constructor(@InjectRepository(SetOrmEntity) private readonly setRepository: Repository<SetOrmEntity>) {
        super();
        this.LOGGER.debug(`Instantiated.`);
    }

    async save(sets: Set[]): Promise<number> {
        this.LOGGER.debug(`Saving ${sets?.length ?? 0} sets.`);
        const savedSets: SetOrmEntity[] = await this.setRepository.save(sets) ?? [];
        const count = savedSets.length ?? 0;
        this.LOGGER.debug(`Saved ${count} sets.`);
        return count;
    }

    async findAllSetsMeta(options: SafeQueryOptions): Promise<Set[]> {
        this.LOGGER.debug(`Finding all sets meta.`);
        const qb = this.createBaseQuery();
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
        const set: SetOrmEntity = await this.setRepository.findOne({
            where: { code },
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

    async delete(set: Set): Promise<void> {
        this.LOGGER.debug(`Deleting set with code: ${set.code}.`);
        await this.setRepository.delete(set);
        this.LOGGER.debug(`Deleted set with code: ${set.code}.`);
    }

    private createBaseQuery(): SelectQueryBuilder<SetOrmEntity> {
        return this.setRepository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.baseSize > 0`);
    }
}
