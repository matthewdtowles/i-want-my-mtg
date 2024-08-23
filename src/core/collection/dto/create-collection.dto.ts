import { Type } from "class-transformer";
import { IsOptional } from "class-validator";
import { CardDto } from "src/core/card/dto/card.dto";
import { UserDto } from "src/core/user/dto/user.dto";

export class CreateCollectionDto {
    @Type(() => UserDto)
    readonly owner: UserDto;

    @IsOptional()
    @Type(() => CardDto)
    readonly cards: CardDto[];
}