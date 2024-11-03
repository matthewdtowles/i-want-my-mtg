import { CreateCardDto } from "../../card/api/card.dto";
import { CreateSetDto } from "../../set/api/set.dto";

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
     */
    fetchAllSetsMeta(): Promise<CreateSetDto[]>;

    /**
     * Fetch set with code
     * Includes cards
     *
     * @param code three letter set code
     */
    fetchSetByCode(code: string): Promise<CreateSetDto | null>;

    /**
     * Fetch all cards in set with code
     *
     * @param string three letter set code
     */
    fetchSetCards(code: string): Promise<CreateCardDto[]>;
}
