import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { DeckBuildabilityService } from 'src/core/deck/deck-buildability.service';
import { DeckCard } from 'src/core/deck/deck-card.entity';

function card(id: string, name: string, type = 'Instant'): Card {
    return new Card({
        id,
        name,
        imgSrc: 'i.jpg',
        legalities: [],
        number: '1',
        rarity: CardRarity.Common,
        setCode: 'set',
        sortNumber: '1',
        type,
    });
}

describe('DeckBuildabilityService', () => {
    let service: DeckBuildabilityService;
    let inventoryRepo: { findAllForExport: jest.Mock };
    let buyList: { add: jest.Mock };

    beforeEach(() => {
        inventoryRepo = { findAllForExport: jest.fn() };
        buyList = { add: jest.fn().mockResolvedValue(undefined) };
        service = new DeckBuildabilityService(inventoryRepo as any, buyList as any);
    });

    it('aggregates inventory by lowercased card name across printings', async () => {
        inventoryRepo.findAllForExport.mockResolvedValue([
            { quantity: 2, card: card('a', 'Lightning Bolt') },
            { quantity: 1, card: card('b', 'Lightning Bolt') },
            { quantity: 3, card: card('c', 'Counterspell') },
        ]);

        const owned = await service.ownedByName(5);

        expect(owned.get('lightning bolt')).toBe(3);
        expect(owned.get('counterspell')).toBe(3);
    });

    it('adds each missing card to the buy-list with its missing quantity', async () => {
        inventoryRepo.findAllForExport.mockResolvedValue([
            { quantity: 1, card: card('bolt', 'Lightning Bolt') },
        ]);
        const cards: DeckCard[] = [
            new DeckCard({ cardId: 'bolt', quantity: 4, isSideboard: false, card: card('bolt', 'Lightning Bolt') }),
        ];

        const added = await service.addMissingToBuyList(cards, 5);

        expect(added).toBe(1);
        expect(buyList.add).toHaveBeenCalledWith(5, 'bolt', false, 3);
    });
});
