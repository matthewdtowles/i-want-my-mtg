import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionApiPresenter } from 'src/http/api/transaction/transaction-api.presenter';

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
    return {
        id: 1,
        userId: 42,
        cardId: 'card-abc',
        type: 'BUY',
        quantity: 4,
        pricePerUnit: 12.5,
        isFoil: false,
        date: new Date('2025-03-15T00:00:00Z'),
        source: 'TCGPlayer',
        fees: 1.25,
        notes: 'NM condition',
        createdAt: new Date(Date.now() - 1000), // 1 second ago — within edit window
        ...overrides,
    } as Transaction;
}

describe('TransactionApiPresenter', () => {
    describe('toTransactionItem', () => {
        it('should map all fields correctly', () => {
            const tx = createTransaction();
            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.id).toBe(1);
            expect(result.cardId).toBe('card-abc');
            expect(result.type).toBe('BUY');
            expect(result.quantity).toBe(4);
            expect(result.pricePerUnit).toBe(12.5);
            expect(result.isFoil).toBe(false);
            expect(result.date).toBe('2025-03-15');
            expect(result.source).toBe('TCGPlayer');
            expect(result.fees).toBe(1.25);
            expect(result.notes).toBe('NM condition');
        });

        it('should include cardName, setCode, cardUrl, cardNumber from transaction properties', () => {
            const tx = createTransaction({
                cardName: 'Lightning Bolt',
                cardSetCode: 'lea',
                cardNumber: '161',
            } as any);

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.cardName).toBe('Lightning Bolt');
            expect(result.setCode).toBe('lea');
            expect(result.cardUrl).toBe('/card/lea/161');
            expect(result.cardNumber).toBe('161');
        });

        it('should handle missing card data gracefully', () => {
            const tx = createTransaction();

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.cardName).toBeUndefined();
            expect(result.setCode).toBeUndefined();
            expect(result.cardUrl).toBeUndefined();
            expect(result.cardNumber).toBeUndefined();
        });

        it('should set editable to true when createdAt is within 24h window', () => {
            const tx = createTransaction({
                createdAt: new Date(Date.now() - 1000),
            });

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.editable).toBe(true);
        });

        it('should set editable to false when createdAt is beyond 24h window', () => {
            const tx = createTransaction({
                createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
            });

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.editable).toBe(false);
        });

        it('should set editable to false when createdAt is undefined', () => {
            const tx = createTransaction({ createdAt: undefined });

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.editable).toBe(false);
        });

        it('should format date correctly as YYYY-MM-DD', () => {
            const tx = createTransaction({
                date: new Date('2024-12-25T00:00:00Z'),
            });

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.date).toBe('2024-12-25');
        });

        it('should handle SELL transaction type', () => {
            const tx = createTransaction({ type: 'SELL' });

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.type).toBe('SELL');
        });

        it('should handle foil transactions', () => {
            const tx = createTransaction({ isFoil: true });

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.isFoil).toBe(true);
        });

        it('should handle undefined optional fields', () => {
            const tx = createTransaction({
                source: undefined,
                fees: undefined,
                notes: undefined,
            });

            const result = TransactionApiPresenter.toTransactionItem(tx);

            expect(result.source).toBeUndefined();
            expect(result.fees).toBeUndefined();
            expect(result.notes).toBeUndefined();
        });
    });
});
