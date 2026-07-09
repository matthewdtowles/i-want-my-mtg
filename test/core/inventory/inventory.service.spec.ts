import { Test, TestingModule } from '@nestjs/testing';
import { GranularPrice } from 'src/core/card/granular-price.entity';
import { GranularPriceRepositoryPort } from 'src/core/card/ports/granular-price.repository.port';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/ports/inventory.repository.port';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';

describe('InventoryService', () => {
    let service: InventoryService;
    let repository: jest.Mocked<InventoryRepositoryPort>;
    let granularPriceRepository: jest.Mocked<GranularPriceRepositoryPort>;

    const testInventoryItem = new Inventory({
        cardId: 'card-1',
        userId: 1,
        isFoil: false,
        quantity: 4,
    });

    const testInventoryFoil = new Inventory({
        cardId: 'card-1',
        userId: 1,
        isFoil: true,
        quantity: 2,
    });

    const mockQueryOptions = new SafeQueryOptions({ page: '1', limit: '10', filter: 'test' });

    const mockRepository = {
        save: jest.fn(),
        findOne: jest.fn(),
        findByCard: jest.fn(),
        findByCards: jest.fn(),
        findByUser: jest.fn(),
        delete: jest.fn(),
        totalInventoryCardsForSets: jest.fn(),
        totalInventoryValuesForSets: jest.fn(),
        findAllForExport: jest.fn(),
    };

    const mockGranularPriceRepository = {
        findCurrentBuylistByCardId: jest.fn(),
        findCurrentBuylistByCardIds: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: InventoryRepositoryPort, useValue: mockRepository },
                { provide: GranularPriceRepositoryPort, useValue: mockGranularPriceRepository },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        repository = module.get(InventoryRepositoryPort) as jest.Mocked<InventoryRepositoryPort>;
        granularPriceRepository = module.get(
            GranularPriceRepositoryPort
        ) as jest.Mocked<GranularPriceRepositoryPort>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('save', () => {
        it('should save inventory items with positive quantity', async () => {
            const itemsToSave = [testInventoryItem, testInventoryFoil];
            repository.save.mockResolvedValue(itemsToSave);

            const result = await service.save(itemsToSave);

            expect(repository.save).toHaveBeenCalledWith(itemsToSave);
            expect(result).toEqual(itemsToSave);
        });

        it('should delete inventory items with zero quantity', async () => {
            const itemToDelete = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 0,
            });

            const itemToSave = new Inventory({
                cardId: 'card-2',
                userId: 1,
                isFoil: false,
                quantity: 3,
            });

            repository.save.mockResolvedValue([itemToSave]);
            repository.delete.mockResolvedValue();

            const result = await service.save([itemToDelete, itemToSave]);

            expect(repository.delete).toHaveBeenCalledWith(1, 'card-1', false);
            expect(repository.save).toHaveBeenCalledWith([itemToSave]);
            expect(result).toEqual([itemToSave]);
        });

        it('should handle empty array input', async () => {
            repository.save.mockResolvedValue([]);
            const result = await service.save([]);

            expect(repository.save).toHaveBeenCalledWith([]);
            expect(result).toEqual([]);
        });

        // W2/B3 follow-up: duplicate (userId, cardId, isFoil) entries collapse to
        // the last one (last-write-wins). A trailing removal must win over an
        // earlier positive quantity instead of being re-saved after the delete.
        it('collapses duplicate keys, trailing removal wins', async () => {
            const positive = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 3,
            });
            const removal = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 0,
            });
            repository.delete.mockResolvedValue();
            repository.save.mockResolvedValue([]);

            await service.save([positive, removal]);

            expect(repository.delete).toHaveBeenCalledWith(1, 'card-1', false);
            expect(repository.delete).toHaveBeenCalledTimes(1);
            expect(repository.save).toHaveBeenCalledWith([]);
        });

        it('collapses duplicate keys, trailing positive wins (no delete)', async () => {
            const removal = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 0,
            });
            const positive = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 5,
            });
            repository.save.mockResolvedValue([positive]);

            await service.save([removal, positive]);

            expect(repository.delete).not.toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalledWith([positive]);
        });

        it('keeps normal and foil of the same card as distinct keys', async () => {
            repository.save.mockResolvedValue([testInventoryItem, testInventoryFoil]);

            await service.save([testInventoryItem, testInventoryFoil]);

            expect(repository.delete).not.toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalledWith([testInventoryItem, testInventoryFoil]);
        });

        // W2/B3: the zero-quantity delete used to be fire-and-forget. A rejected
        // delete then became an unhandled rejection (process crash on Node >=15)
        // and silent data corruption. save() must await it and surface the error.
        it('propagates a delete failure instead of resolving silently (B3)', async () => {
            const itemToDelete = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 0,
            });
            repository.delete.mockRejectedValue(new Error('delete failed'));
            repository.save.mockResolvedValue([]);

            await expect(service.save([itemToDelete])).rejects.toThrow('delete failed');
        });
    });

    describe('findForUser', () => {
        it('should find inventory items by userId and cardId', async () => {
            const expectedItems = [testInventoryItem, testInventoryFoil];
            repository.findByCard.mockResolvedValue(expectedItems);
            const result = await service.findForUser(1, 'card-1');

            expect(repository.findByCard).toHaveBeenCalledWith(1, 'card-1');
            expect(result).toEqual(expectedItems);
        });

        it('should return empty array when userId is missing', async () => {
            const result = await service.findForUser(null, 'card-1');
            expect(repository.findByCard).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array when cardId is missing', async () => {
            const result = await service.findForUser(1, null);

            expect(repository.findByCard).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    describe('findAllForUser', () => {
        it('should find all inventory items for a user', async () => {
            const expectedItems = [testInventoryItem, testInventoryFoil];
            repository.findByUser.mockResolvedValue(expectedItems);
            const result = await service.findAllForUser(1, mockQueryOptions);

            expect(repository.findByUser).toHaveBeenCalledWith(1, mockQueryOptions);
            expect(result).toEqual(expectedItems);
        });

        it('should return empty array when userId is missing', async () => {
            const result = await service.findAllForUser(null, mockQueryOptions);
            expect(repository.findByUser).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    describe('inventoryTotalsForSets', () => {
        it('should return totals map from repository', async () => {
            const expected = new Map([
                ['TST', 5],
                ['ABC', 10],
            ]);
            repository.totalInventoryCardsForSets.mockResolvedValue(expected);

            const result = await service.inventoryTotalsForSets(1, ['TST', 'ABC']);

            expect(repository.totalInventoryCardsForSets).toHaveBeenCalledWith(1, ['TST', 'ABC']);
            expect(result).toEqual(expected);
        });

        it('should return empty map when userId is falsy', async () => {
            const result = await service.inventoryTotalsForSets(0, ['TST']);
            expect(repository.totalInventoryCardsForSets).not.toHaveBeenCalled();
            expect(result).toEqual(new Map());
        });

        it('should return empty map when setCodes is empty', async () => {
            const result = await service.inventoryTotalsForSets(1, []);
            expect(repository.totalInventoryCardsForSets).not.toHaveBeenCalled();
            expect(result).toEqual(new Map());
        });
    });

    describe('ownedValuesForSets', () => {
        it('should return values map from repository', async () => {
            const expected = new Map([
                ['TST', 100.5],
                ['ABC', 200.75],
            ]);
            repository.totalInventoryValuesForSets.mockResolvedValue(expected);

            const result = await service.ownedValuesForSets(1, ['TST', 'ABC']);

            expect(repository.totalInventoryValuesForSets).toHaveBeenCalledWith(1, ['TST', 'ABC']);
            expect(result).toEqual(expected);
        });

        it('should return empty map when userId is falsy', async () => {
            const result = await service.ownedValuesForSets(0, ['TST']);
            expect(repository.totalInventoryValuesForSets).not.toHaveBeenCalled();
            expect(result).toEqual(new Map());
        });

        it('should return empty map when setCodes is empty', async () => {
            const result = await service.ownedValuesForSets(1, []);
            expect(repository.totalInventoryValuesForSets).not.toHaveBeenCalled();
            expect(result).toEqual(new Map());
        });
    });

    describe('delete', () => {
        it('should delete an inventory item and return true on success', async () => {
            repository.delete.mockResolvedValue();
            repository.findOne.mockResolvedValue(null);

            const result = await service.delete(1, 'card-1', false);

            expect(repository.delete).toHaveBeenCalledWith(1, 'card-1', false);
            expect(repository.findOne).toHaveBeenCalledWith(1, 'card-1', false);
            expect(result).toBe(true);
        });

        it('should return false if item still exists after deletion', async () => {
            repository.delete.mockResolvedValue();
            repository.findOne.mockResolvedValue(testInventoryItem);

            const result = await service.delete(1, 'card-1', false);

            expect(repository.delete).toHaveBeenCalledWith(1, 'card-1', false);
            expect(result).toBe(false);
        });

        it('should return false when userId is missing', async () => {
            const result = await service.delete(null, 'card-1', false);
            expect(repository.delete).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should return false when cardId is missing', async () => {
            const result = await service.delete(1, null, false);

            expect(repository.delete).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should handle errors during deletion', async () => {
            repository.delete.mockRejectedValue(new Error('Database error'));
            const result = await service.delete(1, 'card-1', false);

            expect(repository.delete).toHaveBeenCalledWith(1, 'card-1', false);
            expect(result).toBe(false);
        });
    });

    describe('sellPlanForUser', () => {
        const offer = new GranularPrice({
            cardId: 'card-1',
            provider: 'cardkingdom',
            priceType: 'buylist',
            finish: 'normal',
            condition: 'NM',
            price: 2.5,
            qty: null,
        });

        it('builds a plan from the full inventory and its buylist offers', async () => {
            repository.findAllForExport.mockResolvedValue([testInventoryItem]);
            granularPriceRepository.findCurrentBuylistByCardIds.mockResolvedValue([offer]);

            const plan = await service.sellPlanForUser(1);

            expect(repository.findAllForExport).toHaveBeenCalledWith(1);
            expect(granularPriceRepository.findCurrentBuylistByCardIds).toHaveBeenCalledWith([
                'card-1',
            ]);
            expect(plan.itemsWithOffers).toBe(1);
            expect(plan.totalPayout).toBeCloseTo(10); // $2.50 x 4 owned
        });

        it('deduplicates card ids across normal and foil rows', async () => {
            repository.findAllForExport.mockResolvedValue([testInventoryItem, testInventoryFoil]);
            granularPriceRepository.findCurrentBuylistByCardIds.mockResolvedValue([]);

            await service.sellPlanForUser(1);

            expect(granularPriceRepository.findCurrentBuylistByCardIds).toHaveBeenCalledWith([
                'card-1',
            ]);
        });

        it('narrows the plan to the selected keys', async () => {
            repository.findAllForExport.mockResolvedValue([testInventoryItem, testInventoryFoil]);
            granularPriceRepository.findCurrentBuylistByCardIds.mockResolvedValue([offer]);

            const plan = await service.sellPlanForUser(1, [{ cardId: 'card-1', isFoil: false }]);

            expect(plan.itemsWithOffers).toBe(1);
            expect(plan.itemsWithoutOffers).toBe(0); // the foil row was deselected, not unmatched
        });

        it('returns an empty plan for an empty selection', async () => {
            repository.findAllForExport.mockResolvedValue([testInventoryItem]);
            granularPriceRepository.findCurrentBuylistByCardIds.mockResolvedValue([]);

            const plan = await service.sellPlanForUser(1, []);

            expect(plan.itemsWithOffers).toBe(0);
            expect(plan.totalPayout).toBe(0);
            expect(repository.findAllForExport).not.toHaveBeenCalled();
        });

        it('returns an empty plan without queries when userId is missing', async () => {
            const plan = await service.sellPlanForUser(0);

            expect(repository.findAllForExport).not.toHaveBeenCalled();
            expect(plan.totalPayout).toBe(0);
        });
    });
});
