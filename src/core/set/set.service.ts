import { Inject, Injectable } from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { getLogger } from "src/logger/global-app-logger";
import { Set } from "./set.entity";
import { SetRepositoryPort } from "./set.repository.port";

@Injectable()
export class SetService {

    private readonly LOGGER = getLogger(SetService.name);

    constructor(@Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort) { }

    async save(sets: Set[]): Promise<number> {
        this.LOGGER.debug(`Calling save`);
        return await this.repository.save(sets);
    }

    async findSets(query: SafeQueryOptions): Promise<Set[]> {
        this.LOGGER.debug(`Calling findSets(page: ${JSON.stringify(query)})`);
        return await this.repository.findAllSetsMeta(query);
    }

    async findByCode(setCode: string): Promise<Set | null> {
        this.LOGGER.debug(`Calling findByCode(${setCode})`);
        return await this.repository.findByCode(setCode);
    }

    async totalSetsCount(options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Calling getTotalSetsCount(filter: ${options.filter})`);
        const result = await this.repository.totalSets(options);
        this.LOGGER.debug(`Total sets: ${result}`);
        return result;
    }
}
