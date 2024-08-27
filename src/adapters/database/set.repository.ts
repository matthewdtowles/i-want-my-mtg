import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Set } from '../../core/set/set.entity';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';

@Injectable()
export class SetRepository implements SetRepositoryPort {

    constructor(
        @InjectRepository(Set)
        private readonly setRepository: Repository<Set>,
    ) { }

    async save(sets: Set[]): Promise<Set[]> {
        return await this.setRepository.save(sets);
    }

    async findByCode(code: string): Promise<Set | null> {
        return await this.setRepository.findOne({ 
            where: { 
                setCode: code 
            }, 
            relations: ['card'],
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