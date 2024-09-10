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
        this.LOGGER.debug(`saving ${sets.length} total sets`);
        const saveSets: Set[] = [];
        await Promise.all(sets.map(async (s) => {
            const existingSet: Set = await this.findByCode(s.code);
            const updatedSet = this.setRepository.merge(existingSet, s);
            saveSets.push(await this.setRepository.save(updatedSet));
        }));
        return await this.setRepository.save(saveSets);
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