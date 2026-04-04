import { CardResponseDto } from './card.response.dto';
import { LegalityResponseDto } from './legality.response.dto';

export class SingleCardResponseDto extends CardResponseDto {
    readonly artist?: string;
    readonly flavorName?: string;
    readonly legalities: LegalityResponseDto[];
    readonly oracleText?: string;
    readonly setName: string;

    constructor(init: Partial<SingleCardResponseDto>) {
        super(init);
        this.artist = init.artist;
        this.flavorName = init.flavorName;
        this.legalities =
            init.legalities?.map((legality) => new LegalityResponseDto(legality)) || [];
        this.oracleText = init.oracleText;
        this.setName = init.setName || '';
    }
}
