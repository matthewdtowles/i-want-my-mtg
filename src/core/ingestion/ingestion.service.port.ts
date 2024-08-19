import { Card } from '../card/card.entity';
import { Set } from '../set/set.entity';

export const IngestionServicePort = 'IngestionServicePort';

/**
 * Port to ingest card data from external provider
 * Used by Core
 * Implemented by Adapters
 */
export interface IngestionServicePort {

    /**
     * Fetch metadata for all sets
     * Excludes cards
     */
    fetchAllSetsMeta(): Promise<Set[]>;

    /**
     * Fetch set with code
     * Includes cards
     * 
     * @param code three letter set code
     */
    fetchSetByCode(code: string): Promise<Set | null>;

    /**
     * Fetch all cards in set with code
     * 
     * @param string three letter set code
     */
    fetchSetCards(code: string): Promise<Card[]>;
}