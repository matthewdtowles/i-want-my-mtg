import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Format } from 'src/core/card/format.enum';
import { DeckImportService } from 'src/core/deck/deck-import.service';

function makeCard(id: string, name: string): Card {
    return new Card({
        id,
        name,
        imgSrc: 'img.jpg',
        legalities: [],
        number: '1',
        rarity: CardRarity.Common,
        setCode: 'set',
        sortNumber: '0001',
        type: 'Instant',
    });
}

describe('DeckImportService', () => {
    let service: DeckImportService;
    let deckService: { createDeck: jest.Mock; addCards: jest.Mock };
    let resolver: { resolveByName: jest.Mock; resolveCard: jest.Mock };

    beforeEach(() => {
        deckService = {
            createDeck: jest.fn().mockResolvedValue({ id: 7, name: 'My Deck' }),
            addCards: jest.fn().mockResolvedValue(undefined),
        };
        resolver = {
            resolveByName: jest.fn(),
            resolveCard: jest.fn(),
        };
        service = new DeckImportService(deckService as any, resolver as any);
    });

    it('resolves set-less lines by name and creates the deck with the cards', async () => {
        resolver.resolveByName.mockImplementation((name: string) =>
            Promise.resolve({ card: makeCard(name, name), error: null })
        );

        const result = await service.importDecklist(
            1,
            'My Deck',
            Format.Modern,
            '4 Lightning Bolt\n2 Counterspell'
        );

        expect(deckService.createDeck).toHaveBeenCalledWith(1, 'My Deck', Format.Modern);
        expect(deckService.addCards).toHaveBeenCalledWith(7, 1, [
            { cardId: 'Lightning Bolt', isSideboard: false, quantity: 4 },
            { cardId: 'Counterspell', isSideboard: false, quantity: 2 },
        ]);
        expect(result).toMatchObject({ deckId: 7, saved: 6, errors: [] });
    });

    it('reports unresolved lines but still imports the rest', async () => {
        resolver.resolveByName.mockImplementation((name: string) =>
            name === 'Bogus'
                ? Promise.resolve({ card: null, error: 'Card not found: "Bogus"' })
                : Promise.resolve({ card: makeCard(name, name), error: null })
        );

        const result = await service.importDecklist(1, 'D', null, '4 Lightning Bolt\n1 Bogus');

        expect(result.saved).toBe(4);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatchObject({ name: 'Bogus' });
    });

    it('uses precise resolution for set-coded lines, falling back to name', async () => {
        resolver.resolveCard.mockResolvedValue({ card: null, error: 'unknown set' });
        resolver.resolveByName.mockResolvedValue({ card: makeCard('c', 'Sol Ring'), error: null });

        await service.importDecklist(1, 'D', null, '1 Sol Ring (ZZZ) 5');

        expect(resolver.resolveCard).toHaveBeenCalledWith({ set_code: 'zzz', number: '5' });
        expect(resolver.resolveByName).toHaveBeenCalledWith('Sol Ring');
    });

    it('aggregates duplicate card+board lines into one entry', async () => {
        resolver.resolveByName.mockResolvedValue({ card: makeCard('bolt', 'Lightning Bolt'), error: null });

        await service.importDecklist(1, 'D', null, '2 Lightning Bolt\n2 Lightning Bolt');

        expect(deckService.addCards).toHaveBeenCalledWith(7, 1, [
            { cardId: 'bolt', isSideboard: false, quantity: 4 },
        ]);
    });
});
