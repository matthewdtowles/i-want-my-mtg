import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionRepositoryPort } from 'src/core/transaction/transaction.repository.port';
import { TransactionService } from 'src/core/transaction/transaction.service';

describe('TransactionService', () => {
    let service: TransactionService;
    let repository: jest.Mocked<TransactionRepositoryPort>;
    let inventoryService: jest.Mocked<InventoryService>;

    const today = new Date('2025-06-01');

    const buyLot1 = new Transaction({
        id: 1,
        userId: 1,
        cardId: 'card-1',
        type: 'BUY',
        quantity: 2,
        pricePerUnit: 5.0,
        isFoil: false,
        date: new Date('2025-01-01'),
    });

    const buyLot2 = new Transaction({
        id: 2,
        userId: 1,
        cardId: 'card-1',
        type: 'BUY',
        quantity: 4,
        pricePerUnit: 8.0,
        isFoil: false,
        date: new Date('2025-03-15'),
    });

    const sellTx = new Transaction({
        id: 3,
        userId: 1,
        cardId: 'card-1',
        type: 'SELL',
        quantity: 3,
        pricePerUnit: 10.0,
        isFoil: false,
        date: new Date('2025-06-01'),
    });

    const mockRepository = {
        save: jest.fn(),
        findById: jest.fn(),
        findByUserAndCard: jest.fn(),
        findBuyLots: jest.fn(),
        findSells: jest.fn(),
        findByUser: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    const mockInventoryService = {
        save: jest.fn().mockResolvedValue([]),
        findForUser: jest.fn().mockResolvedValue([]),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionService,
                { provide: TransactionRepositoryPort, useValue: mockRepository },
                { provide: InventoryService, useValue: mockInventoryService },
            ],
        }).compile();

        service = module.get<TransactionService>(TransactionService);
        repository = module.get(
            TransactionRepositoryPort
        ) as jest.Mocked<TransactionRepositoryPort>;
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a BUY transaction', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 2,
                pricePerUnit: 5.0,
                isFoil: false,
                date: today,
            });
            repository.save.mockResolvedValue({ ...tx, id: 1 });

            const result = await service.create(tx);

            expect(repository.save).toHaveBeenCalledWith(tx);
            expect(result.id).toBe(1);
        });

        it('should create a SELL transaction when sufficient quantity exists', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'SELL',
                quantity: 3,
                pricePerUnit: 10.0,
                isFoil: false,
                date: today,
            });

            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([]);
            repository.save.mockResolvedValue({ ...tx, id: 3 });

            const result = await service.create(tx);

            expect(repository.save).toHaveBeenCalledWith(tx);
            expect(result.id).toBe(3);
        });

        it('should reject SELL when insufficient quantity', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'SELL',
                quantity: 10,
                pricePerUnit: 10.0,
                isFoil: false,
                date: today,
            });

            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([]);

            await expect(service.create(tx)).rejects.toThrow(
                'Cannot sell 10 units. Only 6 remaining.'
            );
            expect(repository.save).not.toHaveBeenCalled();
        });

        it('should reject zero quantity', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 0,
                pricePerUnit: 5.0,
                isFoil: false,
                date: today,
            });

            await expect(service.create(tx)).rejects.toThrow(
                'Transaction quantity must be positive.'
            );
        });

        it('should reject negative price', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 1,
                pricePerUnit: -1.0,
                isFoil: false,
                date: today,
            });

            await expect(service.create(tx)).rejects.toThrow('Price per unit cannot be negative.');
        });

        it('should reject invalid transaction type', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'TRADE' as any,
                quantity: 1,
                pricePerUnit: 5.0,
                isFoil: false,
                date: today,
            });

            await expect(service.create(tx)).rejects.toThrow(
                'Transaction type must be BUY or SELL.'
            );
        });
    });

    describe('update', () => {
        it('should update quantity and return old quantity', async () => {
            repository.findById.mockResolvedValue(buyLot1);
            const updatedTx = new Transaction({ ...buyLot1, quantity: 5 });
            repository.update.mockResolvedValue(updatedTx);

            const result = await service.update(1, 1, { quantity: 5 });

            expect(result.updated.quantity).toBe(5);
            expect(result.oldQuantity).toBe(2);
            expect(repository.update).toHaveBeenCalledWith(1, 1, { quantity: 5 });
        });

        it('should update price per unit', async () => {
            repository.findById.mockResolvedValue(buyLot1);
            const updatedTx = new Transaction({ ...buyLot1, pricePerUnit: 9.0 });
            repository.update.mockResolvedValue(updatedTx);

            const result = await service.update(1, 1, { pricePerUnit: 9.0 });

            expect(result.updated.pricePerUnit).toBe(9.0);
        });

        it('should throw if transaction not found', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.update(999, 1, { quantity: 5 })).rejects.toThrow(
                'Transaction not found.'
            );
        });

        it('should throw if transaction belongs to different user', async () => {
            repository.findById.mockResolvedValue(buyLot1);

            await expect(service.update(1, 999, { quantity: 5 })).rejects.toThrow(
                'Transaction not found.'
            );
        });

        it('should reject zero quantity', async () => {
            repository.findById.mockResolvedValue(buyLot1);

            await expect(service.update(1, 1, { quantity: 0 })).rejects.toThrow(
                'Transaction quantity must be positive.'
            );
        });

        it('should reject negative price', async () => {
            repository.findById.mockResolvedValue(buyLot1);

            await expect(service.update(1, 1, { pricePerUnit: -1 })).rejects.toThrow(
                'Price per unit cannot be negative.'
            );
        });

        it('should validate SELL quantity update against remaining', async () => {
            repository.findById.mockResolvedValue(sellTx);
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([sellTx]);

            // Remaining = 6 - 3 = 3, plus old sell qty 3 = 6 available
            // Trying to sell 7 should fail
            await expect(service.update(3, 1, { quantity: 7 })).rejects.toThrow(
                'Cannot sell 7 units. Only 6 remaining.'
            );
        });

        it('should allow valid SELL quantity update', async () => {
            repository.findById.mockResolvedValue(sellTx);
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([sellTx]);
            const updatedTx = new Transaction({ ...sellTx, quantity: 5 });
            repository.update.mockResolvedValue(updatedTx);

            const result = await service.update(3, 1, { quantity: 5 });

            expect(result.updated.quantity).toBe(5);
        });
    });

    describe('delete', () => {
        it('should delete a transaction owned by the user', async () => {
            repository.findById.mockResolvedValue(buyLot1);
            repository.delete.mockResolvedValue();

            await service.delete(1, 1);

            expect(repository.delete).toHaveBeenCalledWith(1, 1);
        });

        it('should throw if transaction not found', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.delete(999, 1)).rejects.toThrow('Transaction not found.');
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('should throw if transaction belongs to different user', async () => {
            repository.findById.mockResolvedValue(buyLot1);

            await expect(service.delete(1, 999)).rejects.toThrow('Transaction not found.');
            expect(repository.delete).not.toHaveBeenCalled();
        });
    });

    describe('getRemainingQuantity', () => {
        it('should return total bought minus total sold', async () => {
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([sellTx]);

            const remaining = await service.getRemainingQuantity(1, 'card-1', false);

            expect(remaining).toBe(3); // (2 + 4) - 3 = 3
        });

        it('should return full quantity when nothing sold', async () => {
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([]);

            const remaining = await service.getRemainingQuantity(1, 'card-1', false);

            expect(remaining).toBe(6);
        });

        it('should return 0 when nothing bought', async () => {
            repository.findBuyLots.mockResolvedValue([]);
            repository.findSells.mockResolvedValue([]);

            const remaining = await service.getRemainingQuantity(1, 'card-1', false);

            expect(remaining).toBe(0);
        });
    });

    describe('getFifoLotAllocations', () => {
        it('should consume lots in FIFO order', async () => {
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([sellTx]);

            const result = await service.getFifoLotAllocations(1, 'card-1', false);

            // Sell 3: consume all 2 from lot1, 1 from lot2
            // Lot1 fully consumed (remaining=0, filtered out)
            // Lot2 has 3 remaining
            expect(result.lots).toHaveLength(1);
            expect(result.lots[0]).toEqual({
                lotId: 2,
                remaining: 3,
                costPerUnit: 8.0,
            });
        });

        it('should compute realized gain from FIFO sells', async () => {
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([sellTx]);

            const result = await service.getFifoLotAllocations(1, 'card-1', false);

            // Sell price = $10.00 per unit, 3 sold
            // Lot1: 2 units @ $5.00 -> gain = 2 * (10 - 5) = $10.00
            // Lot2: 1 unit @ $8.00 -> gain = 1 * (10 - 8) = $2.00
            // Total realized gain = $12.00
            expect(result.totalRealizedGain).toBe(12.0);
            // Total cost of sold units = 2*5 + 1*8 = $18.00
            expect(result.totalSoldCost).toBe(18.0);
        });

        it('should return all lots intact when nothing sold', async () => {
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([]);

            const result = await service.getFifoLotAllocations(1, 'card-1', false);

            expect(result.lots).toHaveLength(2);
            expect(result.lots[0]).toEqual({
                lotId: 1,
                remaining: 2,
                costPerUnit: 5.0,
            });
            expect(result.lots[1]).toEqual({
                lotId: 2,
                remaining: 4,
                costPerUnit: 8.0,
            });
            expect(result.totalRealizedGain).toBe(0);
            expect(result.totalSoldCost).toBe(0);
        });

        it('should handle all lots fully consumed', async () => {
            const sellAll = new Transaction({
                id: 4,
                userId: 1,
                cardId: 'card-1',
                type: 'SELL',
                quantity: 6,
                pricePerUnit: 12.0,
                isFoil: false,
                date: new Date('2025-07-01'),
            });

            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([sellAll]);

            const result = await service.getFifoLotAllocations(1, 'card-1', false);

            expect(result.lots).toHaveLength(0);
            // Realized gain: 2*(12-5) + 4*(12-8) = 14 + 16 = 30
            expect(result.totalRealizedGain).toBe(30.0);
        });
    });

    describe('getCostBasis', () => {
        it('should compute cost basis summary', async () => {
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([sellTx]);

            const result = await service.getCostBasis(1, 'card-1', false, 12.0);

            // After FIFO: 3 remaining in lot2 @ $8.00
            expect(result.totalQuantity).toBe(3);
            expect(result.totalCost).toBe(24.0); // 3 * 8
            expect(result.averageCost).toBe(8.0);
            // Unrealized: 3 * (12 - 8) = 12
            expect(result.unrealizedGain).toBe(12.0);
            // Realized: 2*(10-5) + 1*(10-8) = 12
            expect(result.realizedGain).toBe(12.0);
        });

        it('should return zeros when no transactions exist', async () => {
            repository.findBuyLots.mockResolvedValue([]);
            repository.findSells.mockResolvedValue([]);

            const result = await service.getCostBasis(1, 'card-1', false, 10.0);

            expect(result.totalQuantity).toBe(0);
            expect(result.totalCost).toBe(0);
            expect(result.averageCost).toBe(0);
            expect(result.unrealizedGain).toBe(0);
            expect(result.realizedGain).toBe(0);
        });
    });

    describe('findById', () => {
        it('should return transaction when found', async () => {
            repository.findById.mockResolvedValue(buyLot1);

            const result = await service.findById(1);

            expect(repository.findById).toHaveBeenCalledWith(1);
            expect(result).toEqual(buyLot1);
        });

        it('should return null when not found', async () => {
            repository.findById.mockResolvedValue(null);

            const result = await service.findById(999);

            expect(result).toBeNull();
        });
    });

    describe('findByUser', () => {
        it('should return all transactions for a user', async () => {
            const transactions = [buyLot1, buyLot2, sellTx];
            repository.findByUser.mockResolvedValue(transactions);

            const result = await service.findByUser(1);

            expect(repository.findByUser).toHaveBeenCalledWith(1);
            expect(result).toEqual(transactions);
        });
    });

    describe('findByUserAndCard', () => {
        it('should return transactions for a user and card', async () => {
            const transactions = [buyLot1, buyLot2];
            repository.findByUserAndCard.mockResolvedValue(transactions);

            const result = await service.findByUserAndCard(1, 'card-1', false);

            expect(repository.findByUserAndCard).toHaveBeenCalledWith(1, 'card-1', false);
            expect(result).toEqual(transactions);
        });
    });

    describe('inventory sync', () => {
        it('should increment inventory on BUY create', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 3,
                pricePerUnit: 5.0,
                isFoil: false,
                date: today,
            });
            repository.save.mockResolvedValue({ ...tx, id: 10 });
            inventoryService.findForUser.mockResolvedValue([]);

            await service.create(tx);

            expect(inventoryService.save).toHaveBeenCalledWith([
                expect.objectContaining({
                    cardId: 'card-1',
                    userId: 1,
                    isFoil: false,
                    quantity: 3,
                }),
            ]);
        });

        it('should add to existing inventory on BUY create', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 2,
                pricePerUnit: 5.0,
                isFoil: false,
                date: today,
            });
            repository.save.mockResolvedValue({ ...tx, id: 10 });
            inventoryService.findForUser.mockResolvedValue([
                { cardId: 'card-1', userId: 1, isFoil: false, quantity: 4 } as any,
            ]);

            await service.create(tx);

            expect(inventoryService.save).toHaveBeenCalledWith([
                expect.objectContaining({ quantity: 6 }),
            ]);
        });

        it('should decrement inventory on SELL create', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'SELL',
                quantity: 2,
                pricePerUnit: 10.0,
                isFoil: false,
                date: today,
            });
            repository.findBuyLots.mockResolvedValue([buyLot1, buyLot2]);
            repository.findSells.mockResolvedValue([]);
            repository.save.mockResolvedValue({ ...tx, id: 10 });
            inventoryService.findForUser.mockResolvedValue([
                { cardId: 'card-1', userId: 1, isFoil: false, quantity: 6 } as any,
            ]);

            await service.create(tx);

            expect(inventoryService.save).toHaveBeenCalledWith([
                expect.objectContaining({ quantity: 4 }),
            ]);
        });

        it('should skip inventory sync when skipInventorySync option is set', async () => {
            const tx = new Transaction({
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 2,
                pricePerUnit: 5.0,
                isFoil: false,
                date: today,
            });
            repository.save.mockResolvedValue({ ...tx, id: 10 });

            await service.create(tx, { skipInventorySync: true });

            expect(inventoryService.findForUser).not.toHaveBeenCalled();
            expect(inventoryService.save).not.toHaveBeenCalled();
        });

        it('should reverse inventory on BUY delete', async () => {
            repository.findById.mockResolvedValue(buyLot1);
            repository.delete.mockResolvedValue();
            inventoryService.findForUser.mockResolvedValue([
                { cardId: 'card-1', userId: 1, isFoil: false, quantity: 5 } as any,
            ]);

            await service.delete(1, 1);

            expect(inventoryService.save).toHaveBeenCalledWith([
                expect.objectContaining({ quantity: 3 }),
            ]);
        });

        it('should reverse inventory on SELL delete', async () => {
            repository.findById.mockResolvedValue(sellTx);
            repository.delete.mockResolvedValue();
            inventoryService.findForUser.mockResolvedValue([
                { cardId: 'card-1', userId: 1, isFoil: false, quantity: 3 } as any,
            ]);

            await service.delete(3, 1);

            expect(inventoryService.save).toHaveBeenCalledWith([
                expect.objectContaining({ quantity: 6 }),
            ]);
        });

        it('should adjust inventory on quantity update', async () => {
            repository.findById.mockResolvedValue(buyLot1); // qty=2
            const updatedTx = new Transaction({ ...buyLot1, quantity: 5 });
            repository.update.mockResolvedValue(updatedTx);
            inventoryService.findForUser.mockResolvedValue([
                { cardId: 'card-1', userId: 1, isFoil: false, quantity: 4 } as any,
            ]);

            await service.update(1, 1, { quantity: 5 });

            // BUY: delta = 5 - 2 = 3, inventory delta = +3
            expect(inventoryService.save).toHaveBeenCalledWith([
                expect.objectContaining({ quantity: 7 }),
            ]);
        });

        it('should not adjust inventory when quantity unchanged', async () => {
            repository.findById.mockResolvedValue(buyLot1);
            const updatedTx = new Transaction({ ...buyLot1, pricePerUnit: 9.0 });
            repository.update.mockResolvedValue(updatedTx);

            await service.update(1, 1, { pricePerUnit: 9.0 });

            expect(inventoryService.findForUser).not.toHaveBeenCalled();
        });

        it('should not allow inventory to go below 0', async () => {
            repository.findById.mockResolvedValue(buyLot1);
            repository.delete.mockResolvedValue();
            inventoryService.findForUser.mockResolvedValue([
                { cardId: 'card-1', userId: 1, isFoil: false, quantity: 1 } as any,
            ]);

            await service.delete(1, 1); // buyLot1 has qty 2, but inventory only has 1

            // Should clamp to 0 (Math.max(0, 1 - 2))
            expect(inventoryService.save).toHaveBeenCalledWith([
                expect.objectContaining({ quantity: 0 }),
            ]);
        });
    });
});
