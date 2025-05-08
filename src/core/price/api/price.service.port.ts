import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { PriceDto } from "src/core/price/api/price.dto";

export const PriceServicePort = Symbol("PriceServicePort");

/**
 * Interface representing the contract for a Price Service.
 * Provides methods for saving and retrieving price data associated with cards.
 */
export interface PriceServicePort {
    /**
     * Saves given price entries.
     * 
     * @param prices - An array of price data transfer objects to be saved.
     */
    save(price: CreatePriceDto[]): Promise<void>;

    /**
     * Finds a price entry by the card's unique identifier.
     * 
     * @param cardId - The unique identifier of the card.
     * @returns A promise that resolves to the price data transfer object or null if not found.
     */
    findByCardId(cardId: number): Promise<PriceDto | null>;

    /**
     * Deletes a price entry by its unique identifier.
     * 
     * @param id - The unique identifier of the price entry to be deleted.
     * @returns A promise that resolves when the deletion is complete.
     */
    delete(id: number): Promise<void>;

    /**
     * Fills the price table with  entries for cards with NULL normal and foil prices.
     * 
     * @param date - The date to use for the new price entries.
     */
    fillMissingPrices(date: string): Promise<void>;
}