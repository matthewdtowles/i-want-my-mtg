import { Expose, Type } from 'class-transformer';
import { GetSetDto } from '../../set/dto/get-set.dto';

export class GetCardDto {
    
    @Expose()
    id: number;

    @Expose()
    imgSrc: string;

    @Expose()
    isReserved?: boolean;

    /**
     * e.g.: '{1}{W}{W}' for one and two white
     */
    @Expose()
    manaCost?: string;

    @Expose()
    name: string;

    @Expose()
    notes: string[];

    @Expose()
    number: string;

    @Expose()
    originalText?: string;

    @Expose()
    price: number;

    @Expose()
    rarity: string;

    @Expose()
    @Type(() => GetSetDto)
    set: GetSetDto;

    @Expose()
    totalOwned: number;

    @Expose()
    url: string;

    @Expose()
    uuid: string;
}
