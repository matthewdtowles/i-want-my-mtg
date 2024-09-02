import { Type } from "class-transformer";
import { IsInt } from "class-validator";
import { CardDto } from "src/core/card/dto/card.dto";
import { UserDto } from "src/core/user/dto/user.dto";

export class CreateInventoryDto {
    @Type(() => UserDto)
    readonly owner: UserDto;

    @Type(() => CardDto)
    readonly card: CardDto;

    @IsInt()
    readonly quantity: number;
}