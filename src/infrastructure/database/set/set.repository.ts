import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { SetMapper } from "src/infrastructure/database/set/set.mapper";
import { SetOrmEntity } from "src/infrastructure/database/set/set.orm-entity";
import { ILike, MoreThan, Repository } from "typeorm";

@Injectable()
export class SetRepository implements SetRepositoryPort {

    constructor(@InjectRepository(SetOrmEntity) private readonly setRepository: Repository<SetOrmEntity>) { }

    async save(sets: Set[]): Promise<number> {
        const savedSets: SetOrmEntity[] = await this.setRepository.save(sets) ?? [];
        return savedSets.length ?? 0;
    }

    async findAllSetsMeta(page: number, limit: number, filter?: string): Promise<Set[]> {
        const qb = this.setRepository.createQueryBuilder("set").where("set.baseSize > 0");
        if (filter) {
            const fragments = filter.split(" ").filter(f => f.length > 0);
            fragments.forEach((fragment, i) => {
                qb.andWhere(`set.name ILIKE :fragment${i}`, { [`fragment${i}`]: `%${fragment}%` });
            });
        }
        qb.skip((page - 1) * limit).take(limit);
        qb.orderBy("set.releaseDate", "DESC").addOrderBy("set.name", "ASC");
        const setMetaList: SetOrmEntity[] = await qb.getMany();
        return setMetaList.map((set: SetOrmEntity) => SetMapper.toCore(set));
    }

    async findByCode(code: string, filter?: string): Promise<Set | null> {
        const set: SetOrmEntity = await this.setRepository.findOne({
            where: {
                code,
                ...(filter && filter.length > 0 ? { name: ILike(`%${filter}%`) } : {})
            },
        });
        return set ? SetMapper.toCore(set) : null;
    }

    async totalSets(filter?: string): Promise<number> {
        return await this.setRepository.count({
            where: {
                baseSize: MoreThan(0),
                ...(filter && filter.length > 0 ? { name: ILike(`%${filter}%`) } : {})
            },
        });
    }

    async delete(set: Set): Promise<void> {
        await this.setRepository.delete(set);
    }
}
