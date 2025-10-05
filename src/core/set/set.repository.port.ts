import { Set } from "./set.entity";

export const SetRepositoryPort = "SetRepositoryPort";

/**
 * Interface representing the repository port for managing Set entities.
 */
export interface SetRepositoryPort {

    /**
     * Creates or updates Set entities.
     *
     * @param {Set[]} set - The array of Set entities to save.
     * @returns {Promise<number>} A promise that resolves to the number of saved Set entities.
     */
    save(set: Set[]): Promise<number>;

    /**
     * Retrieves metadata for Set entities with pagination.
     *
     * @param {number} page - The page number (1-based index).
     * @param {number} limit - The number of items per page.
     * @param {string} [filter] - Optional filter string to search sets.
     * @returns {Promise<Set[]>} A promise that resolves to an array of Set entities.
     */
    findAllSetsMeta(page: number, limit: number, filter?: string): Promise<Set[]>;

    /**
     * Finds a Set entity by its unique three-letter code.
     *
     * @param {string} code - The unique three-letter set code (primary key).
     * @returns {Promise<Set | null>} A promise that resolves to the Set entity if found, or null otherwise.
     */
    findByCode(code: string): Promise<Set | null>;

    /**
     * Counts the total number of Set entities.
     *
     * @returns {Promise<number>} A promise that resolves to the total count of Set entities.
     */
    totalSets(): Promise<number>;

    /**
     * Removes a Set entity.
     *
     * @param {Set} set - The Set entity to remove.
     * @returns {Promise<void>} A promise that resolves when the Set entity is removed.
     */
    delete(set: Set): Promise<void>;
}
