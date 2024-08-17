import { Set } from '../set';

export const SetDataIngestionPort = 'SetDataIngestionPort';

/**
 * Port to ingest set data from external provider
 * Used by Core
 * Implemented by Adapters
 */
export interface SetDataIngestionPort {

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
    fetchSetByCode(code: string): Promise<Set>;
}