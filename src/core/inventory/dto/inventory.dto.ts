import { CardDto } from 'src/core/card/dto/card.dto';
import { UserDto } from 'src/core/user/dto/user.dto';

export class InventoryDto {
    readonly id: number;
    readonly owner: UserDto;
    readonly card: CardDto;
    readonly quantity: number;
}