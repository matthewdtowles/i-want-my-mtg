import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Set } from '../../core/set/set.entity';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';

@Injectable()
export class SetRepository implements SetRepositoryPort {

    private readonly LOGGER: Logger = new Logger(SetRepository.name);

    constructor(
        @InjectRepository(Set) private readonly setRepository: Repository<Set>,
    ) { }

    async save(sets: Set[]): Promise<Set[]> {
        if (!sets) {
            let msg = `Invalid input`;
            this.LOGGER.error(msg);
            throw new Error(msg);
        } else if (sets.length === 0) {
            let msg = `Invalid input. Sets array given is empty.`;
            this.LOGGER.error(msg);
            throw new Error(msg)
        }
        this.LOGGER.debug(`saving ${sets.length} total sets`);
        const saveSets: Set[] = [];
        await Promise.all(sets.map(async (s) => {
            if (!s) {
                let msg = `Invalid set in sets. Total valid sets scanned: ${saveSets.length}`;
                this.LOGGER.error(msg);
                throw new Error(msg);
            }
            this.LOGGER.debug(`save set s: ${s}`)
            const existingSet: Set = await this.findByCode(s.code);
            const updatedSet = this.setRepository.merge(s, existingSet);
            saveSets.push(updatedSet);
        }));
        return await this.setRepository.save(saveSets) ?? [];
    }

    async findByCode(code: string): Promise<Set | null> {
        return await this.setRepository.findOne({ 
            where: { 
                code: code 
            }, 
            relations: ['cards'],
        }); 
    }

    async findByName(setName: string): Promise<Set | null> {
        return await this.setRepository.findOne({
            where: {
                name: setName
            },
            relations: ['cards'],
        });
    }

    async findAllSetsMeta(): Promise<Set[]> {
        return await this.setRepository.find() ?? [];
    }

    async delete(set: Set): Promise<void> {
        await this.setRepository.delete(set);
    }
}