import { InventoryCardAggregateDto, InventorySetAggregateDto } from "./aggregate.dto";

export const AggregatorServicePort = "AggregatorServicePort";

export interface AggregatorServicePort {

    /**
     * Return all cards in inventory for given user
     *
     * @param userId 
     */
    findByUser(userId: number): Promise<InventoryCardAggregateDto[]>;

    /**
     * Returns set with inventory information for each card for given user
     *  - if card is not in user's inventory, quantity is 0
     *
     * @param setCode
     * @param userId - if invalid, return set with cards with quantity == 0
     * @returns set with aggregated cards (i.e.: with quantities)
     */
    findInventorySetByCode(setCode: string, userId: number): Promise<InventorySetAggregateDto | null>;

    /**
     * Returns card with inventory information for logged in user
     * - if card is not in user's inventory, quantity is 0
     *
     * @param cardId
     * @param userId
     * @see findInventoryCardBySetNumber
     * @returns card with quantity
     */
    findInventoryCardById(cardId: number, userId: number): Promise<InventoryCardAggregateDto | null>;

    /**
     * Returns card with inventory information for logged in user
     * - if card is not in user's inventory, quantity is 0
     *
     * @param setCode
     * @param cardNumber
     * @param userId
     * @see findInventoryCardById
     * @returns card with quantity
     */
    findInventoryCardBySetNumber(
        setCode: string,
        cardnumber: string,
        userId: number
    ): Promise<InventoryCardAggregateDto | null>;
}