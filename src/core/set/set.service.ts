import { Inject, Injectable, Logger } from '@nestjs/common';
import { IngestionServicePort } from '../ingestion/ingestion.service.port';
import { CreateSetDto } from './dto/create-set.dto';
import { SetDto } from './dto/set.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { SetRepositoryPort } from './ports/set.repository.port';
import { SetServicePort } from './ports/set.service.port';
import { Set } from './set.entity';
import { SetMapper } from './set.mapper';

@Injectable()
export class SetService implements SetServicePort {

    private readonly LOGGER: Logger = new Logger(SetService.name);

    /**
     * @param repository 
     * @param ingestionService used by Ingest decorator
     */
    constructor(
        @Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort,
        @Inject(IngestionServicePort) private readonly ingestionService: IngestionServicePort,
        @Inject(SetMapper) private readonly mapper: SetMapper,
    ) { }


    async save(setDtos: CreateSetDto[] | UpdateSetDto[]): Promise<SetDto[]> {
        const setEntities: Set[] = this.mapper.dtosToEntities(setDtos);
        const savedSetEntities: Set[] = await this.repository.save(setEntities);
        return this.mapper.entitiesToDtos(savedSetEntities);
    }

    async findAll(): Promise<SetDto[]> {
        this.LOGGER.debug(`Calling findAll()`);
        const setEntities: Set[] = await this.repository.findAllSetsMeta();
        this.LOGGER.debug(`setEntities found: ${setEntities ? setEntities.length : 'not an array'}`);
        return this.mapper.entitiesToDtos(setEntities);
    }

    async findAllInFormat(format: string): Promise<SetDto[]> {
        // TODO: update when we track legality
        const setEntities: Set[] = await this.repository.findAllSetsMeta();
        return this.mapper.entitiesToDtos(setEntities);
    }

    async findByCode(setCode: string): Promise<SetDto> {
        const setEntity: Set = await this.repository.findByCode(setCode);
        return this.mapper.entityToDto(setEntity);
    }
}
