import { Injectable } from "@nestjs/common";

@Injectable()
export class CardSetDeck {
    count: number;
    isFoil?: boolean;
    uuid: string;
};