import { InventorySetAggregateDto } from "./aggregate.dto";

export const AggregatorServicePort = "AggregatorServicePort";

export interface AggregatorServicePort {

    /**
     * Returns set with inventory information for each card for given user
     *  - if card is not in user's inventory, quantity is 0
     *
     * @param setCode
     * @param userId - if invalid, return set with cards with quantity == 0
     * @returns set with aggregated cards (i.e.: with quantities)
     */
    findInventorySetByCode(setCode: string, userId: number): Promise<InventorySetAggregateDto | null>;
}