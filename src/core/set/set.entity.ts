import { Card } from 'src/core/card/card.entity';
import { validateInit } from 'src/core/validation.util';
import { SetPrice } from './set-price.entity';

export class Set {
    readonly code: string;
    readonly baseSize: number;
    readonly keyruneCode: string;
    readonly name: string;
    readonly releaseDate: string;
    readonly totalSize: number;
    readonly type: string;
    // Optional fields
    readonly block?: string;
    readonly cards?: Card[];
    readonly parentCode?: string;
    readonly prices?: SetPrice;

    constructor(init: Partial<Set>) {
        const requiredFields: (keyof Set)[] = [
            'code',
            'baseSize',
            'keyruneCode',
            'name',
            'releaseDate',
            'totalSize',
            'type',
        ];
        validateInit(init, requiredFields);
        this.code = init.code;
        this.baseSize = init.baseSize;
        this.keyruneCode = init.keyruneCode;
        this.name = init.name;
        this.releaseDate = init.releaseDate;
        this.totalSize = init.totalSize;
        this.type = init.type;
        // Optional fields
        this.block = init.block;
        this.cards = init.cards;
        this.parentCode = init.parentCode;
        this.prices = init.prices;
    }
}
