import { Type } from "class-transformer";
import { CardDto } from "src/core/card/dto/card.dto";
import { UserDto } from "src/core/user/dto/user.dto";

export class InventoryDto {
    readonly id: number;

    @Type(() => UserDto)
    readonly owner: UserDto;

    @Type(() => CardDto)
    readonly cards: CardDto[];
}