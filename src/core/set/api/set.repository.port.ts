import { Set } from "../set.entity";

export const SetRepositoryPort = "SetRepositoryPort";

/**
 * Interface representing the repository port for managing Set entities.
 */
export interface SetRepositoryPort {

    /**
     * Creates or updates Set entities.
     *
     * @param {Set[]} set - The array of Set entities to save.
     * @returns {Promise<Set[]>} A promise that resolves to the saved Set entities.
     */
    save(set: Set[]): Promise<Set[]>;

    /**
     * Retrieves metadata for all Set entities without including cards.
     *
     * @returns {Promise<Set[]>} A promise that resolves to an array of Set entities.
     */
    findAllSetsMeta(): Promise<Set[]>;

    /**
     * Finds a Set entity by its unique three-letter code.
     *
     * @param {string} code - The unique three-letter set code (primary key).
     * @returns {Promise<Set | null>} A promise that resolves to the Set entity if found, or null otherwise.
     */
    findByCode(code: string): Promise<Set | null>;

    /**
     * Finds a Set entity by its unique name.
     *
     * @param {string} name - The unique name of the set.
     * @returns {Promise<Set | null>} A promise that resolves to the Set entity if found, or null otherwise.
     */
    findByName(name: string): Promise<Set | null>;

    /**
     * Removes a Set entity.
     *
     * @param {Set} set - The Set entity to remove.
     * @returns {Promise<void>} A promise that resolves when the Set entity is removed.
     */
    delete(set: Set): Promise<void>;
}
