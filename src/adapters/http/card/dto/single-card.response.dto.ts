import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";
import { LegalityResponseDto } from "src/adapters/http/card/dto/legality.response.dto";

export class SingleCardResponseDto extends CardResponseDto {
    readonly artist?: string;
    readonly legalities: LegalityResponseDto[];
    readonly oracleText?: string;
    readonly setName: string;

    constructor(init: Partial<SingleCardResponseDto>) {
        super(init);
        this.artist = init.artist;
        this.legalities = init.legalities?.map(legality => new LegalityResponseDto(legality)) || [];
        this.oracleText = init.oracleText;
        this.setName = init.setName || "";
    }
}