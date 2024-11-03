import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreateSetDto, SetDto } from "./api/set.dto";
import { SetRepositoryPort } from "./api/set.repository.port";
import { SetServicePort } from "./api/set.service.port";
import { Set } from "./set.entity";
import { SetMapper } from "./set.mapper";

@Injectable()
export class SetService implements SetServicePort {
    private readonly LOGGER: Logger = new Logger(SetService.name);

    /**
     * @param repository
     * @param mapper
     */
    constructor(
        @Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort,
        @Inject(SetMapper) private readonly mapper: SetMapper,
    ) { }

    async save(setDtos: CreateSetDto[]): Promise<SetDto[]> {
        const setEntities: Set[] = this.mapper.dtosToEntities(setDtos);
        const savedSetEntities: Set[] = await this.repository.save(setEntities);
        return this.mapper.entitiesToDtos(savedSetEntities);
    }

    async findAll(): Promise<SetDto[]> {
        this.LOGGER.debug(`Calling findAll()`);
        const setEntities: Set[] = await this.repository.findAllSetsMeta();
        this.LOGGER.debug(`Found: ${setEntities ? setEntities.length : "not an array"}`);
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
