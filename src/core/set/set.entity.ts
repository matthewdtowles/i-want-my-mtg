import { Card } from "src/core/card/card.entity";

export class Set {
    code: string;
    baseSize: number;
    block?: string;
    cards: Card[];
    keyruneCode: string;
    name: string;
    parentCode?: string;
    releaseDate: string;
    type: string;
}
