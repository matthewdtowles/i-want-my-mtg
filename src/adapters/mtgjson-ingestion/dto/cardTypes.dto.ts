import { Injectable } from "@nestjs/common";
import { CardType } from "./cardType.dto";

@Injectable()
export class CardTypes {
    artifact: CardType;
    conspiracy: CardType;
    creature: CardType;
    enchantment: CardType;
    instant: CardType;
    land: CardType;
    phenomenon: CardType;
    plane: CardType;
    planeswalker: CardType;
    scheme: CardType;
    sorcery: CardType;
    tribal: CardType;
    vanguard: CardType;
};