import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { CardDto } from 'src/core/card/dto/card.dto';

export class CreateInventoryDto {

    @Type(() => CardDto)
    readonly card: CardDto;

    @IsInt()
    readonly quantity: number;

    @IsInt()
    readonly userId: number;
}