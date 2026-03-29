import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { CardImportResolver } from 'src/core/import/card-import-resolver';
import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { TransactionImportService } from 'src/core/transaction/import/transaction-import.service';
import { TransactionImportRow } from 'src/core/transaction/import/transaction-import.types';

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

describe('TransactionImportService', () => {
    let service: TransactionImportService;

    const mockResolver = {
        resolveCard: jest.fn(),
        resolveFoil: jest.fn(),
    };

    const mockTransactionService = {
        create: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionImportService,
                { provide: CardImportResolver, useValue: mockResolver },
                { provide: TransactionService, useValue: mockTransactionService },
            ],
        }).compile();

        service = module.get<TransactionImportService>(TransactionImportService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function validRow(overrides: Partial<TransactionImportRow> = {}): TransactionImportRow {
        return {
            id: 'card-uuid-1',
            type: 'BUY',
            quantity: '4',
            price_per_unit: '2.50',
            date: '2025-01-15',
            ...overrides,
        };
    }

    describe('importTransactions', () => {
        it('creates a BUY transaction for a valid row', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockResolvedValue(
                new Transaction({
                    id: 1,
                    userId: 1,
                    cardId: card.id,
                    type: 'BUY',
                    quantity: 4,
                    pricePerUnit: 2.5,
                    isFoil: false,
                    date: new Date('2025-01-15'),
                })
            );

            const result = await service.importTransactions([validRow()], 1);

            expect(result.saved).toBe(1);
            expect(result.errors).toHaveLength(0);
            expect(mockTransactionService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 1,
                    cardId: card.id,
                    type: 'BUY',
                    quantity: 4,
                    pricePerUnit: 2.5,
                    isFoil: false,
                }),
                undefined
            );
        });

        it('creates a SELL transaction', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockResolvedValue(
                new Transaction({
                    id: 2,
                    userId: 1,
                    cardId: card.id,
                    type: 'SELL',
                    quantity: 2,
                    pricePerUnit: 5.0,
                    isFoil: false,
                    date: new Date('2025-02-01'),
                })
            );

            const result = await service.importTransactions(
                [validRow({ type: 'SELL', quantity: '2', price_per_unit: '5.00' })],
                1
            );

            expect(result.saved).toBe(1);
            expect(mockTransactionService.create).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'SELL', quantity: 2 }),
                undefined
            );
        });

        it('handles optional fields: source, fees, notes', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockResolvedValue(
                new Transaction({
                    id: 3,
                    userId: 1,
                    cardId: card.id,
                    type: 'BUY',
                    quantity: 1,
                    pricePerUnit: 10,
                    isFoil: false,
                    date: new Date('2025-01-15'),
                    source: 'TCGPlayer',
                    fees: 0.5,
                    notes: 'Good deal',
                })
            );

            const result = await service.importTransactions(
                [
                    validRow({
                        quantity: '1',
                        price_per_unit: '10.00',
                        source: 'TCGPlayer',
                        fees: '0.50',
                        notes: 'Good deal',
                    }),
                ],
                1
            );

            expect(result.saved).toBe(1);
            expect(mockTransactionService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    source: 'TCGPlayer',
                    fees: 0.5,
                    notes: 'Good deal',
                }),
                undefined
            );
        });

        it('errors when card resolution fails', async () => {
            mockResolver.resolveCard.mockResolvedValue({
                card: null,
                error: 'Card not found for id: bad-id',
            });

            const result = await service.importTransactions([validRow({ id: 'bad-id' })], 1);

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/not found/i);
            expect(result.errors[0].row).toBe(2);
        });

        it('errors when foil resolution returns null (foil-only conflict)', async () => {
            const card = makeCard({ hasNonFoil: false, hasFoil: true });
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(null);

            const result = await service.importTransactions(
                [validRow({ foil: 'false' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/foil/i);
        });

        it('errors on missing type', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ type: undefined })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/type/i);
        });

        it('errors on invalid type', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ type: 'TRADE' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/type must be BUY or SELL/i);
        });

        it('errors on missing quantity', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ quantity: undefined })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/quantity/i);
        });

        it('errors on non-positive quantity', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ quantity: '0' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/positive/i);
        });

        it('errors on non-numeric quantity', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ quantity: 'abc' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/quantity/i);
        });

        it('errors on missing price_per_unit', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ price_per_unit: undefined })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/price/i);
        });

        it('errors on negative price_per_unit', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ price_per_unit: '-1.00' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/negative/i);
        });

        it('allows zero price_per_unit', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockResolvedValue(
                new Transaction({
                    id: 4,
                    userId: 1,
                    cardId: card.id,
                    type: 'BUY',
                    quantity: 1,
                    pricePerUnit: 0,
                    isFoil: false,
                    date: new Date('2025-01-15'),
                })
            );

            const result = await service.importTransactions(
                [validRow({ price_per_unit: '0' })],
                1
            );

            expect(result.saved).toBe(1);
            expect(result.errors).toHaveLength(0);
        });

        it('errors on missing date', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ date: undefined })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/date/i);
        });

        it('errors on invalid date', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ date: 'not-a-date' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/date/i);
        });

        it('reports TransactionService.create errors per row', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockRejectedValue(
                new Error('Cannot sell 4 units. Only 0 remaining.')
            );

            const result = await service.importTransactions(
                [validRow({ type: 'SELL' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/Cannot sell/);
        });

        it('processes valid rows despite errors in other rows (best-effort)', async () => {
            const card = makeCard();
            mockResolver.resolveCard
                .mockResolvedValueOnce({ card: null, error: 'Not found' })
                .mockResolvedValueOnce({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockResolvedValue(
                new Transaction({
                    id: 5,
                    userId: 1,
                    cardId: card.id,
                    type: 'BUY',
                    quantity: 1,
                    pricePerUnit: 1,
                    isFoil: false,
                    date: new Date('2025-01-15'),
                })
            );

            const result = await service.importTransactions(
                [validRow({ id: 'bad-id' }), validRow()],
                1
            );

            expect(result.saved).toBe(1);
            expect(result.errors).toHaveLength(1);
        });

        it('caps rows at MAX_ROWS and reports truncation error', async () => {
            const rows: TransactionImportRow[] = [];
            for (let i = 0; i < 2001; i++) {
                rows.push(validRow());
            }

            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockResolvedValue(
                new Transaction({
                    id: 99,
                    userId: 1,
                    cardId: card.id,
                    type: 'BUY',
                    quantity: 4,
                    pricePerUnit: 2.5,
                    isFoil: false,
                    date: new Date('2025-01-15'),
                })
            );

            const result = await service.importTransactions(rows, 1);

            expect(result.saved).toBe(2000);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/2000 row limit/);
        });

        it('normalizes type to uppercase', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);
            mockTransactionService.create.mockResolvedValue(
                new Transaction({
                    id: 6,
                    userId: 1,
                    cardId: card.id,
                    type: 'BUY',
                    quantity: 1,
                    pricePerUnit: 1,
                    isFoil: false,
                    date: new Date('2025-01-15'),
                })
            );

            const result = await service.importTransactions(
                [validRow({ type: 'buy' })],
                1
            );

            expect(result.saved).toBe(1);
            expect(mockTransactionService.create).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'BUY' }),
                undefined
            );
        });

        it('errors on invalid fees value', async () => {
            const card = makeCard();
            mockResolver.resolveCard.mockResolvedValue({ card, error: null });
            mockResolver.resolveFoil.mockReturnValue(false);

            const result = await service.importTransactions(
                [validRow({ fees: 'abc' })],
                1
            );

            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toMatch(/fees/i);
        });

        it('includes row fields in error for debugging', async () => {
            mockResolver.resolveCard.mockResolvedValue({
                card: null,
                error: 'Card not found',
            });

            const row = validRow({ name: 'Missing Card', set_code: 'xxx' });
            const result = await service.importTransactions([row], 1);

            expect(result.errors[0]).toMatchObject({
                row: 2,
                name: 'Missing Card',
                set_code: 'xxx',
            });
        });
    });
});
