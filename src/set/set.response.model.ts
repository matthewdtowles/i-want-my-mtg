import { CardResponse } from "src/card/card.response.model";

export class SetResponse {
    block: string;
    cards: CardResponse[];
    code: string;
    keyruneCode: string;
    name: string;
    releaseDate: string;
    url: string;
}