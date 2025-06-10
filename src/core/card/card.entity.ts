import { CardRarity, Legality } from "src/core/card";
import { Price } from "src/core/price";
import { Set } from "src/core/set";


export class Card {
    readonly id: string;
    readonly hasFoil: boolean;
    readonly hasNonFoil: boolean;
    readonly imgSrc: string;
    readonly isReserved: boolean;
    readonly legalities: Legality[];
    readonly name: string;
    readonly number: string;
    readonly order: number;
    readonly prices: Price[];
    readonly rarity: CardRarity;
    readonly setCode: string;
    readonly type: string;

    readonly artist?: string;
    readonly manaCost?: string;
    readonly oracleText?: string;
    readonly set?: Set;

    constructor(init: Partial<Card>) {
        this.validateInit(init);
        this.id = init.id;
        this.hasFoil = init.hasFoil;
        this.hasNonFoil = init.hasNonFoil;
        this.imgSrc = init.imgSrc;
        this.isReserved = init.isReserved;
        this.legalities = init.legalities;
        this.name = init.name;
        this.number = init.number;
        this.order = init.order;
        this.prices = init.prices;
        this.rarity = init.rarity;
        this.setCode = init.setCode;
        this.type = init.type;
        // Optional fields
        this.artist = init.artist;
        this.manaCost = init.manaCost;
        this.oracleText = init.oracleText;
        this.set = init.set;
    }

    private validateInit(init: Partial<Card>) {
        const requiredFields: string[] = [
            "id",
            "hasFoil",
            "hasNonFoil",
            "imgSrc",
            "isReserved",
            "legalities",
            "name",
            "number",
            "order",
            "prices",
            "rarity",
            "setCode",
            "type"
        ];
        for (const field of requiredFields) {
            if (!init[field]) throw new Error(`Invalid Card initialization: ${field} is required.`);
        }
    }
}
