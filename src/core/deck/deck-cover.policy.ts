import { Card } from 'src/core/card/card.entity';
import { Format } from 'src/core/card/format.enum';
import { DeckCard } from './deck-card.entity';
import { DeckSummaryPolicy } from './deck-summary.policy';

/**
 * Formats built around a commander, where a legendary creature is the deck's
 * face. Typed as strings because published decks carry their format as a plain
 * string rather than the enum.
 */
const COMMANDER_FORMATS: ReadonlySet<string> = new Set<string>([
    Format.Commander,
    Format.Brawl,
    Format.Oathbreaker,
]);

/**
 * Picks the card whose art represents a deck.
 *
 * There is no commander column on `deck_card` — entries carry only
 * `isSideboard` — so the commander is inferred rather than stored. The order
 * below runs most-intentional to most-mechanical, and each step falls through
 * when it finds nothing:
 *
 *   1. The commander: a legendary creature, in a format that has one.
 *   2. A card the deck is named after ("Atraxa Superfriends" -> Atraxa).
 *   3. The most valuable creature — decks are usually pictured by a creature.
 *   4. The most valuable card of any type.
 *
 * Ties within a step break on value, so the pick is deterministic. Cards with
 * no art are never chosen; a deck of only art-less cards yields undefined and
 * the caller renders its no-art fallback.
 */
export class DeckCoverPolicy {
    static pick(
        deck: { name?: string; format?: Format | string | null },
        cards: DeckCard[] = []
    ): Card | undefined {
        // The sideboard is not what a deck looks like.
        const candidates = DeckCoverPolicy.eligible(cards, false);
        const pool = candidates.length > 0 ? candidates : DeckCoverPolicy.eligible(cards, true);
        if (pool.length === 0) return undefined;

        return (
            DeckCoverPolicy.commander(pool, deck.format) ??
            DeckCoverPolicy.namesake(pool, deck.name) ??
            DeckCoverPolicy.mostValuable(pool, DeckCoverPolicy.isCreature) ??
            DeckCoverPolicy.mostValuable(pool)
        );
    }

    /** Main-deck cards that have art, or every carded entry when `includeSide`. */
    private static eligible(cards: DeckCard[], includeSide: boolean): Card[] {
        return cards
            .filter((dc) => (includeSide || !dc.isSideboard) && dc.card?.imgSrc)
            .map((dc) => dc.card);
    }

    private static isCreature(card: Card): boolean {
        return (card.type ?? '').toLowerCase().includes('creature');
    }

    private static commander(pool: Card[], format?: Format | string | null): Card | undefined {
        if (!format || !COMMANDER_FORMATS.has(format)) return undefined;
        return DeckCoverPolicy.mostValuable(pool, (c) => {
            const type = (c.type ?? '').toLowerCase();
            return type.includes('legendary') && type.includes('creature');
        });
    }

    /**
     * A card the deck is named after. Matches on the card's name up to its first
     * comma, because legendary names carry a title the deck name will not repeat
     * ("Atraxa, Praetors' Voice" is shortened to "Atraxa"). The match must cover
     * whole words so "Ur-Dragon" does not match a deck called "Dragons".
     *
     * Longest match wins — a deck named "Kenrith Group Hug" should pick Kenrith
     * over a one-word card that also appears — then value.
     */
    private static namesake(pool: Card[], deckName?: string): Card | undefined {
        const haystack = (deckName ?? '').toLowerCase().trim();
        if (!haystack) return undefined;

        let best: Card | undefined;
        let bestLength = 0;
        for (const card of pool) {
            const needle = (card.name ?? '').split(',')[0].toLowerCase().trim();
            // One-character names would match almost anything.
            if (needle.length < 3) continue;
            if (!DeckCoverPolicy.containsWord(haystack, needle)) continue;

            const better =
                needle.length > bestLength ||
                (needle.length === bestLength &&
                    DeckSummaryPolicy.cardValue(card) > DeckSummaryPolicy.cardValue(best));
            if (better) {
                best = card;
                bestLength = needle.length;
            }
        }
        return best;
    }

    /**
     * Whole-word containment, so "dragon" does not match "dragons" mid-token.
     *
     * Every occurrence is checked, not just the first: in "bring the ring" the
     * leading hit is inside "bring", and stopping there would miss the real
     * match at the end.
     */
    private static containsWord(haystack: string, needle: string): boolean {
        for (
            let index = haystack.indexOf(needle);
            index !== -1;
            index = haystack.indexOf(needle, index + 1)
        ) {
            const before = index === 0 ? ' ' : haystack[index - 1];
            const after =
                index + needle.length >= haystack.length ? ' ' : haystack[index + needle.length];
            if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
        }
        return false;
    }

    private static mostValuable(
        pool: Card[],
        predicate: (card: Card) => boolean = () => true
    ): Card | undefined {
        let best: Card | undefined;
        for (const card of pool) {
            if (!predicate(card)) continue;
            if (!best || DeckSummaryPolicy.cardValue(card) > DeckSummaryPolicy.cardValue(best)) {
                best = card;
            }
        }
        return best;
    }
}
