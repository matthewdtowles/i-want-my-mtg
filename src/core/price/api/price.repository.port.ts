import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { Price } from "src/core/price/price.entity";

export const PriceRepositoryPort = "PriceRepositoryPort";

export interface PriceRepositoryPort {

    /**
     * Creates a price entity in memory and returns it
     * 
     * @param {CreatePriceDto} priceDto
     * @returns {Price} created price
     */
    create(priceDto: CreatePriceDto): Price;

    /**
     * Saves multiple price entities, updates if they exist
     * 
     * @param {Price[]} prices
     * @returns {Promise<Price[]>} saved prices
     */
    save(prices: Price[]): Promise<Price[]>;

    /**
     * Creates price entity, updates if exists
     * 
     * @param {Price} price
     * @returns {Promise<Price>} saved price
     */
    saveOne(price: Price): Promise<Price>;

    /**
     * Finds a price by its cardId
     * 
     * @param cardId
     * @returns {Promise<Price>} The price with the given cardId
     */
    findByCardId(cardId: number): Promise<Price>;

    /**
     * Finds a price by its cardName
     *
     * @param cardName
     * @returns {Promise<Price[]>} The prices with the given cardName
     */
    findByCardName(cardName: string): Promise<Price[]>;

    /**
     * Finds a price by its cardName and setCode
     *
     * @param cardName
     * @param setCode
     * @returns {Promise<Price>} The price with the given cardName and setCode
     */
    findByCardNameAndSetCode(cardName: string, setCode: string): Promise<Price>;

    /**
     * Finds a price by its setCode
     *
     * @param setCode
     * @returns {Promise<Price[]>} The prices with the given setCode
     */
    findByCardSet(setCode: string): Promise<Price[]>;

    /**
     * Finds a price by its id
     *
     *  @param {number} id The id of the price
     * @returns {Promise<Price>} The price with the given id
     */
    findById(id: number): Promise<Price>;

    /**
     * Deletes a price by its id
     *
     * @param {number} id The id of the price
     * @returns {Promise<void>} A promise that resolves when the price is deleted 
     */
    delete(id: number): Promise<void>;
}