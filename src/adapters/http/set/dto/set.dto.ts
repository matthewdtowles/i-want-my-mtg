import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";


export class SetDto {
    readonly baseSize: number;
    readonly block?: string;
    readonly cards: CardResponseDto[];
    readonly code: string;
    readonly keyruneCode: string;
    readonly name: string;
    readonly parentCode?: string;
    readonly releaseDate: string;
    readonly type: string;
    readonly url: string;
}
