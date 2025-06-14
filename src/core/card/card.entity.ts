import { CardRarity } from "src/core/card/card.rarity.enum";
import { Legality } from "src/core/card/legality.entity";
import { Price } from "src/core/price/price.entity";
import { Set } from "src/core/set/set.entity";
import { validateInit } from "src/shared/utils/validation.util";

export class Card {
    readonly id: string;
    readonly artist?: string;
    readonly hasFoil: boolean;
    readonly hasNonFoil: boolean;
    readonly imgSrc: string;
    readonly isReserved: boolean;
    legalities: Legality[];
    readonly manaCost?: string;
    readonly name: string;
    readonly number: string;
    readonly oracleText?: string;
    readonly rarity: CardRarity;
    readonly setCode: string;
    readonly type: string;
    // For read operations
    readonly order?: number;
    readonly prices?: Price[];
    readonly set?: Set;

    constructor(init: Partial<Card>) {
        const requiredFields: (keyof Card)[] = [
            "id",
            "hasFoil",
            "hasNonFoil",
            "imgSrc",
            "isReserved",
            "legalities",
            "name",
            "number",
            "rarity",
            "setCode",
            "type"
        ];
        validateInit(init, requiredFields);
        this.id = init.id;
        this.hasFoil = init.hasFoil;
        this.hasNonFoil = init.hasNonFoil;
        this.imgSrc = init.imgSrc;
        this.isReserved = init.isReserved;
        this.legalities = init.legalities;
        this.name = init.name;
        this.number = init.number;
        this.rarity = init.rarity;
        this.setCode = init.setCode;
        this.type = init.type;
        // Optional fields
        this.artist = init.artist;
        this.manaCost = init.manaCost;
        this.oracleText = init.oracleText;
        this.order = init.order;
        this.prices = init.prices;
        this.set = init.set;
    }
}
