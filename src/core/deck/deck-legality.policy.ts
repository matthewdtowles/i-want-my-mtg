import { Format } from 'src/core/card/format.enum';
import { Legality } from 'src/core/card/legality.entity';
import { LegalityStatus } from 'src/core/card/legality.status.enum';

/**
 * Per-card legality for a deck's format (10.4 MVP). MTGJSON only emits a
 * legality row for formats where a card is legal/banned/restricted, so a
 * missing row means "not in this format".
 *
 * Full construction rules (singleton, 4-of, deck-size minimums) are a later
 * pass; this covers only "may this card legally appear in a deck of format X".
 */
export class DeckLegalityPolicy {
    /**
     * - No format target: everything is allowed.
     * - legal / restricted: allowed (the 1-copy restricted limit is a
     *   construction rule deferred to a later pass).
     * - banned, or no legality entry for the format: not legal.
     */
    static isCardLegal(
        format: Format | null | undefined,
        legalities: Legality[] | undefined
    ): boolean {
        if (!format) {
            return true;
        }
        const entry = (legalities ?? []).find((l) => l.format === format);
        if (!entry) {
            return false;
        }
        return (
            entry.status === LegalityStatus.Legal || entry.status === LegalityStatus.Restricted
        );
    }
}
