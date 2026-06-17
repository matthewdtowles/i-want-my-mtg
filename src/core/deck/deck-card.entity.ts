import { Card } from 'src/core/card/card.entity';
import { validateInit } from 'src/core/validation.util';

/**
 * A card entry within a deck (10.4). One row per card + board, so the same
 * card can appear once in the maindeck and once in the sideboard.
 */
export class DeckCard {
    readonly deckId?: number;
    readonly cardId: string;
    readonly quantity: number;
    readonly isSideboard: boolean;
    // For read operations only
    readonly card?: Card;

    constructor(init: Partial<DeckCard>) {
        validateInit(init, ['cardId', 'quantity', 'isSideboard']);
        this.deckId = init.deckId;
        this.cardId = init.cardId;
        this.quantity = init.quantity;
        this.isSideboard = init.isSideboard;
        this.card = init.card;
    }
}
