export class CardInventoryInfo {
    readonly normalQuantity: number;
    readonly foilQuantity: number;

    constructor(init: Partial<CardInventoryInfo>) {
        this.normalQuantity = init.normalQuantity ?? 0;
        this.foilQuantity = init.foilQuantity ?? 0;
    }
}