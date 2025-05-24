import { CardDto } from "src/core/card/api/card.dto";
import { SetDto } from "src/core/set/api/set.dto";

/**
 * Card with a quantity value associated with it.
 * Use this DTO to represent a card from an inventory.
 */
export class InventoryCardAggregateDto extends CardDto {
    readonly quantity: number = 0;
    readonly displayPrice?: string;
    readonly foilDisplayPrice?: string;
}

/**
 * A set of cards with a quantity value associated with each card.
 * Use this DTO to represent a set of cards with inventory data.
 */
export class InventorySetAggregateDto extends SetDto {
    readonly cards: InventoryCardAggregateDto[] = [];
}