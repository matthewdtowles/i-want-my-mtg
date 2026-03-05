import { Test, TestingModule } from '@nestjs/testing';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/inventory.repository.port';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { TransactionRepositoryPort } from 'src/core/transaction/transaction.repository.port';

describe('InventoryService', () => {
    let service: InventoryService;
    let repository: jest.Mocked<InventoryRepositoryPort>;
    let transactionRepository: jest.Mocked<TransactionRepositoryPort>;

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
        findByUser: jest.fn(),
        delete: jest.fn(),
    };

    const mockTransactionRepository = {
        save: jest.fn(),
        findById: jest.fn(),
        findByUserAndCard: jest.fn(),
        findBuyLots: jest.fn().mockResolvedValue([]),
        findSells: jest.fn().mockResolvedValue([]),
        findByUser: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: InventoryRepositoryPort, useValue: mockRepository },
                { provide: TransactionRepositoryPort, useValue: mockTransactionRepository },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        repository = module.get(InventoryRepositoryPort) as jest.Mocked<InventoryRepositoryPort>;
        transactionRepository = module.get(TransactionRepositoryPort) as jest.Mocked<TransactionRepositoryPort>;
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

    describe('delete', () => {
        it('should delete an inventory item and return true on success', async () => {
            transactionRepository.findBuyLots.mockResolvedValue([]);
            transactionRepository.findSells.mockResolvedValue([]);
            repository.delete.mockResolvedValue();
            repository.findOne.mockResolvedValue(null);

            const result = await service.delete(1, 'card-1', false);

            expect(repository.delete).toHaveBeenCalledWith(1, 'card-1', false);
            expect(repository.findOne).toHaveBeenCalledWith(1, 'card-1', false);
            expect(result).toBe(true);
        });

        it('should return false if item still exists after deletion', async () => {
            transactionRepository.findBuyLots.mockResolvedValue([]);
            transactionRepository.findSells.mockResolvedValue([]);
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
            transactionRepository.findBuyLots.mockResolvedValue([]);
            transactionRepository.findSells.mockResolvedValue([]);
            repository.delete.mockRejectedValue(new Error('Database error'));
            const result = await service.delete(1, 'card-1', false);

            expect(repository.delete).toHaveBeenCalledWith(1, 'card-1', false);
            expect(result).toBe(false);
        });

        it('should throw error when transactions exist for the card', async () => {
            transactionRepository.findBuyLots.mockResolvedValue([
                { id: 1, quantity: 5, pricePerUnit: 10 } as any,
            ]);
            transactionRepository.findSells.mockResolvedValue([]);

            await expect(service.delete(1, 'card-1', false)).rejects.toThrow(
                'Cannot delete inventory. 5 units are accounted for in transactions.',
            );
            expect(repository.delete).not.toHaveBeenCalled();
        });
    });

    describe('transaction-derived quantity validation', () => {
        it('should prevent setting inventory below transaction-derived quantity', async () => {
            transactionRepository.findBuyLots.mockResolvedValue([
                { id: 1, quantity: 10, pricePerUnit: 5 } as any,
            ]);
            transactionRepository.findSells.mockResolvedValue([
                { id: 2, quantity: 3, pricePerUnit: 8 } as any,
            ]);

            const lowItem = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 5,
            });

            await expect(service.save([lowItem])).rejects.toThrow(
                'Cannot set inventory to 5. 7 units are accounted for in transactions.',
            );
        });

        it('should allow setting inventory at or above transaction-derived quantity', async () => {
            transactionRepository.findBuyLots.mockResolvedValue([
                { id: 1, quantity: 10, pricePerUnit: 5 } as any,
            ]);
            transactionRepository.findSells.mockResolvedValue([
                { id: 2, quantity: 3, pricePerUnit: 8 } as any,
            ]);

            const validItem = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 7,
            });

            repository.save.mockResolvedValue([validItem]);
            const result = await service.save([validItem]);
            expect(result).toEqual([validItem]);
        });

        it('should prevent removing inventory when transactions exist', async () => {
            transactionRepository.findBuyLots.mockResolvedValue([
                { id: 1, quantity: 5, pricePerUnit: 10 } as any,
            ]);
            transactionRepository.findSells.mockResolvedValue([]);

            const zeroItem = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 0,
            });

            await expect(service.save([zeroItem])).rejects.toThrow(
                'Cannot remove inventory. 5 units are accounted for in transactions.',
            );
        });

        it('should allow any quantity when no transactions exist', async () => {
            transactionRepository.findBuyLots.mockResolvedValue([]);
            transactionRepository.findSells.mockResolvedValue([]);

            const item = new Inventory({
                cardId: 'card-1',
                userId: 1,
                isFoil: false,
                quantity: 1,
            });

            repository.save.mockResolvedValue([item]);
            const result = await service.save([item]);
            expect(result).toEqual([item]);
        });
    });
});
