import { Set } from '../set.entity';

/**
 * Set operations service
 * Implemented by Core and used by Adapters
 */
export interface SetServicePort {

    /**
     * Saves an instance of the given Set entity if it does not exist
     * Returns true if saved, false otherwise
     * 
     * @param set
     */
    create(set: Set): Promise<boolean>;

    /**
     * Returns entire Set entity with given set code, including Cards in the Set
     * 
     * @param setCode 
     */
    findByCode(setCode: string): Promise<Set>;

    /**
     * Returns Set array of Set metadata of every set ever printed
     * Set metadata includes everything in Set entity other than Cards in the set
     */
    findAll(): Promise<Set[]>;

    /**
     * Returns Set array of Set metadata of every set legal in given format
     * 
     * @param format
     */
    findAllInFormat(format: string): Promise<Set[]>;

    /**
     * Updates an instance of given Set that already exists
     * Returns true if changed, false otherwise
     * 
     * @param set
     */
    update(set: Set): Promise<boolean>;
}