import { Inject, Injectable } from '@nestjs/common';
import { IngestionServicePort } from '../ingestion/ingestion.service.port';
import { CreateSetDto } from './dto/create-set.dto';
import { SetDto } from './dto/set.dto';
import { SetRepositoryPort } from './ports/set.repository.port';
import { SetServicePort } from './ports/set.service.port';

@Injectable()
export class SetService implements SetServicePort {

    constructor(
        @Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort,
        @Inject(IngestionServicePort) private readonly ingestionService: IngestionServicePort,
    ) { }


    save(set: CreateSetDto[]): Promise<SetDto[]> {
        throw new Error('Method not implemented.');
    }

    findByCode(setCode: string): Promise<SetDto> {
        throw new Error('Method not implemented.');
    }

    findAll(): Promise<SetDto[]> {
        throw new Error('Method not implemented.');
    }

    findAllInFormat(format: string): Promise<SetDto[]> {
        throw new Error('Method not implemented.');
    }
}
