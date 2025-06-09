import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { Set } from "src/core/set/set.entity";
import { SetOrmEntity } from "src/infrastructure/database/set/set.orm-entity";
import { MoreThan, Repository } from "typeorm";

@Injectable()
export class SetRepository implements SetRepositoryPort {

    constructor(
        @InjectRepository(SetOrmEntity) private readonly setRepository: Repository<SetOrmEntity>,
        private readonly mapper: { mapToSets: (sets: SetOrmEntity[]) => Set[] },
    ) { }

    async save(sets: SetOrmEntity[]): Promise<Set[]> {
        const savedSets: SetOrmEntity[] = await this.setRepository.save(sets);
        return this.mapper.mapToSets(savedSets);
    }

    async findByCode(code: string): Promise<SetOrmEntity | null> {
        const set: SetOrmEntity = await this.setRepository.findOne({
            where: { code: code, },
            order: {
                cards: {
                    id: "ASC",
                },
            },
            relations: ["cards", "cards.prices"],
        });
        return set ?? null;
    }

    async findAllSetOrmEntitysMeta(): Promise<SetOrmEntity[]> {
        return (await this.setRepository.find(
            {
                where: {
                    baseSize: MoreThan(0),
                },
                order: {
                    releaseDate: "DESC",
                    name: "ASC",
                },
            }
        )) ?? [];
    }

    async delete(set: SetOrmEntity): Promise<void> {
        await this.setRepository.delete(set);
    }
}
