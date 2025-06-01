import { CreatePriceDto } from "src/core/price/api/create-price.dto";

export const PriceServicePort = Symbol("PriceServicePort");

/**
 * Interface representing the contract for a Price Service.
 * Read ops handled by other services, this service is for write ops.
 */
export interface PriceServicePort {
    /**
     * Saves given price entries.
     * 
     * @param prices - An array of price data transfer objects to be saved.
     */
    save(price: CreatePriceDto[]): Promise<void>;

    /**
     * Deletes a price entry by its unique identifier.
     * 
     * @param id - The unique identifier of the price entry to be deleted.
     * @returns A promise that resolves when the deletion is complete.
     */
    delete(id: number): Promise<void>;
}