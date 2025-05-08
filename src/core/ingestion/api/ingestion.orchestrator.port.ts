import { CardDto } from "src/core/card/api/card.dto";
import { SetDto } from "src/core/set/api/set.dto";

export const IngestionOrchestratorPort = "IngestionOrchestratorPort";

/**
 * Interface representing the ingestion orchestrator port.
 * Provides methods for ingesting metadata, cards, and prices from external sources.
 */
export interface IngestionOrchestratorPort {

    /**
     * Ingests metadata for all sets, excluding card details.
     * 
     * @returns {Promise<SetDto[]>} A promise that resolves to an array of set metadata (SetDto).
     */
    ingestAllSetMeta(): Promise<SetDto[]>;

    /**
     * Ingests all sets along with their associated card details.
     * 
     * @returns {Promise<SetDto[]>} A promise that resolves to an array of sets with card details (SetDto).
     */
    ingestAllSetCards(): Promise<SetDto[]>;

    /**
     * Ingests all cards for a specific set identified by its code.
     * 
     * @param {string} code - The three-letter code representing the set.
     * @returns {Promise<CardDto[]>} A promise that resolves to an array of card details (CardDto) for the specified set.
     */
    ingestSetCards(code: string): Promise<CardDto[]>;

    /**
     * Ingests today's price data from an external provider.
     */
    ingestTodayPrices(): Promise<void>;

    /**
     * Fills missing prices for cards with NULL normal and foil prices.
     */
    fillMissingPrices(): Promise<void>;
}
