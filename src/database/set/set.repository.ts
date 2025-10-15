import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { Repository } from "typeorm";
import { SetMapper } from "./set.mapper";
import { SetOrmEntity } from "./set.orm-entity";
import { QueryOptionsDto } from "src/core/query/query-options.dto";

@Injectable()
export class SetRepository implements SetRepositoryPort {

    constructor(@InjectRepository(SetOrmEntity) private readonly setRepository: Repository<SetOrmEntity>) { }

    async save(sets: Set[]): Promise<number> {
        const savedSets: SetOrmEntity[] = await this.setRepository.save(sets) ?? [];
        return savedSets.length ?? 0;
    }

    async findAllSetsMeta(options: QueryOptionsDto): Promise<Set[]> {
        const qb = this.setRepository.createQueryBuilder("set").where("set.baseSize > 0");
        if (options.filter) {
            const fragments = options.filter.split(" ").filter(f => f.length > 0);
            fragments.forEach((fragment, i) => {
                qb.andWhere(`set.name ILIKE :fragment${i}`, { [`fragment${i}`]: `%${fragment}%` });
            });
        }
        qb.skip((options.page - 1) * options.limit).take(options.limit);
        qb.orderBy("set.releaseDate", "DESC").addOrderBy("set.name", "ASC");
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

    async totalSets(filter?: string): Promise<number> {
        const qb = this.setRepository.createQueryBuilder("set").where("set.baseSize > 0");
        if (filter) {
            const fragments = filter.split(" ").filter(f => f.length > 0);
            fragments.forEach((fragment, i) => {
                qb.andWhere(`set.name ILIKE :fragment${i}`, { [`fragment${i}`]: `%${fragment}%` });
            });
        }
        return await qb.getCount();
    }

    async delete(set: Set): Promise<void> {
        await this.setRepository.delete(set);
    }
}
