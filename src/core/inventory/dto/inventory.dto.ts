import { CardDto } from 'src/core/card/dto/card.dto';

export class InventoryDto {
    readonly id: number;
    readonly card: CardDto;
    readonly quantity: number;
    readonly userId: number;
}