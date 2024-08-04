import { Set } from '../set';

/**
 * Set operations service
 * Implemented by Core and used by Adapters
 */
export interface SetServicePort {

    /**
     * Save set if not created
     * Return created Set
     * 
     * @param set
     */
    create(set: Set): Promise<Set>;

    /**
     * Return set including cards with code
     * 
     * @param setCode 
     */
    findByCode(setCode: string): Promise<Set>;

    /**
     * Return metadata of every set
     * Does not include cards
     */
    findAll(): Promise<Set[]>;

    /**
     * Return metadata of every set in format
     * Does not include cards
     * 
     * @param format
     */
    findAllInFormat(format: string): Promise<Set[]>;

    /**
     * Update set that exists
     * Return updated set
     * 
     * @param set
     */
    update(set: Set): Promise<Set>;
}