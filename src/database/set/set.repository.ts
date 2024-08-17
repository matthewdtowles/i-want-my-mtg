import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetEntity } from './set.entity';
import { Set } from 'src/core/set/set';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';

@Injectable()
export class SetRepository implements SetRepositoryPort {

    constructor(
        @InjectRepository(SetEntity)
        private readonly setRepository: Repository<SetEntity>,
    ) { }

    async save(set: Set): Promise<Set> {
        return await this.setRepository.save(set);
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