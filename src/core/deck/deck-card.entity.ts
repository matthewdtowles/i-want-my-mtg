import { Card } from 'src/core/card/card.entity';
import { validateInit } from 'src/core/validation.util';

export class DeckCard {
    readonly deckId: number;
    readonly cardId: string;
    readonly isSideboard: boolean;
    readonly quantity: number;
    // Optional read enrichment
    readonly card?: Card;

    constructor(init: Partial<DeckCard>) {
        validateInit(init, ['deckId', 'cardId', 'quantity']);
        if (typeof init.quantity !== 'number' || init.quantity < 1) {
            throw new Error('Invalid initialization: quantity must be >= 1.');
        }
        this.deckId = init.deckId;
        this.cardId = init.cardId;
        this.isSideboard = init.isSideboard ?? false;
        this.quantity = init.quantity;
        this.card = init.card;
    }
}
