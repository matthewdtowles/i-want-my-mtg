import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SetRepositoryPort } from "src/core/set/api/set.repository.port";
import { Set } from "src/core/set/set.entity";
import { Repository } from "typeorm";

@Injectable()
export class SetRepository implements SetRepositoryPort {
    private readonly LOGGER: Logger = new Logger(SetRepository.name);

    constructor(@InjectRepository(Set) private readonly setRepository: Repository<Set>) { }

    async save(sets: Set[]): Promise<Set[]> {
        if (!sets) {
            throw new Error(`Invalid input`);
        } else if (sets.length === 0) {
            throw new Error(`Invalid input. Sets array given is empty.`);
        }
        this.LOGGER.debug(`saving ${sets.length} total sets`);
        const saveSets: Set[] = [];
        await Promise.all(
            sets.map(async (s) => {
                if (!s) {
                    throw new Error(`Invalid set in sets.`);
                }
                const existingSet: Set = await this.findByCode(s.code);
                const updatedSet = this.setRepository.merge(s, existingSet);
                saveSets.push(updatedSet);
            }),
        );
        return (await this.setRepository.save(saveSets)) ?? [];
    }

    async findByCode(code: string): Promise<Set | null> {
        this.LOGGER.debug(`findByCode ${code}`);
        return await this.setRepository.findOne({
            where: { code: code, },
            relations: ["cards"],
        });
    }

    async findByName(setName: string): Promise<Set | null> {
        this.LOGGER.debug(`findByName ${setName}`);
        return await this.setRepository.findOne({
            where: { name: setName, },
            relations: ["cards"],
        });
    }

    async findAll(): Promise<Set[]> {
        this.LOGGER.debug(`findAll sets`);
        return (await this.setRepository.find({
            relations: ["cards"],
        })) ?? [];
    }

    async findAllSetsMeta(): Promise<Set[]> {
        this.LOGGER.debug(`findAllSetsMeta`);
        return (await this.setRepository.find()) ?? [];
    }

    async delete(set: Set): Promise<void> {
        this.LOGGER.debug(`delete ${set.code}`);
        await this.setRepository.delete(set);
    }
}
