import { Format } from 'src/core/card/format.enum';
import { Legality } from 'src/core/card/legality.entity';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { DeckLegalityPolicy } from 'src/core/deck/deck-legality.policy';

const legality = (format: Format, status: LegalityStatus) =>
    new Legality({ cardId: 'c', format, status });

describe('DeckLegalityPolicy.isCardLegal', () => {
    it('allows any card when the deck has no format', () => {
        expect(DeckLegalityPolicy.isCardLegal(null, [])).toBe(true);
        expect(DeckLegalityPolicy.isCardLegal(undefined, undefined)).toBe(true);
    });

    it('is legal when the format entry is legal', () => {
        expect(
            DeckLegalityPolicy.isCardLegal(Format.Modern, [
                legality(Format.Modern, LegalityStatus.Legal),
            ])
        ).toBe(true);
    });

    it('treats restricted as legal-to-include', () => {
        expect(
            DeckLegalityPolicy.isCardLegal(Format.Vintage, [
                legality(Format.Vintage, LegalityStatus.Restricted),
            ])
        ).toBe(true);
    });

    it('is not legal when banned', () => {
        expect(
            DeckLegalityPolicy.isCardLegal(Format.Modern, [
                legality(Format.Modern, LegalityStatus.Banned),
            ])
        ).toBe(false);
    });

    it('is not legal when there is no entry for the format', () => {
        expect(
            DeckLegalityPolicy.isCardLegal(Format.Modern, [
                legality(Format.Legacy, LegalityStatus.Legal),
            ])
        ).toBe(false);
        expect(DeckLegalityPolicy.isCardLegal(Format.Modern, [])).toBe(false);
    });
});
