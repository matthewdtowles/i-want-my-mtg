import { Inject, Injectable } from '@nestjs/common';
import { Set } from './set';
import { SetServicePort } from './ports/set.service.port';
import { SetDataIngestionPort } from './ports/set-data.ingestion.port';
import { SetRepositoryPort } from './ports/set.repository.port';

@Injectable()
export class SetService implements SetServicePort {

    constructor(
        @Inject(SetDataIngestionPort) private readonly ingestionService: SetDataIngestionPort,
        @Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort
    ) {}

    async create(set: Set): Promise<Set> {
        throw new Error('Method not implemented.');
    }

    async findByCode(setCode: string): Promise<Set> {
        throw new Error('Method not implemented.');
     }
 
    async findAll(): Promise<Set[]> {
        throw new Error('Method not implemented.');
    }

    async findAllInFormat(format: string): Promise<Set[]> {
        throw new Error('Method not implemented.');
    }

    async update(set: Set): Promise<Set> {
        throw new Error('Method not implemented.');
    }
}
