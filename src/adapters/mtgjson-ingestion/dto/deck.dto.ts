import { Injectable } from "@nestjs/common";
import { CardDeck } from "./cardDeck.dto";

@Injectable()
export class Deck {
    code: string;
    commander?: CardDeck[];
    mainBoard: CardDeck[];
    name: string;
    releaseDate: string | null;
    sideBoard: CardDeck[];
    type: string;
};