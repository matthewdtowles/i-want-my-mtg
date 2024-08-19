import { Type } from 'class-transformer';
import { SetDto } from 'src/core/set/dto/set.dto';

export class CardDto {
    readonly id: number;
    readonly imgSrc: string;
    readonly isReserved?: boolean;
    readonly manaCost?: string[];
    readonly name: string;
    readonly number: string;
    readonly originalText?: string;
    readonly rarity: string;

    @Type(() => SetDto)
    readonly set: SetDto;
    readonly url: string;
    readonly uuid: string;
}
