import { LegalityResponseDto } from "src/adapters/http/card/dto/legality.response.dto";

export class CardResponseDto {
    cardId: string;
    artist?: string;

    imgSrc: string;
    isReserved: boolean;
    legality: LegalityResponseDto[];
    manaCost: string[];
    name: string;
    number: string;
    oracleText?: string;
    rarity: string;
    setCode: string;
    setName: string;
    type: string;
    // TODO HOW ARE WE GOING TO HANDLE PRICES AND FOIL/NORMAL AND INVENTORY on CARD PAGE?11
    // readonly foilPrice: PriceResponseDto;
    // readonly normalPrice: PriceResponseDto;
    // readonly url: string; <<< ONLY USED BY otherPrintings on card page 
    // not defined but referenced: 
    // isFoil in foil.hbs, price.hbs, inventoryCtrl.hbs, cardsOwned.hbs
    // hidden in price.hbs, inventoryCtrl.hbs
    // displayValue in price.hbs
    // quantity in cardsOwned.hbs
}