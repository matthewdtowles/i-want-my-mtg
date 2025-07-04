import { Price } from "src/core/price/price.entity";

export const PriceRepositoryPort = "PriceRepositoryPort";

export interface PriceRepositoryPort {

    /**
     * Saves multiple price entities, updates if they exist
     * 
     * @param {Price[]} prices
     */
    save(prices: Price[]): Promise<void>;

    /**
     * Deletes a price by its id
     *
     * @param {number} id The id of the price
     * @returns {Promise<void>} A promise that resolves when the price is deleted 
     */
    delete(id: number): Promise<void>;

}