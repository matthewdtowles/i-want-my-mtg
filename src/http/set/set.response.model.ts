import { CardResponse } from '../card/card.response.dto';

// TODO: merge with GetSetDto
export class SetResponse {
    block: string;
    cards: CardResponse[];
    code: string;
    keyruneCode: string;
    name: string;
    releaseDate: string;
    url: string;
}