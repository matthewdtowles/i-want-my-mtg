import { Card } from "src/core/card";

export class Set {
    readonly code: string;
    readonly baseSize: number;
    readonly keyruneCode: string;
    readonly name: string;
    readonly releaseDate: string;
    readonly type: string;

    readonly block?: string;
    readonly cards?: Card[];
    readonly parentCode?: string;

    constructor(init: Partial<Set>) {
        this.validateInit(init);
        this.code = init.code;
        this.baseSize = init.baseSize;
        this.keyruneCode = init.keyruneCode;
        this.name = init.name;
        this.releaseDate = init.releaseDate;
        this.type = init.type;
        this.block = init.block;
        this.cards = init.cards;
        this.parentCode = init.parentCode;
    }

    private validateInit(init: Partial<Set>) {
        const requiredFields: string[] = ["code", "baseSize", "keyruneCode", "name", "releaseDate", "type"];
        for (const field of requiredFields) {
            if (!init[field]) throw new Error(`Invalid Set initialization: ${field} is required.`);
        }
    }
}
