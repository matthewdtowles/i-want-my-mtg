import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from 'src/core/card/card.service';
import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { TransactionOrchestrator } from 'src/http/hbs/transaction/transaction.orchestrator';

describe('TransactionOrchestrator', () => {
    let orchestrator: TransactionOrchestrator;
    let transactionService: jest.Mocked<TransactionService>;
    let cardService: jest.Mocked<CardService>;

    const mockAuthenticatedRequest = {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockUnauthenticatedRequest = {
        user: null,
        isAuthenticated: () => false,
    } as unknown as AuthenticatedRequest;

    const testTransaction = new Transaction({
        id: 1,
        userId: 1,
        cardId: 'card-1',
        type: 'BUY',
        quantity: 2,
        pricePerUnit: 5.0,
        isFoil: false,
        date: new Date('2025-06-01'),
    });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionOrchestrator,
                {
                    provide: TransactionService,
                    useValue: {
                        create: jest.fn(),
                        findByUser: jest.fn(),
                        findByUserAndCard: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        getCostBasis: jest.fn(),
                    },
                },
                {
                    provide: CardService,
                    useValue: {
                        findByIds: jest.fn(),
                    },
                },
            ],
        }).compile();

        orchestrator = module.get(TransactionOrchestrator);
        transactionService = module.get(TransactionService) as jest.Mocked<TransactionService>;
        cardService = module.get(CardService) as jest.Mocked<CardService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByUser', () => {
        it('should return transaction view with items', async () => {
            transactionService.findByUser.mockResolvedValue([testTransaction]);
            cardService.findByIds.mockResolvedValue([
                { id: 'card-1', name: 'Lightning Bolt', setCode: 'lea', number: '161' } as any,
            ]);

            const result = await orchestrator.findByUser(mockAuthenticatedRequest);

            expect(result.hasTransactions).toBe(true);
            expect(result.totalTransactions).toBe(1);
            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0].cardName).toBe('Lightning Bolt');
            expect(result.authenticated).toBe(true);
            expect(result.username).toBe('Test User');
        });

        it('should return empty view when no transactions', async () => {
            transactionService.findByUser.mockResolvedValue([]);
            cardService.findByIds.mockResolvedValue([]);

            const result = await orchestrator.findByUser(mockAuthenticatedRequest);

            expect(result.hasTransactions).toBe(false);
            expect(result.totalTransactions).toBe(0);
            expect(result.transactions).toHaveLength(0);
        });

        it('should throw on unauthenticated request', async () => {
            await expect(orchestrator.findByUser(mockUnauthenticatedRequest)).rejects.toThrow();
        });
    });

    describe('create', () => {
        it('should create a transaction and return success', async () => {
            const dto = {
                cardId: 'card-1',
                type: 'BUY' as const,
                quantity: 2,
                pricePerUnit: 5.0,
                isFoil: false,
                date: '2025-06-01',
            };
            transactionService.create.mockResolvedValue(testTransaction);

            const result = await orchestrator.create(dto, mockAuthenticatedRequest);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ id: 1, type: 'BUY', quantity: 2 });
        });

        it('should return error on service failure', async () => {
            const dto = {
                cardId: 'card-1',
                type: 'SELL' as const,
                quantity: 100,
                pricePerUnit: 5.0,
                isFoil: false,
                date: '2025-06-01',
            };
            transactionService.create.mockRejectedValue(
                new Error('Cannot sell 100 units. Only 6 remaining.')
            );

            const result = await orchestrator.create(dto, mockAuthenticatedRequest);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot sell 100 units. Only 6 remaining.');
        });
    });

    describe('update', () => {
        it('should update a transaction and return success', async () => {
            const updatedTx = new Transaction({
                id: 1,
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 5,
                pricePerUnit: 7.0,
                isFoil: false,
                date: new Date('2025-06-01'),
            });
            transactionService.update.mockResolvedValue({ updated: updatedTx, oldQuantity: 2 });

            const result = await orchestrator.update(
                1,
                { quantity: 5, pricePerUnit: 7.0 },
                mockAuthenticatedRequest
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ id: 1, type: 'BUY', quantity: 5 });
        });

        it('should return error on update failure', async () => {
            transactionService.update.mockRejectedValue(new Error('Transaction not found.'));

            const result = await orchestrator.update(
                999,
                { quantity: 5 },
                mockAuthenticatedRequest
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Transaction not found.');
        });
    });

    describe('delete', () => {
        it('should delete a transaction and return success', async () => {
            transactionService.delete.mockResolvedValue();

            const result = await orchestrator.delete(1, mockAuthenticatedRequest);

            expect(result.success).toBe(true);
            expect(transactionService.delete).toHaveBeenCalledWith(1, 1);
        });

        it('should return error when transaction not found', async () => {
            transactionService.delete.mockRejectedValue(new Error('Transaction not found.'));

            const result = await orchestrator.delete(999, mockAuthenticatedRequest);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Transaction not found.');
        });
    });

    describe('getCostBasis', () => {
        it('should return formatted cost basis', async () => {
            transactionService.getCostBasis.mockResolvedValue({
                totalCost: 24.0,
                totalQuantity: 3,
                averageCost: 8.0,
                unrealizedGain: 12.0,
                realizedGain: 10.0,
            });

            const result = await orchestrator.getCostBasis(1, 'card-1', false, 12.0);

            expect(result.hasData).toBe(true);
            expect(result.totalQuantity).toBe(3);
        });

        it('should return empty cost basis on error', async () => {
            transactionService.getCostBasis.mockRejectedValue(new Error('DB error'));

            const result = await orchestrator.getCostBasis(1, 'card-1', false, 12.0);

            expect(result.hasData).toBe(false);
        });
    });

    describe('exportCsv', () => {
        it('should generate CSV with headers and transaction rows', async () => {
            transactionService.findByUser.mockResolvedValue([testTransaction]);
            cardService.findByIds.mockResolvedValue([
                { id: 'card-1', name: 'Lightning Bolt', setCode: 'lea', number: '161' } as any,
            ]);

            const csv = await orchestrator.exportCsv(mockAuthenticatedRequest);

            expect(csv).toContain(
                'Date,Type,Card Name,Set,Collector #,Foil,Quantity,Price Per Unit,Total,Fees,Source,Notes'
            );
            expect(csv).toContain('BUY');
            expect(csv).toContain('Lightning Bolt');
            expect(csv).toContain('LEA');
            expect(csv).toContain('161');
            expect(csv).toContain('No'); // not foil
        });

        it('should handle empty transactions', async () => {
            transactionService.findByUser.mockResolvedValue([]);
            cardService.findByIds.mockResolvedValue([]);

            const csv = await orchestrator.exportCsv(mockAuthenticatedRequest);

            const lines = csv.trim().split('\n');
            expect(lines).toHaveLength(1); // headers only
        });
    });

    describe('getCardTransactions', () => {
        it('should return transactions for a card', async () => {
            transactionService.findByUserAndCard.mockResolvedValue([testTransaction]);
            cardService.findByIds.mockResolvedValue([
                { id: 'card-1', name: 'Lightning Bolt', setCode: 'lea', number: '161' } as any,
            ]);

            const result = await orchestrator.getCardTransactions(1, 'card-1');

            expect(result).toHaveLength(1);
            expect(result[0].cardName).toBe('Lightning Bolt');
        });

        it('should return empty array on error', async () => {
            transactionService.findByUserAndCard.mockRejectedValue(new Error('DB error'));

            const result = await orchestrator.getCardTransactions(1, 'card-1');

            expect(result).toEqual([]);
        });
    });
});
