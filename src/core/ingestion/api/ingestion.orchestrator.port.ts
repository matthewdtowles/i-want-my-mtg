import { CardDto } from "../../card/api/card.dto";
import { SetDto } from "../../set/api/set.dto";

export const IngestionOrchestratorPort = "IngestionOrchestratorPort";

/**
 * Port to ingest card data from external provider
 * Used by adapters
 * Implemented by core
 */
export interface IngestionOrchestratorPort {

    /**
     * Ingest all set metadata
     * Excludes cards
     * @returns SetDto[]
     */
    ingestAllSetMeta(): Promise<SetDto[]>;

    /**
     * Ingest all set cards
     * Includes cards
     * @returns SetDto[]
     */
    ingestAllSetCards(): Promise<SetDto[]>;

    /**
     * Ingest cards for set with code
     * @param code three letter set code
     * @returns CardDto[]
     */
    ingestSetCards(code: string): Promise<CardDto[]>;
}
