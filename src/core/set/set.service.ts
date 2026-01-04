import { Inject, Injectable } from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { getLogger } from "src/logger/global-app-logger";
import { Set } from "./set.entity";
import { SetRepositoryPort } from "./set.repository.port";

@Injectable()
export class SetService {

    private readonly LOGGER = getLogger(SetService.name);

    constructor(@Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort) { }

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

    async totalCardsInSet(setCode: string, baseOnly?: boolean): Promise<number> {
        this.LOGGER.debug(`Find total number of cards in set ${setCode}.`);
        try {
            const total = await this.repository.totalInSet(setCode, baseOnly);
            this.LOGGER.debug(`Total cards in${baseOnly ? " main " : " "}set ${setCode}: ${total}.`);
            return total;
        } catch (error) {
            throw new Error(`Error counting cards in set ${setCode}: ${error.message}`);
        }
    }

    async totalValueForSet(setCode: string, includeFoil: boolean, baseOnly: boolean): Promise<number> {
        this.LOGGER.debug(`Get total value of cards in set ${setCode} ${includeFoil ? "with foils" : ""}.`);
        try {
            const total = await this.repository.totalValueForSet(setCode, includeFoil, baseOnly);
            this.LOGGER.debug(`Total value for set ${setCode} ${includeFoil ? "with foils" : ""} ${total}.`);
            return total;
        } catch (error) {
            throw new Error(`Error getting total value of ${includeFoil ? "" : "non-foil "}cards for set ${setCode}: ${error.message}.`);
        }
    }


}
