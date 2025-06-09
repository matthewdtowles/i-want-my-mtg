import { Inject, Injectable, Logger } from "@nestjs/common";
import { Set, SetRepositoryPort } from "src/core/set";

@Injectable()
export class SetService {
    private readonly LOGGER: Logger = new Logger(SetService.name);

    /**
     * @param repository
     */
    constructor(@Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort) { }

    async save(sets: Set[]): Promise<Set[]> {
        this.LOGGER.debug(`Calling save`);
        return await this.repository.save(sets);
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
