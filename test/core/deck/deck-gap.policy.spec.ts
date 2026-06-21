import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckGapPolicy } from 'src/core/deck/deck-gap.policy';

function deckCard(
    cardId: string,
    name: string,
    quantity: number,
    opts: { isSideboard?: boolean; type?: string } = {}
): DeckCard {
    const card = new Card({
        id: cardId,
        name,
        imgSrc: 'i.jpg',
        legalities: [],
        number: '1',
        rarity: CardRarity.Common,
        setCode: 'set',
        sortNumber: '1',
        type: opts.type ?? 'Instant',
    });
    return new DeckCard({ cardId, quantity, isSideboard: opts.isSideboard ?? false, card });
}

describe('DeckGapPolicy', () => {
    it('counts owned cards name-level and reports the gap', () => {
        const cards = [deckCard('bolt1', 'Lightning Bolt', 4)];
        const owned = new Map([['lightning bolt', 3]]);

        const gap = DeckGapPolicy.compute(cards, owned);

        expect(gap.neededCount).toBe(4);
        expect(gap.ownedCount).toBe(3);
        expect(gap.missingCount).toBe(1);
        expect(gap.completeness).toBe(75);
        expect(gap.missingByCard).toEqual([{ cardId: 'bolt1', quantity: 1 }]);
    });

    it('treats basic lands as always owned and excludes them from totals', () => {
        const cards = [
            deckCard('forest', 'Forest', 20, { type: 'Basic Land — Forest' }),
            deckCard('bolt', 'Lightning Bolt', 4),
        ];
        const owned = new Map([['lightning bolt', 4]]);

        const gap = DeckGapPolicy.compute(cards, owned);

        expect(gap.neededCount).toBe(4); // basics excluded
        expect(gap.completeness).toBe(100);
        const forestRow = gap.perCard.find((c) => c.cardId === 'forest')!;
        expect(forestRow).toMatchObject({ isBasic: true, owned: 20, missing: 0 });
    });

    it('pools a name across main and sideboard so total copies are required', () => {
        const cards = [
            deckCard('bolt', 'Lightning Bolt', 4),
            deckCard('bolt', 'Lightning Bolt', 1, { isSideboard: true }),
        ];
        const owned = new Map([['lightning bolt', 4]]);

        const gap = DeckGapPolicy.compute(cards, owned);

        expect(gap.neededCount).toBe(5);
        expect(gap.ownedCount).toBe(4);
        expect(gap.missingCount).toBe(1);
        // The shortfall lands on the sideboard copy (main attributed first).
        const side = gap.perCard.find((c) => c.isSideboard)!;
        expect(side.missing).toBe(1);
    });

    it('is 100% complete when the deck needs nothing beyond basics', () => {
        const cards = [deckCard('plains', 'Plains', 40, { type: 'Basic Land — Plains' })];
        const gap = DeckGapPolicy.compute(cards, new Map());
        expect(gap.completeness).toBe(100);
        expect(gap.missingCount).toBe(0);
    });
});
