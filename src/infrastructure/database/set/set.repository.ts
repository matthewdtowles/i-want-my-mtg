import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Set, SetRepositoryPort } from "src/core/set";
import { SetOrmEntity } from "src/infrastructure/database/set/set.orm-entity";
import { MoreThan, Repository } from "typeorm";

@Injectable()
export class SetRepository implements SetRepositoryPort {

    constructor(
        @InjectRepository(SetOrmEntity) private readonly setRepository: Repository<SetOrmEntity>,
        private readonly mapper: { mapToSets: (sets: SetOrmEntity[]) => Set[] },
    ) { }

    async save(sets: Set[]): Promise<Set[]> {
        //TODO MAP
        const savedSets: SetOrmEntity[] = await this.setRepository.save(sets);
        return this.mapper.mapToSets(savedSets);
    }

    async findAllSetsMeta(): Promise<Set[]> {
        // TODO IMPL -- was this accidentally deleted? Check history
        throw new Error("Method not implemented.");
    }


    async findByCode(code: string): Promise<Set | null> {
        const set: SetOrmEntity = await this.setRepository.findOne({
            where: { code: code, },
            order: {
                cards: {
                    id: "ASC",
                },
            },
            relations: ["cards", "cards.prices"],
        });
        // TODO MAP
        return set ?? null;
    }

    async findAllSetOrmEntitysMeta(): Promise<Set[]> {
        return (await this.setRepository.find({
            where: { baseSize: MoreThan(0), },
            order: {
                releaseDate: "DESC",
                name: "ASC",
            },
        })) ?? [];
    }

    async delete(set: Set): Promise<void> {
        await this.setRepository.delete(set);
    }
}
