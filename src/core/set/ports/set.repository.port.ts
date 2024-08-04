import { Set } from '../set';

/**
 * Persistence layer for Set entity
 */
export interface SetRepositoryPort {

    /**
     * Create set entity, update if entity exists
     * 
     * @param set
     */
    saveSet(set: Set): Promise<Set>;

    /**
     * @param set 
     * @returns true if set entity exists, false otherwise
     */
    setExists(set: Set): Promise<boolean>;

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
     * @returns all sets with cards
     */
    findAllSets(): Promise<Set[] | null>;

    /**
     * @returns all sets metadata without cards
     */
    findAllSetsMeta(): Promise<Set[] | null>; 

    //TODO: is this valid or will setCode be used as PK?
    /**
     * Remove set entity with id
     * 
     * @param id
     */
    removeById(id: number): Promise <void>;

    /**
     * Remove set entity
     * 
     * @param set
     */
    removeSet(set: Set): Promise<void>;

}