import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";

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
    fetchAllSetsMeta(): Promise<CreateSetDto[]>;

    /**
     * Fetch set with code
     * Includes cards
     *
     * @param code three letter set code
     * @returns set with cards
     */
    fetchSetByCode(code: string): Promise<CreateSetDto | null>;

    // /**
    //  * Fetch all cards in set with code
    //  *
    //  * @param string three letter set code
    //  * @returns array of cards
    //  */
    // fetchSetCards(code: string): Promise<CreateCardDto[]>;

    /**
     * Fetch all cards in set with code as a stream
     *
     * @param string three letter set code
     * @returns AsyncGenerator of writable card DTO
     */
    fetchSetCards(code: string): AsyncGenerator<CreateCardDto>;

    /**
     * Fetch all prices for today as a stream
     *
     * @returns AsyncGenerator of writable price DTO
     */
    fetchTodayPrices(): AsyncGenerator<CreatePriceDto>;
}
