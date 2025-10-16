import { Inject, Injectable, Logger } from "@nestjs/common";
import { Set } from "./set.entity";
import { SetRepositoryPort } from "./set.repository.port";
import { QueryOptionsDto } from "../query/query-options.dto";

@Injectable()
export class SetService {
    private readonly LOGGER: Logger = new Logger(SetService.name);

    constructor(@Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort) { }

    async save(sets: Set[]): Promise<number> {
        this.LOGGER.debug(`Calling save`);
        return await this.repository.save(sets);
    }

    async findSets(query: QueryOptionsDto): Promise<Set[]> {
        this.LOGGER.debug(`Calling findSets(page: ${JSON.stringify(query)})`);
        return await this.repository.findAllSetsMeta(query);
    }

    async findByCode(setCode: string): Promise<Set | null> {
        this.LOGGER.debug(`Calling findByCode(${setCode})`);
        return await this.repository.findByCode(setCode);
    }

    async totalSetsCount(options: QueryOptionsDto): Promise<number> {
        this.LOGGER.debug(`Calling getTotalSetsCount(filter: ${options.filter})`);
        const result = await this.repository.totalSets(options.filter);
        this.LOGGER.debug(`Total sets: ${result}`);
        return result;
    }
}
