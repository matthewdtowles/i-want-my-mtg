import { Inject, Injectable, Logger } from "@nestjs/common";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/set.repository.port";

@Injectable()
export class SetService {
    private readonly LOGGER: Logger = new Logger(SetService.name);

    constructor(@Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort) { }

    async save(sets: Set[]): Promise<number> {
        this.LOGGER.debug(`Calling save`);
        return await this.repository.save(sets);
    }

    async findSets(page: number, limit: number, filter?: string): Promise<Set[]> {
        this.LOGGER.debug(`Calling findSets(page: ${page}, limit: ${limit}, filter: ${filter})`);
        return await this.repository.findAllSetsMeta(page, limit, filter);
    }

    async findByCode(setCode: string): Promise<Set | null> {
        this.LOGGER.debug(`Calling findByCode(${setCode})`);
        return await this.repository.findByCode(setCode);
    }

    async totalSetsCount(filter?: string): Promise<number> {
        this.LOGGER.debug(`Calling getTotalSetsCount(filter: ${filter})`);
        return await this.repository.totalSets(filter);
    }
}
