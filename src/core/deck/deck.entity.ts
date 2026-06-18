import { Format } from 'src/core/card/format.enum';
import { validateInit } from 'src/core/validation.util';
import { DeckCard } from './deck-card.entity';

/**
 * A user's deck (10.4). `format` is optional - a deck need not target a
 * constructed format; when set, it drives the per-card legality check.
 */
export class Deck {
    readonly id?: number;
    readonly userId: number;
    readonly name: string;
    readonly format?: Format | null;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    // For read operations only
    readonly cards?: DeckCard[];

    constructor(init: Partial<Deck>) {
        validateInit(init, ['userId', 'name']);
        this.id = init.id;
        this.userId = init.userId;
        this.name = init.name;
        this.format = init.format ?? null;
        this.createdAt = init.createdAt;
        this.updatedAt = init.updatedAt;
        this.cards = init.cards;
    }
}
