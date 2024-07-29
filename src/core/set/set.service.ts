import { Inject, Injectable } from '@nestjs/common';
import { Set } from './set.entity';
import { SetServicePort } from './ports/set.service.port';
import { SetDataIngestionPort } from './ports/set-data.ingestion.port';
import { SetRepositoryPort } from './ports/set.repository.port';

@Injectable()
export class SetService implements SetServicePort {

    constructor(
        @Inject('SetDataIngestionPort') private readonly ingestionService: SetDataIngestionPort,
        @Inject('SetRepositoryPort') private readonly repositoryService: SetRepositoryPort,
    ) {}

    async create(set: Set): Promise<boolean> {
        return null;
    }

    async findByCode(setCode: string): Promise<Set> {
        return null;
     }
 
    async findAll(): Promise<Set[]> {
        return null;
    }

    async findAllInFormat(format: string): Promise<Set[]> {
        return null;
    }

    async update(set: Set): Promise<boolean> {
        return null;
    }
}
