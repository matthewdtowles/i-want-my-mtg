import { Card } from "src/core/card/card.entity";
import { validateInit } from "src/shared/utils/validation.util";


export class Inventory {
    readonly cardId: string;
    readonly userId: number;
    readonly isFoil: boolean;
    readonly quantity: number;
    // For read operations only
    readonly card?: Card;

    constructor(init: Partial<Inventory>) {
        validateInit(init, ["cardId", "userId", "isFoil", "quantity"]);
        this.cardId = init.cardId;
        this.userId = init.userId;
        this.isFoil = init.isFoil;
        this.quantity = init.quantity;
        // Optional field
        this.card = init.card;
    }
}
