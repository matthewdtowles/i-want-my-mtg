import { Inject, Injectable, Logger } from "@nestjs/common";
import { Set, CreateSetDto, SetMapper, SetRepositoryPort } from "src/core/set";

@Injectable()
export class SetService {
    private readonly LOGGER: Logger = new Logger(SetService.name);

    /**
     * @param repository
     * @param mapper
     */
    constructor(
        @Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort,
        @Inject(SetMapper) private readonly mapper: SetMapper,
    ) { }

    async save(setDtos: CreateSetDto[]): Promise<Set[]> {
        this.LOGGER.debug(`Calling save`);
        const setEntities: Set[] = this.mapper.dtosToEntities(setDtos);
        return await this.repository.save(setEntities);
    }

    async findAll(): Promise<Set[]> {
        this.LOGGER.debug(`Calling findAll()`);
        return await this.repository.findAllSetsMeta();
    }

    async findByCode(setCode: string): Promise<Set | null> {
        this.LOGGER.debug(`Calling findByCode(${setCode})`);
        return await this.repository.findByCode(setCode);
    }
}
