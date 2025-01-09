import { Legality } from "../legality.entity";

export const LegalityRepositoryPort = "LegalityRepositoryPort";

export interface LegalityRepositoryPort {
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
    findByCard(cardId: number): Promise<Legality[]>;

    /**
     * Find legality entity with for a card and format
     * 
     * @param cardId
     * @param format
     * @returns legality entity for card and format
     */
    findByCardAndFormat(cardId: number, format: string): Promise<Legality | null>;
}