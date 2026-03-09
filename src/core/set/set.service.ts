import { Inject, Injectable } from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { SetPriceHistory } from './set-price-history.entity';
import { SetPriceHistoryRepositoryPort } from './ports/set-price-history.repository.port';
import { Set } from './set.entity';
import { SetRepositoryPort } from './ports/set.repository.port';

@Injectable()
export class SetService {
    private readonly LOGGER = getLogger(SetService.name);

    constructor(
        @Inject(SetRepositoryPort) private readonly repository: SetRepositoryPort,
        @Inject(SetPriceHistoryRepositoryPort)
        private readonly priceHistoryRepository: SetPriceHistoryRepositoryPort
    ) {}

    async findSets(query: SafeQueryOptions): Promise<Set[]> {
        this.LOGGER.debug(`Calling findSets.`);
        return await this.repository.findAllSetsMeta(query);
    }

    async findBlockGroupKeys(options: SafeQueryOptions): Promise<string[]> {
        this.LOGGER.debug(`Calling findBlockGroupKeys.`);
        return await this.repository.findBlockGroupKeys(options);
    }

    async totalBlockGroups(options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Calling totalBlockGroups.`);
        return await this.repository.totalBlockGroups(options);
    }

    async findSetsByBlockKeys(blockKeys: string[], options: SafeQueryOptions): Promise<Set[]> {
        this.LOGGER.debug(`Calling findSetsByBlockKeys for ${blockKeys.length} keys.`);
        return await this.repository.findSetsByBlockKeys(blockKeys, options);
    }

    async findMultiSetBlockKeys(blockKeys: string[]): Promise<string[]> {
        this.LOGGER.debug(`Calling findMultiSetBlockKeys for ${blockKeys.length} keys.`);
        return await this.repository.findMultiSetBlockKeys(blockKeys);
    }

    async findSpoilerSets(): Promise<Set[]> {
        this.LOGGER.debug(`Calling findSpoilerSets.`);
        return await this.repository.findSpoilerSets();
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

    async searchSets(filter: string, options: SafeQueryOptions): Promise<Set[]> {
        this.LOGGER.debug(`Search sets: ${filter}.`);
        try {
            return await this.repository.searchSets(filter, options);
        } catch (error) {
            throw new Error(`Error searching sets for "${filter}": ${error.message}`);
        }
    }

    async totalSearchSets(filter: string): Promise<number> {
        this.LOGGER.debug(`Count set search results for: ${filter}.`);
        try {
            return await this.repository.totalSearchSets(filter);
        } catch (error) {
            throw new Error(`Error counting set search results for "${filter}": ${error.message}`);
        }
    }

    async totalCardsInSet(setCode: string, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Find total number of cards in set ${setCode}.`);
        try {
            const total = await this.repository.totalInSet(setCode, options);
            this.LOGGER.debug(`Total cards in set ${setCode}: ${total}.`);
            return total;
        } catch (error) {
            throw new Error(`Error counting cards in set ${setCode}: ${error.message}`);
        }
    }

    async totalValueForSet(
        setCode: string,
        includeFoil: boolean,
        options: SafeQueryOptions
    ): Promise<number> {
        this.LOGGER.debug(
            `Get total value of cards in set ${setCode} ${includeFoil ? 'with foils' : ''}, baseOnly: ${options.baseOnly}.`
        );
        try {
            const total = await this.repository.totalValueForSet(setCode, includeFoil, options);
            this.LOGGER.debug(
                `Total value for set ${setCode} ${includeFoil ? 'with foils' : ''}: ${total}.`
            );
            return total;
        } catch (error) {
            throw new Error(
                `Error getting total value of ${includeFoil ? '' : 'non-foil '}cards for set ${setCode}: ${error.message}.`
            );
        }
    }

    async findSetPriceHistory(setCode: string, days?: number): Promise<SetPriceHistory[]> {
        this.LOGGER.debug(`Find set price history for set ${setCode}, days=${days}.`);
        try {
            const prices = await this.priceHistoryRepository.findBySetCode(setCode, days);
            this.LOGGER.debug(
                `Found ${prices?.length} set price history records for set ${setCode}.`
            );
            return prices;
        } catch (error) {
            throw new Error(`Error finding set price history for set ${setCode}: ${error.message}`);
        }
    }
}
