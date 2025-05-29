import { CardDto } from "src/core/card/api/card.dto";
import { SetDto } from "src/core/set/api/set.dto";

/**
 * Represents a variant of a card in the inventory.
 */
export enum VariantType {
    NORMAL = "normal",
    FOIL = "foil",
}

/**
 * Represents a variant of a card in the inventory with its quantity.
 */
export class InventoryCardVariant {
    readonly type: VariantType;
    readonly displayValue?: string;
    readonly quantity: number = 0;
}

/**
 * Card with a quantity value associated with it.
 * Use this DTO to represent a card from an inventory.
 */
export class InventoryCardAggregateDto extends CardDto {
    readonly variants: InventoryCardVariant[] = [];
}

/**
 * A set of cards with a quantity value associated with each card.
 * Use this DTO to represent a set of cards with inventory data.
 */
export class InventorySetAggregateDto extends SetDto {
    readonly cards: InventoryCardAggregateDto[] = [];
}