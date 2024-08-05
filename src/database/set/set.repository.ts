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
    ) {}

    async saveSet(set: Set): Promise<Set> {
        const setEntity: SetEntity = this.mapToEntity(set);
        const savedSetEntity: SetEntity = await this.setRepository.save(setEntity);
        return this.mapFromEntity(savedSetEntity);
    }

    async findByCode(code: string): Promise<Set | null> {
        const setEntity: SetEntity = await this.setRepository.findOneBy({ setCode: code});
        return this.mapFromEntity(setEntity);    
    }

    async findByName(setName: string): Promise<Set | null> {
        const setEntity: SetEntity = await this.setRepository.findOneBy({ name: setName});
        return this.mapFromEntity(setEntity);
    }

    async findAllSets(): Promise<Set[] | null> {
        throw new Error('Method not implemented.');
    }

    async findAllSetsMeta(): Promise<Set[] | null> {
        throw new Error('Method not implemented.');
    }

    async setExists(set: Set): Promise<boolean> {
        return await this.setRepository.exists({ where: { setCode: set.setCode } });
    }

    async removeById(id: number): Promise<void> {
        await this.setRepository.delete(id);
    }

    async removeSet(set: Set): Promise<void> {
        await this.setRepository.delete(set.setCode);
    }

    private mapFromEntity(setEntity: SetEntity): Set {
        const set = new Set();
        set.baseSize = setEntity.baseSize;
        set.block = setEntity.block;
        set.cards = setEntity.cards;
        set.keyruneCode = setEntity.keyruneCode;
        set.name = setEntity.name;
        set.releaseDate = setEntity.releaseDate;
        set.setCode = setEntity.setCode;
        set.type = setEntity.type;
        return set;
    }

    private mapToEntity(set: Set): SetEntity {
        const setEntity = new SetEntity();
        setEntity.baseSize = set.baseSize;
        setEntity.block = set.block;
        setEntity.cards = set.cards;
        setEntity.keyruneCode = set.keyruneCode;
        setEntity.name = set.name;
        setEntity.releaseDate = set.releaseDate;
        setEntity.setCode = set.setCode;
        setEntity.type = set.type;
        return setEntity;
    }
}