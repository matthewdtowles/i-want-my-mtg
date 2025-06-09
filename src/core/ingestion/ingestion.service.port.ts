import { Card } from "src/core/card";
import { Price } from "src/core/price";
import { Set } from "src/core/set";


export const IngestionServicePort = "IngestionServicePort";

/**
 * Port to ingest card data from external provider
 * Used by Core
 * Implemented by Adapters
 */
export interface IngestionServicePort {

    /**
     * Fetch metadata for all sets
     * Excludes cards
     * 
     * @returns array of sets without cards
     */
    fetchAllSetsMeta(): Promise<Set[]>;

    /**
     * Fetch all cards in set with code as a stream
     *
     * @param string three letter set code
     * @returns AsyncGenerator of writable card
     */
    fetchSetCards(code: string): AsyncGenerator<Card>;

    /**
     * Fetch all prices for today as a stream
     *
     * @returns AsyncGenerator of writable price
     */
    fetchTodayPrices(): AsyncGenerator<Price>;
}
