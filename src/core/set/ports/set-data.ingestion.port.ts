import { Set } from '../set';

/**
 * Port to ingest set data from external provider
 * Used by Core
 * Implemented by Adapters
 */
export interface SetDataIngestionPort {

    /**
     * Fetch all sets
     * Includes all cards
     */
    fetchAllSets(): Promise<Set[]>;

    /**
     * Fetch set with code
     * Includes cards
     * 
     * @param code three letter set code
     */
    fetchSetByCode(code: string): Promise<Set>;

    /**
     * Fetch metadata for all sets
     * Excludes cards
     */
    fetchAllSetsMeta(): Promise<Set[]>;

    /**
     * Fetch metadata for set with code
     * Excludes cards
     * 
     * @param code three letter set code
     */
    fetchSetMetaByCode(code: string): Promise<Set>;
}