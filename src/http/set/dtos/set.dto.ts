import { Type } from 'class-transformer';
import { CardDto } from '../../card/dtos/card.dto';

export class SetDto {
    id: number;
    baseSize: number;
    block?: string;

    @Type(() => CardDto)
    cards: CardDto[];

    code: string;
    imgSrc?: string;
    keyruneCode: string;
    name: string;
    parentCode?: string;
    releaseDate: string;
    type: string;
    url: string;
}