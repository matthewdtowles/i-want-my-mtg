import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRepositoryPort } from 'src/core/card/card.repository.port';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { InventoryImportService } from 'src/core/inventory/import/inventory-import.service';
import { InventoryRepositoryPort } from 'src/core/inventory/inventory.repository.port';
import { SetRepositoryPort } from 'src/core/set/set.repository.port';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Set } from 'src/core/set/set.entity';

function makeCard(overrides: Partial<Card> = {}): Card {
    return new Card({
        id: 'card-uuid-1',
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
        inMain: true,
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

describe('InventoryImportService', () => {
    let service: InventoryImportService;
    let inventoryRepo: jest.Mocked<InventoryRepositoryPort>;
    let cardRepo: jest.Mocked<CardRepositoryPort>;
    let setRepo: jest.Mocked<SetRepositoryPort>;

    const mockInventoryRepo = {
        save: jest.fn(),
        findOne: jest.fn(),
        findByCard: jest.fn(),
        findByCards: jest.fn(),
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

    const mockCardRepo = {
        findById: jest.fn(),
        findBySetCodeAndNumber: jest.fn(),
        findByNameAndSetCode: jest.fn(),
        findBySet: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    const mockSetRepo = {
        findByCode: jest.fn(),
        findByExactName: jest.fn(),
        findAllSetsMeta: jest.fn(),
        totalSets: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryImportService,
                { provide: InventoryRepositoryPort, useValue: mockInventoryRepo },
                { provide: CardRepositoryPort, useValue: mockCardRepo },
                { provide: SetRepositoryPort, useValue: mockSetRepo },
            ],
        }).compile();

        service = module.get<InventoryImportService>(InventoryImportService);
        inventoryRepo = module.get(InventoryRepositoryPort);
        cardRepo = module.get(CardRepositoryPort);
        setRepo = module.get(SetRepositoryPort);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockInventoryRepo.ensureAtLeastOne.mockResolvedValue({ saved: 1, skipped: 0 });
        mockInventoryRepo.save.mockResolvedValue([]);
        mockInventoryRepo.delete.mockResolvedValue(undefined);
    });

    describe('importCards', () => {
        it('looks up card by id and calls ensureAtLeastOne when no quantity', async () => {
            const card = makeCard();
            mockCardRepo.findById.mockResolvedValue(card);

            const result = await service.importCards([{ id: 'card-uuid-1' }], 1);

            expect(mockCardRepo.findById).toHaveBeenCalledWith('card-uuid-1', []);
            expect(mockInventoryRepo.ensureAtLeastOne).toHaveBeenCalledWith([
                { cardId: 'card-uuid-1', userId: 1, isFoil: false },
            ]);
            expect(result.errors).toHaveLength(0);
        });

        it('looks up card by set_code + number', async () => {
            const card = makeCard();
            mockCardRepo.findBySetCodeAndNumber.mockResolvedValue(card);

            await service.importCards([{ set_code: 'dmu', number: '1', quantity: '3' }], 1);

            expect(mockCardRepo.findBySetCodeAndNumber).toHaveBeenCalledWith('dmu', '1', []);
            expect(mockInventoryRepo.save).toHaveBeenCalled();
        });

        it('exact upsert: saves with given quantity', async () => {
            const card = makeCard();
            mockCardRepo.findById.mockResolvedValue(card);
            mockInventoryRepo.save.mockResolvedValue([
                { cardId: card.id, userId: 1, isFoil: false, quantity: 5 },
            ]);

            await service.importCards([{ id: card.id, quantity: '5' }], 1);

            expect(mockInventoryRepo.save).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ quantity: 5 })])
            );
        });

        it('quantity=0 triggers delete and counts as deleted (not saved)', async () => {
            const card = makeCard();
            mockCardRepo.findById.mockResolvedValue(card);
            mockInventoryRepo.delete.mockResolvedValue(undefined);

            const result = await service.importCards([{ id: card.id, quantity: '0' }], 1);

            expect(mockInventoryRepo.delete).toHaveBeenCalledWith(1, card.id, false);
            expect(result.deleted).toBe(1);
            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(0);
        });

        it('reports failed deletion as an error', async () => {
            const card = makeCard();
            mockCardRepo.findById.mockResolvedValue(card);
            mockInventoryRepo.delete.mockRejectedValue(new Error('DB constraint'));

            const result = await service.importCards([{ id: card.id, quantity: '0' }], 1);

            expect(result.deleted).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/DB constraint/);
        });

        it('errors on card not found by id', async () => {
            mockCardRepo.findById.mockResolvedValue(null);

            const result = await service.importCards([{ id: 'bad-id' }], 1);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/not found/i);
        });

        it('errors on ambiguous name+set (multiple matches)', async () => {
            const card1 = makeCard({ id: 'c1', name: 'Forest' });
            const card2 = makeCard({ id: 'c2', name: 'Forest' });
            mockCardRepo.findByNameAndSetCode.mockResolvedValue([card1, card2]);

            const result = await service.importCards([{ name: 'Forest', set_code: 'dmu' }], 1);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/[Aa]mbiguous/);
        });

        it('errors on insufficient identifier (no id, no set_code+number, no name+set_code)', async () => {
            const result = await service.importCards([{ name: 'Teferi' }], 1);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/[Ii]nsufficient/);
        });

        it('foil fallback: non-foil preferred when card.hasNonFoil', async () => {
            const card = makeCard({ hasNonFoil: true, hasFoil: true });
            mockCardRepo.findById.mockResolvedValue(card);

            await service.importCards([{ id: card.id }], 1);

            expect(mockInventoryRepo.ensureAtLeastOne).toHaveBeenCalledWith([
                expect.objectContaining({ isFoil: false }),
            ]);
        });

        it('foil fallback: uses foil when card is foil-only', async () => {
            const card = makeCard({ hasNonFoil: false, hasFoil: true });
            mockCardRepo.findById.mockResolvedValue(card);

            await service.importCards([{ id: card.id }], 1);

            expect(mockInventoryRepo.ensureAtLeastOne).toHaveBeenCalledWith([
                expect.objectContaining({ isFoil: true }),
            ]);
        });

        it('errors when foil=false on foil-only card', async () => {
            const card = makeCard({ hasNonFoil: false, hasFoil: true });
            mockCardRepo.findById.mockResolvedValue(card);

            const result = await service.importCards([{ id: card.id, foil: 'false' }], 1);

            expect(result.errors).toHaveLength(1);
        });

        it('saves valid rows despite errors (best-effort)', async () => {
            const card = makeCard();
            mockCardRepo.findById
                .mockResolvedValueOnce(null) // first row: not found
                .mockResolvedValueOnce(card); // second row: found

            const result = await service.importCards([{ id: 'bad-id' }, { id: card.id }], 1);

            expect(result.errors).toHaveLength(1);
            expect(mockInventoryRepo.ensureAtLeastOne).toHaveBeenCalled();
        });

        it('errors on non-numeric quantity', async () => {
            const card = makeCard();
            mockCardRepo.findById.mockResolvedValue(card);

            const result = await service.importCards([{ id: card.id, quantity: 'abc' }], 1);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/[Ii]nvalid quantity/);
        });
    });

    describe('importSet', () => {
        it('adds main cards to inventory', async () => {
            const set = makeSet();
            const card = makeCard();
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);
            mockInventoryRepo.ensureAtLeastOne.mockResolvedValue({ saved: 1, skipped: 0 });

            const result = await service.importSet({ set_code: 'dmu' }, 1);

            expect(result.saved).toBe(1);
            expect(result.errors).toHaveLength(0);
        });

        it('returns error when set not found', async () => {
            mockSetRepo.findByCode.mockResolvedValue(null);

            const result = await service.importSet({ set_code: 'xxx' }, 1);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/not found/i);
        });

        it('fallback: retries with all cards when base returns empty', async () => {
            const set = makeSet();
            const card = makeCard({ inMain: false });
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet
                .mockResolvedValueOnce([]) // base-only returns empty
                .mockResolvedValueOnce([card]); // all cards returns one
            mockInventoryRepo.ensureAtLeastOne.mockResolvedValue({ saved: 1, skipped: 0 });

            const result = await service.importSet({ set_code: 'dmu' }, 1);

            expect(mockCardRepo.findBySet).toHaveBeenCalledTimes(2);
            expect(result.saved).toBe(1);
        });

        it('uses foil-only fallback for foil-only cards', async () => {
            const set = makeSet();
            const card = makeCard({ hasNonFoil: false, hasFoil: true });
            mockSetRepo.findByCode.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);
            mockInventoryRepo.ensureAtLeastOne.mockResolvedValue({ saved: 1, skipped: 0 });

            await service.importSet({ set_code: 'dmu' }, 1);

            expect(mockInventoryRepo.ensureAtLeastOne).toHaveBeenCalledWith([
                expect.objectContaining({ isFoil: true }),
            ]);
        });

        it('looks up set by name when set_code not provided', async () => {
            const set = makeSet();
            const card = makeCard();
            mockSetRepo.findByExactName.mockResolvedValue(set);
            mockCardRepo.findBySet.mockResolvedValue([card]);
            mockInventoryRepo.ensureAtLeastOne.mockResolvedValue({ saved: 1, skipped: 0 });

            await service.importSet({ set_name: 'Dominaria United' }, 1);

            expect(mockSetRepo.findByExactName).toHaveBeenCalledWith('Dominaria United');
        });
    });
});
