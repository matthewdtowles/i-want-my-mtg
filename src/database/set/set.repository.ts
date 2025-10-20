import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { Repository } from "typeorm";
import { SetMapper } from "./set.mapper";
import { SetOrmEntity } from "./set.orm-entity";

@Injectable()
export class SetRepository implements SetRepositoryPort {

    constructor(@InjectRepository(SetOrmEntity) private readonly setRepository: Repository<SetOrmEntity>) { }

    async save(sets: Set[]): Promise<number> {
        const savedSets: SetOrmEntity[] = await this.setRepository.save(sets) ?? [];
        return savedSets.length ?? 0;
    }

    async findAllSetsMeta(options: SafeQueryOptions): Promise<Set[]> {
        const qb = this.setRepository.createQueryBuilder("set").where("set.baseSize > 0");
        if (options.filter) {
            const fragments = options.filter.split(" ").filter(f => f.length > 0);
            fragments.forEach((fragment, i) => {
                qb.andWhere(`set.name ILIKE :fragment${i}`, { [`fragment${i}`]: `%${fragment}%` });
            });
        }
        qb.skip((options.page - 1) * options.limit).take(options.limit);
        if (options.sort) {
            const ascend = options.ascend ? "ASC" : "DESC";
            qb.orderBy(`set.${options.sort}`, ascend)
        } else {
            qb.orderBy("set.releaseDate", "DESC").addOrderBy("set.name", "ASC");
        }
        const setMetaList: SetOrmEntity[] = await qb.getMany();
        return setMetaList.map((set: SetOrmEntity) => SetMapper.toCore(set));
    }

    async findByCode(code: string): Promise<Set | null> {
        const set: SetOrmEntity = await this.setRepository.findOne({
            where: {
                code
            },
        });
        return set ? SetMapper.toCore(set) : null;
    }

    async totalSets(options: SafeQueryOptions): Promise<number> {
        const qb = this.setRepository.createQueryBuilder("set").where("set.baseSize > 0");
        // TODO: create function for this with the set.name part parameterized
        if (options.filter) {
            options.filter
                .split(" ")
                .filter(f => f.length > 0)
                .forEach((fragment, i) =>
                    qb.andWhere(
                        `set.name ILIKE :fragment${i}`,
                        { [`fragment${i}`]: `%${fragment}%` }
                    )
                )
        }
        return await qb.getCount();
    }

    async delete(set: Set): Promise<void> {
        await this.setRepository.delete(set);
    }
}
