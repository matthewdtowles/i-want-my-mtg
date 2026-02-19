import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRepositoryPort } from 'src/core/card/card.repository.port';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/inventory.repository.port';
import { SetChecklistService } from 'src/core/set/checklist/set-checklist.service';
import { Set } from 'src/core/set/set.entity';
import { SetRepositoryPort } from 'src/core/set/set.repository.port';

function makeCard(overrides: Partial<Card> = {}): Card {
    return new Card({
        id: 'card-1',
        imgSrc: 'img.jpg',
        legalities: [],
        name: 'Teferi',
        number: '1',
        rarity: CardRarity.Rare,
        setCode: 'dmu',
        sortNumber: '0001',
        type: 'Planeswalker',
        hasNonFoil: true,
        hasFoil: true,
        ...overrides,
    });
}

function makeSet(overrides: Partial<Set> = {}): Set {
    return new Set({
        code: 'dmu',
        baseSize: 280,
        keyruneCode: 'dmu',
        name: 'Dominaria United',
        releaseDate: '2022-09-09',
        totalSize: 400,
        type: 'expansion',
        ...overrides,
    });
}

describe('SetChecklistService', () => {
    let service: SetChecklistService;
    let setRepo: jest.Mocked<SetRepositoryPort>;
    let cardRepo: jest.Mocked<CardRepositoryPort>;
    let inventoryRepo: jest.Mocked<InventoryRepositoryPort>;

    const mockSetRepo = {
        findByCode: jest.fn(),
        findByExactName: jest.fn(),
        findAllSetsMeta: jest.fn(),
        totalSets: jest.fn(),
        totalInSet: jest.fn(),
        totalValueForSet: jest.fn(),
        searchSets: jest.fn(),
        totalSearchSets: jest.fn(),
    };

    const mockCardRepo = {
        findBySet: jest.fn(),
        findById: jest.fn(),
        findBySetCodeAndNumber: jest.fn(),
        findByNameAndSetCode: jest.fn(),
        save: jest.fn(),
    };

    const mockInventoryRepo = {
        findByCards: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        findByCard: jest.fn(),
        findByUser: jest.fn(),
        delete: jest.fn(),
        ensureAtLeastOne: jest.fn(),
        findAllForExport: jest.fn(),
        totalCards: jest.fn(),
        totalInventoryCards: jest.fn(),
        totalInventoryValue: jest.fn(),
        totalInventoryValueForSet: jest.fn(),
        totalInventoryCardsForSet: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetChecklistService,
                { provide: SetRepositoryPort, useValue: mockSetRepo },
                { provide: CardRepositoryPort, useValue: mockCardRepo },
                { provide: InventoryRepositoryPort, useValue: mockInventoryRepo },
            ],
        }).compile();

        service = module.get<SetChecklistService>(SetChecklistService);
        setRepo = module.get(SetRepositoryPort);
        cardRepo = module.get(CardRepositoryPort);
        inventoryRepo = module.get(InventoryRepositoryPort);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateChecklist', () => {
        it('includes set name and code header', async () => {
            const set = makeSet();
            const card = makeCard();
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);
            mockInventoryRepo.findByCards.mockResolvedValue([]);

            const csv = await service.generateChecklist('dmu', 1);

            expect(csv).toContain('Set Name: Dominaria United');
            expect(csv).toContain('Set Code: DMU');
        });

        it('includes foil column when set has foil cards', async () => {
            const set = makeSet();
            const card = makeCard({ hasFoil: true });
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);
            mockInventoryRepo.findByCards.mockResolvedValue([]);

            const csv = await service.generateChecklist('dmu', 1);

            expect(csv).toContain('foil');
        });

        it('omits foil column when set has no foil cards', async () => {
            const set = makeSet();
            const card = makeCard({ hasFoil: false });
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);
            mockInventoryRepo.findByCards.mockResolvedValue([]);

            const csv = await service.generateChecklist('dmu', 1);

            const lines = csv.split('\n');
            const headerLine = lines.find((l) => l.startsWith('number'));
            expect(headerLine).toBeDefined();
            expect(headerLine).not.toContain('foil');
        });

        it('shows owned quantities for authenticated user', async () => {
            const set = makeSet();
            const card = makeCard({ id: 'c1' });
            const invItem = new Inventory({ cardId: 'c1', userId: 1, isFoil: false, quantity: 3 });
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);
            mockInventoryRepo.findByCards.mockResolvedValue([invItem]);

            const csv = await service.generateChecklist('dmu', 1);

            expect(csv).toContain('3');
        });

        it('blank checklist has empty quantity cells (no userId)', async () => {
            const set = makeSet();
            const card = makeCard({ id: 'c1' });
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);

            const csv = await service.generateChecklist('dmu', null);

            // Should not call findByCards when no user
            expect(mockInventoryRepo.findByCards).not.toHaveBeenCalled();
            // Normal column should be empty
            const lines = csv.split('\n');
            const dataLine = lines.find((l) => l.startsWith('1,'));
            expect(dataLine).toBeDefined();
            // Empty quantity (just commas)
            expect(dataLine).toMatch(/1,Teferi,,/);
        });

        it('throws when set not found', async () => {
            mockSetRepo.findByCode.mockResolvedValue(null);

            await expect(service.generateChecklist('bad', 1)).rejects.toThrow(/not found/i);
        });
    });
});
