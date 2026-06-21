import { DeckCard } from './deck-card.entity';

/** Per-card ownership attribution within a deck-vs-inventory comparison. */
export interface DeckCardGap {
    cardId: string;
    isSideboard: boolean;
    need: number;
    owned: number;
    missing: number;
    /** Basic lands are treated as always owned and excluded from the totals. */
    isBasic: boolean;
}

export interface DeckGapSummary {
    /** Total non-basic copies the deck needs (main + sideboard). */
    neededCount: number;
    /** Non-basic copies the user owns, capped at what the deck needs. */
    ownedCount: number;
    missingCount: number;
    /** 0-100; 100 when the deck needs nothing beyond basics. */
    completeness: number;
    perCard: DeckCardGap[];
    /** Distinct missing cards aggregated by representative printing. */
    missingByCard: { cardId: string; quantity: number }[];
}

/**
 * Compare a deck's cards against an inventory owned-by-name map (name-level:
 * any printing satisfies a need). Basic lands count as always owned. Need for a
 * card name is pooled across main + sideboard, since those are physically
 * distinct copies at a table.
 */
export class DeckGapPolicy {
    static isBasic(type?: string): boolean {
        return !!type && type.includes('Basic');
    }

    static compute(cards: DeckCard[], ownedByName: Map<string, number>): DeckGapSummary {
        // Remaining inventory per name, drawn down as we attribute ownership.
        const remaining = new Map<string, number>();
        for (const [name, qty] of ownedByName) {
            remaining.set(name, qty);
        }

        let neededCount = 0;
        let ownedCount = 0;
        const perCard: DeckCardGap[] = [];
        const missingByCard = new Map<string, number>();

        for (const dc of cards) {
            const type = dc.card?.type;
            const isBasic = DeckGapPolicy.isBasic(type);
            const need = dc.quantity;

            if (isBasic) {
                perCard.push({
                    cardId: dc.cardId,
                    isSideboard: dc.isSideboard,
                    need,
                    owned: need,
                    missing: 0,
                    isBasic: true,
                });
                continue;
            }

            const nameKey = (dc.card?.name ?? '').toLowerCase();
            const have = remaining.get(nameKey) ?? 0;
            const owned = Math.min(need, have);
            remaining.set(nameKey, have - owned);
            const missing = need - owned;

            neededCount += need;
            ownedCount += owned;
            if (missing > 0) {
                missingByCard.set(dc.cardId, (missingByCard.get(dc.cardId) ?? 0) + missing);
            }

            perCard.push({
                cardId: dc.cardId,
                isSideboard: dc.isSideboard,
                need,
                owned,
                missing,
                isBasic: false,
            });
        }

        const missingCount = neededCount - ownedCount;
        const completeness =
            neededCount === 0 ? 100 : Math.round((ownedCount / neededCount) * 100);

        return {
            neededCount,
            ownedCount,
            missingCount,
            completeness,
            perCard,
            missingByCard: [...missingByCard.entries()].map(([cardId, quantity]) => ({
                cardId,
                quantity,
            })),
        };
    }
}
