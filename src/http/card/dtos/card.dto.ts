import { Type } from 'class-transformer';
import { SetDto } from '../../set/dtos/set.dto';

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

    // TODO: setCode string or GetSetDto???
    @Type(() => SetDto)
    set: SetDto;
    totalOwned: number;
    url: string;
    uuid: string;
}
