export const IngestionOrchestratorPort = "IngestionOrchestratorPort";

/**
 * Interface representing the ingestion orchestrator port.
 * Provides methods for ingesting metadata, cards, and prices from external sources.
 */
export interface IngestionOrchestratorPort {

    /**
     * Ingests metadata for all sets, excluding card details.
     */
    ingestAllSetMeta(): Promise<void>;

    /**
     * Ingests all sets along with their associated card details.
     */
    ingestAllSetCards(): Promise<void>;

    /**
     * Ingests all cards for a specific set identified by its code.
     * 
     * @param {string} code - The three-letter code representing the set.
     */
    ingestSetCards(code: string): Promise<void>;

    /**
     * Ingests today's price data from an external provider.
     */
    ingestTodayPrices(): Promise<void>;

    /**
     * Fills missing prices for cards with NULL normal and foil prices.
     */
    fillMissingPrices(): Promise<void>;
}
