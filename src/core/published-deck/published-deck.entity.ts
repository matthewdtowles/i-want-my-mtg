import { DeckCard } from 'src/core/deck/deck-card.entity';
import { validateInit } from 'src/core/validation.util';

/**
 * A published tournament decklist (10.7 / #537). Read-only catalog data Scry
 * ingests from external feeds. Cards reuse the DeckCard value object so the
 * buildability/gap policy applies unchanged.
 */
export class PublishedDeck {
    readonly id?: number;
    readonly source: string;
    readonly sourceUri: string;
    readonly tournamentName?: string | null;
    readonly tournamentDate?: Date | null;
    readonly format?: string | null;
    readonly archetype?: string | null;
    readonly player?: string | null;
    readonly result?: string | null;
    readonly cards?: DeckCard[];

    constructor(init: Partial<PublishedDeck>) {
        validateInit(init, ['source', 'sourceUri']);
        this.id = init.id;
        this.source = init.source;
        this.sourceUri = init.sourceUri;
        this.tournamentName = init.tournamentName ?? null;
        this.tournamentDate = init.tournamentDate ?? null;
        this.format = init.format ?? null;
        this.archetype = init.archetype ?? null;
        this.player = init.player ?? null;
        this.result = init.result ?? null;
        this.cards = init.cards;
    }
}
