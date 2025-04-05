import { PriceDto } from "src/core/price/api/price.dto";

export const PriceServicePort = Symbol("PriceServicePort");

/**
 * Interface representing the contract for a Price Service.
 * Provides methods for saving and retrieving price data associated with cards.
 */
export interface PriceServicePort {
    /**
     * Saves multiple price entries.
     * 
     * @param prices - An array of price data transfer objects to be saved.
     * @returns A promise that resolves to the saved price data transfer objects.
     */
    save(prices: PriceDto[]): Promise<PriceDto[]>;

    /**
     * Saves a single price entry.
     * 
     * @param price - A price data transfer object to be saved.
     * @returns A promise that resolves to the saved price data transfer object.
     */
    saveOne(price: PriceDto): Promise<PriceDto>;

    /**
     * Finds a price entry by the card's unique identifier.
     * 
     * @param cardId - The unique identifier of the card.
     * @returns A promise that resolves to the price data transfer object or null if not found.
     */
    findByCardId(cardId: number): Promise<PriceDto | null>;

    /**
     * Finds price entries by the card's name.
     * 
     * @param cardName - The name of the card.
     * @returns A promise that resolves to an array of price data transfer objects.
     */
    findByCardName(cardName: string): Promise<PriceDto[]>;

    /**
     * Finds a price entry by the card's name and set code.
     * 
     * @param cardName - The name of the card.
     * @param setCode - The code of the set the card belongs to.
     * @returns A promise that resolves to the price data transfer object or null if not found.
     */
    findByCardNameAndSetCode(cardName: string, setCode: string): Promise<PriceDto | null>;

    /**
     * Finds price entries by the set code.
     * 
     * @param setCode - The code of the set.
     * @returns A promise that resolves to an array of price data transfer objects.
     */
    findByCardSet(setCode: string): Promise<PriceDto[]>;

    /**
     * Finds a price entry by its unique identifier.
     * 
     * @param id - The unique identifier of the price entry.
     * @returns A promise that resolves to the price data transfer object or null if not found.
     */
    findById(id: number): Promise<PriceDto | null>;

    /**
     * Deletes a price entry by its unique identifier.
     * 
     * @param id - The unique identifier of the price entry to be deleted.
     * @returns A promise that resolves when the deletion is complete.
     */
    delete(id: number): Promise<void>;
}