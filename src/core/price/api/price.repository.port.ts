import { Price } from "src/core/price/price.entity";

export const PriceRepositoryPort = "PriceRepositoryPort";

export interface PriceRepositoryPort {

    /**
     * Creates price entity, updates if exists
     * 
     * @param {Price} price
     * @returns {Promise<Price>} saved price
     */
    saveOne(price: Price): Promise<Price>;

    /**
     * Saves multiple price entities, updates if they exist
     * 
     * @param {Price[]} prices
     * @returns {Promise<Price[]>} saved prices
     */
    save(prices: Price[]): Promise<Price[]>;

    /**
     * Finds a price by its id
     *
     *  @param {number} id The id of the price
     * @returns {Promise<Price>} The price with the given id
     */
    findById(id: number): Promise<Price>;

    /**
     * Finds a price by its cardId
     *
     * @param {number} cardId
     * @returns {Promise<Price>} The price with the given cardId
     */
    findByCardId(cardId: number): Promise<Price>;

    /**
     * Deletes a price by its id
     *
     * @param {number} id The id of the price
     * @returns {Promise<void>} A promise that resolves when the price is deleted 
     */
    delete(id: number): Promise<void>;
}