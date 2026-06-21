import { PublishedDeck } from '../published-deck.entity';

export const PublishedDeckRepositoryPort = 'PublishedDeckRepositoryPort';

export interface PublishedDeckListFilter {
    format?: string;
    limit: number;
    offset: number;
}

/**
 * Read-only access to the published tournament-deck catalog (Scry writes it).
 */
export interface PublishedDeckRepositoryPort {
    /** A page of published decks (with cards + latest price), newest tournament first. */
    findPage(filter: PublishedDeckListFilter): Promise<PublishedDeck[]>;

    /** Total decks matching the filter (for pagination). */
    count(filter: { format?: string }): Promise<number>;

    /** One published deck with its cards (+ set + legalities + latest price), or null. */
    findById(id: number): Promise<PublishedDeck | null>;

    /** Distinct non-null formats present, for the browse filter. */
    distinctFormats(): Promise<string[]>;
}
