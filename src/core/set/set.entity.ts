import { Card } from "src/core/card";
import { validateInit } from "src/shared/utils";

export class Set {
    readonly code: string;
    readonly baseSize: number;
    readonly keyruneCode: string;
    readonly name: string;
    readonly releaseDate: string;
    readonly type: string;
    // Optional fields
    readonly block?: string;
    readonly cards?: Card[];
    readonly parentCode?: string;

    constructor(init: Partial<Set>) {
        const requiredFields: (keyof Set)[] = ["code", "baseSize", "keyruneCode", "name", "releaseDate", "type"];
        validateInit(init, requiredFields);
        this.code = init.code;
        this.baseSize = init.baseSize;
        this.keyruneCode = init.keyruneCode;
        this.name = init.name;
        this.releaseDate = init.releaseDate;
        this.type = init.type;
        // Optional fields
        this.block = init.block;
        this.cards = init.cards;
        this.parentCode = init.parentCode;
    }
}
