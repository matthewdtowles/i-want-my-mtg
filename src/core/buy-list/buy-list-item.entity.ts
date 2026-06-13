import { Card } from 'src/core/card/card.entity';
import { validateInit } from 'src/core/validation.util';

/**
 * A card a user intends to buy (Phase 6.5). Grain mirrors inventory exactly
 * (card + finish + quantity, owned by a user) so the cash-vs-credit optimizer
 * can price normal vs foil and match against inventory.
 */
export class BuyListItem {
    readonly userId: number;
    readonly cardId: string;
    readonly isFoil: boolean;
    readonly quantity: number;
    // For read operations only
    readonly createdAt?: Date;
    readonly card?: Card;

    constructor(init: Partial<BuyListItem>) {
        validateInit(init, ['cardId', 'userId', 'isFoil', 'quantity']);
        this.userId = init.userId;
        this.cardId = init.cardId;
        this.isFoil = init.isFoil;
        this.quantity = init.quantity;
        this.createdAt = init.createdAt;
        this.card = init.card;
    }
}
