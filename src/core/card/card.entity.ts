import { Set } from 'src/core/set/set.entity';
import { validateInit } from 'src/core/validation.util';
import { CardRarity } from './card.rarity.enum';
import { Legality } from './legality.entity';
import { Price } from './price.entity';

export class Card {
    readonly id: string;
    readonly artist?: string;
    readonly hasFoil: boolean;
    readonly hasNonFoil: boolean;
    readonly imgSrc: string;
    readonly inMain?: boolean;
    readonly isAlternative: boolean;
    readonly isReserved: boolean;
    legalities: Legality[];
    readonly manaCost?: string;
    readonly name: string;
    readonly number: string;
    readonly oracleText?: string;
    readonly rarity: CardRarity;
    readonly setCode: string;
    readonly sortNumber: string;
    readonly type: string;
    // For read operations
    readonly prices?: Price[];
    readonly set?: Set;

    constructor(init: Partial<Card>) {
        const requiredFields: (keyof Card)[] = [
            'id',
            'imgSrc',
            'legalities',
            'name',
            'number',
            'rarity',
            'setCode',
            'sortNumber',
            'type',
        ];
        validateInit(init, requiredFields);
        this.id = init.id;
        this.hasFoil = init.hasFoil ?? false;
        this.hasNonFoil = init.hasNonFoil ?? false;
        this.imgSrc = init.imgSrc;
        this.inMain = init.inMain ?? false;
        this.isAlternative = init.isAlternative ?? false;
        this.isReserved = init.isReserved ?? false;
        this.legalities = init.legalities;
        this.name = init.name;
        this.number = init.number;
        this.rarity = init.rarity;
        this.setCode = init.setCode;
        this.sortNumber = init.sortNumber;
        this.type = init.type;
        // Optional fields
        this.artist = init.artist;
        this.manaCost = init.manaCost;
        this.oracleText = init.oracleText;
        this.prices = init.prices;
        this.set = init.set;
    }
}
