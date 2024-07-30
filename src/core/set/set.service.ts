import { Inject, Injectable } from '@nestjs/common';
import { Set } from './set.entity';
import { SetServicePort } from './ports/set.service.port';
import { SetDataIngestionPort } from './ports/set-data.ingestion.port';
import { InjectRepository } from '@nestjs/typeorm';
import { SetRepository } from './ports/set.repository';

@Injectable()
export class SetService implements SetServicePort {

    constructor(
        @Inject('SetDataIngestionPort') private readonly ingestionService: SetDataIngestionPort,
        @InjectRepository(SetRepository) private readonly repository: SetRepository,
    ) {}

    async create(set: Set): Promise<Set> {
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

    async update(set: Set): Promise<Set> {
        return null;
    }
}
