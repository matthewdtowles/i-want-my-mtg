import { Legality } from "src/core/legality/legality.entity";

export const LegalityServicePort = "LegalityServicePort";

export interface LegalityServicePort {
    /**
     * Create legality entities, update if they exist
     * 
     * @param legalities 
     * @returns saved legalities
     */
    save(legalities: Legality[]): Promise<Legality[]>;

    /**
     * Find all legality entities with card id
     * 
     * @param cardId
     * @returns legality entities with card id
     */
    findAllByCard(cardId: number): Promise<Legality[]>;

    /**
     * Find all legality entities with card id and format
     * 
     * @param cardId
     * @param format
     * @returns legality entities with card id and format
     */
    findAllByCardAndFormat(cardId: number, format: string): Promise<Legality[]>;
}