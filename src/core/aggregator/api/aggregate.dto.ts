import { Type } from "class-transformer";
import { IsInt, IsPositive } from "class-validator";
import { CardDto } from "src/core/card/api/card.dto";
import { SetDto } from "src/core/set/api/set.dto";

/**
 * Card with a quantity value associated with it.
 * Use this DTO to represent a card from an inventory.
 */
export class InventoryCardAggregateDto extends CardDto {
    @IsInt()
    @IsPositive()
    readonly quantity: number = 0;
}

/**
 * A set of cards with a quantity value associated with each card.
 * Use this DTO to represent a set of cards with inventory data.
 */
export class InventorySetAggregateDto extends SetDto {
    @Type(() => InventoryCardAggregateDto)
    readonly cards: InventoryCardAggregateDto[] = [];
}