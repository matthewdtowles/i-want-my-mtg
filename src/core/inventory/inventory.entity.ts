import { Card } from "src/core/card";


export class Inventory {
    readonly cardId: string;
    readonly userId: number;
    readonly isFoil: boolean;
    readonly quantity: number;
    readonly card?: Card;

    constructor(init: Partial<Inventory>) {
        this.validateInit(init);
        this.cardId = init.cardId;
        this.userId = init.userId;
        this.isFoil = init.isFoil;
        this.quantity = init.quantity;
        this.card = init.card;
    }

    private validateInit(init: Partial<Inventory>) {
        const requiredFields: string[] = ["cardId", "userId", "isFoil", "quantity"];
        for (const field of requiredFields) {
            if (!init[field]) throw new Error(`Invalid Inventory initialization: ${field} is required.`);
        }
    }
}
