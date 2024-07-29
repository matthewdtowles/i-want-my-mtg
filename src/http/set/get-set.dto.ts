import { Expose, Type } from 'class-transformer';
import { GetCardDto } from '../card/dtos/get-card.dto';

export class GetSetDto {

    @Expose()
    id: number;
    
    @Expose()
    baseSize: number;

    @Expose()
    block?: string;

    @Expose()
    @Type(() => GetCardDto)
    cards: GetCardDto[];

    @Expose()
    code: string;

    @Expose()
    imgSrc?: string;

    @Expose()
    keyruneCode: string;

    @Expose()
    name: string;

    @Expose()
    parentCode?: string;

    @Expose()
    releaseDate: string;

    @Expose()
    type: string;

    @Expose()
    url: string;
}