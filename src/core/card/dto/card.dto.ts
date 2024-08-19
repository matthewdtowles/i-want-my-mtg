import { Type } from 'class-transformer';
import { SetDto } from 'src/core/set/dto/set.dto';

export class CardDto {
    id: number;
    imgSrc: string;
    isReserved?: boolean;
    manaCost?: string[];
    name: string;
    notes: string[];
    number: string;
    originalText?: string;
    price: number;
    rarity: string;

    @Type(() => SetDto)
    set: SetDto;

    totalOwned: number;

    url: string;

    uuid: string;
}
