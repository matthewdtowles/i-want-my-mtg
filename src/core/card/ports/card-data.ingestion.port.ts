import { Card } from '../card';

export const CardDataIngestionPort = 'CardDataIngestionPort';

/**
 * Port to ingest card data from external provider
 * Used by Core
 * Implemented by Adapters
 */
export interface CardDataIngestionPort {

    /**
     * Fetch all cards in set with code
     * 
     * @param string three letter set code
     */
    fetchSetCards(code: string): Promise<Card[]>;

    /**
     * Fetch card with uuid
     * 
     * @param uuid
     */
    fetchCard(uuid: string): Promise<Card>;
}