import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { BaseRepository } from "src/database/base.repository";
import { Repository, SelectQueryBuilder } from "typeorm";
import { SetMapper } from "./set.mapper";
import { SetOrmEntity } from "./set.orm-entity";

@Injectable()
export class SetRepository extends BaseRepository<SetOrmEntity> implements SetRepositoryPort {

    readonly TABLE = "set";

    constructor(@InjectRepository(SetOrmEntity) private readonly setRepository: Repository<SetOrmEntity>) {
        super();
    }

    async save(sets: Set[]): Promise<number> {
        const savedSets: SetOrmEntity[] = await this.setRepository.save(sets) ?? [];
        return savedSets.length ?? 0;
    }

    async findAllSetsMeta(options: SafeQueryOptions): Promise<Set[]> {
        const qb = this.createBaseQuery();
        this.addFilters(qb, options.filter);
        qb.skip((options.page - 1) * options.limit).take(options.limit);
        options.sort
            ? qb.orderBy(`${options.sort}`, options.ascend ? this.ASC : this.DESC)
            : qb.orderBy(`${SortOptions.RELEASE_DATE}`, this.DESC)
                .addOrderBy(`${SortOptions.SET}`, this.ASC);
        return (await qb.getMany()).map((set: SetOrmEntity) => SetMapper.toCore(set));
    }

    async findByCode(code: string): Promise<Set | null> {
        const set: SetOrmEntity = await this.setRepository.findOne({
            where: { code },
        });
        return set ? SetMapper.toCore(set) : null;
    }

    async totalSets(options: SafeQueryOptions): Promise<number> {
        const qb = this.createBaseQuery();
        this.addFilters(qb, options.filter);
        return await qb.getCount();
    }

    async delete(set: Set): Promise<void> {
        await this.setRepository.delete(set);
    }

    private createBaseQuery(): SelectQueryBuilder<SetOrmEntity> {
        return this.setRepository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.baseSize > 0`);
    }
}
