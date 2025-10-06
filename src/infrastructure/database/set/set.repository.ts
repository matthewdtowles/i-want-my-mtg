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
        const skip = (page - 1) * limit;
        const setMetaList: SetOrmEntity[] = await this.setRepository.find({
            where: {
                baseSize: MoreThan(0),
                ...(filter && filter.length > 0 ? { name: ILike(`%${filter}%`) } : {})
            },
            order: { releaseDate: "DESC", name: "ASC" },
            skip: skip,
            take: limit,
        });
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
