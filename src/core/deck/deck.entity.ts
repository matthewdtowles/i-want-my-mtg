import { Format } from 'src/core/card/format.enum';
import { isEnumValue, validateInit } from 'src/core/validation.util';
import { DeckCard } from './deck-card.entity';

export class Deck {
    readonly id?: number;
    readonly userId: number;
    readonly name: string;
    readonly format: Format | null;
    readonly description: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly cards?: DeckCard[];

    constructor(init: Partial<Deck>) {
        validateInit(init, ['userId', 'name']);
        if (typeof init.name !== 'string' || init.name.trim().length === 0) {
            throw new Error('Invalid initialization: name must be a non-empty string.');
        }
        if (init.format != null && !isEnumValue(Format, init.format)) {
            throw new Error(`Invalid initialization: format "${init.format}" is not valid.`);
        }
        this.id = init.id;
        this.userId = init.userId;
        this.name = init.name.trim();
        this.format = init.format ?? null;
        this.description = init.description ?? null;
        this.createdAt = init.createdAt ?? new Date();
        this.updatedAt = init.updatedAt ?? new Date();
        this.cards = init.cards;
    }
}
