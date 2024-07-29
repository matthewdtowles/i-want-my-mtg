import { Set } from "../set.entity";

export interface SetRepositoryPort {

    /**
     * Returns all Set meta data for every Set
     * Cards not included
     */
    findAllSets(): Promise<Set[] | null>;

    /**
     * Returns all Set data and all Cards in the Set for given Set code
     * 
     * @param code set code
     */
    findSetByCode(code: string): Promise<Set | null>;

    /**
     * Save given Set entity
     * 
     * @param set set code
     */
    saveSet(set: Set): Promise<Set>;
}