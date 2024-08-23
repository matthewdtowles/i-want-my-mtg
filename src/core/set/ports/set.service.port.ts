import { CreateSetDto } from '../dto/create-set.dto';
import { SetDto } from '../dto/set.dto';
import { UpdateSetDto } from '../dto/update-set.dto';

export const SetServicePort = 'SetServicePort';

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
    create(set: CreateSetDto): Promise<SetDto>;

    /**
     * Return set including cards with code
     * 
     * @param setCode 
     */
    findByCode(setCode: string): Promise<SetDto>;

    /**
     * Return metadata of every set
     * Does not include cards
     */
    findAll(): Promise<SetDto[]>;

    /**
     * Return metadata of every set in format
     * Does not include cards
     * 
     * @param format
     */
    findAllInFormat(format: string): Promise<SetDto[]>;

    /**
     * Update set that exists
     * Return updated set
     * 
     * @param set
     */
    update(set: UpdateSetDto): Promise<SetDto>;
}