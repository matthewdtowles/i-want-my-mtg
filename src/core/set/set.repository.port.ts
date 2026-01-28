import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { BaseRepositoryPort } from 'src/core/base.repository.port';
import { Set } from './set.entity';

export const SetRepositoryPort = 'SetRepositoryPort';

/**
 * Interface representing the repository port for managing Set entities.
 */
export interface SetRepositoryPort extends BaseRepositoryPort {
    /**
     * Retrieves metadata for Set entities with pagination.
     * @param {SafeQueryOptions} options - The query options for pagination and filtering.
     * @returns {Promise<Set[]>} A promise that resolves to an array of Set entities.
     */
    findAllSetsMeta(options: SafeQueryOptions): Promise<Set[]>;

    /**
     * Finds a Set entity by its unique three-letter code.
     * @param {string} code - The unique three-letter set code (primary key).
     * @returns {Promise<Set | null>} A promise that resolves to the Set entity if found, or null otherwise.
     */
    findByCode(code: string): Promise<Set | null>;

    /**
     * Counts the total number of Set entities.
     * @param {SafeQueryOptions} [options] - Optional criteria to search sets.
     * @returns {Promise<number>} A promise that resolves to the total count of Set entities.
     */
    totalSets(options: SafeQueryOptions): Promise<number>;

    /**
     * Gets the total number of cards in a set.
     *
     * @param code - The set code.
     * @param options - The query options used to filter which cards are counted.
     * @returns A promise that resolves to the total number of cards in the set.
     */
    totalInSet(code: string, options: SafeQueryOptions): Promise<number>;

    /**
     * Gets the total value of all foil|non-foil cards in a set.
     * @param code Set code.
     * @param includeFoil Include foil prices if true.
     * @param options Query options used to filter which cards are counted.
     * @returns Promise resolving to the total value of foil|non-foil cards in the set.
     */
    totalValueForSet(
        code: string,
        includeFoil: boolean,
        options: SafeQueryOptions
    ): Promise<number>;
}
