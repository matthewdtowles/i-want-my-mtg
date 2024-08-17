import { Set } from '../set';

export const SetRepositoryPort = 'SetRepositoryPort';

/**
 * Persistence layer for Set entity
 */
export interface SetRepositoryPort {

    /**
     * Create set entity, update if entity exists
     * 
     * @param set
     */
    save(set: Set): Promise<Set | null>;

    /**
     * @param code 
     * @returns set entity with code, null if not found
     */
    findByCode(code: string): Promise<Set | null>; 

    /**
     * @param name 
     * @returns set entity with name, null if not found
     */
    findByName(name: string): Promise<Set | null>;

    /**
     * @returns all sets metadata without cards
     */
    findAllSetsMeta(): Promise<Set[]>; 

     /**
     * Remove set entity
     * 
     * @param set
     */
    delete(set: Set): Promise<void>;
}