import { Transaction } from 'src/core/transaction/transaction.entity';
import { CostBasisSummary } from 'src/core/transaction/transaction.service';
import { TransactionPresenter } from 'src/http/transaction/transaction.presenter';

describe('TransactionPresenter', () => {
    describe('toEntity', () => {
        it('should convert request DTO to domain entity', () => {
            const dto = {
                cardId: 'card-1',
                type: 'BUY' as const,
                quantity: 3,
                pricePerUnit: 5.5,
                isFoil: false,
                date: '2025-06-01',
                source: 'tcgplayer',
            };

            const entity = TransactionPresenter.toEntity(dto, 1);

            expect(entity.userId).toBe(1);
            expect(entity.cardId).toBe('card-1');
            expect(entity.type).toBe('BUY');
            expect(entity.quantity).toBe(3);
            expect(entity.pricePerUnit).toBe(5.5);
            expect(entity.isFoil).toBe(false);
            expect(entity.date).toEqual(new Date('2025-06-01'));
            expect(entity.source).toBe('tcgplayer');
        });
    });

    describe('toResponseDto', () => {
        it('should convert domain entity to response DTO', () => {
            const tx = new Transaction({
                id: 1,
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 2,
                pricePerUnit: 5.0,
                isFoil: false,
                date: new Date('2025-06-01'),
                source: 'lgs',
            });

            const dto = TransactionPresenter.toResponseDto(tx, 'Lightning Bolt', 'lea', '161');

            expect(dto.id).toBe(1);
            expect(dto.cardName).toBe('Lightning Bolt');
            expect(dto.cardSetCode).toBe('lea');
            expect(dto.cardUrl).toBe('/card/lea/161');
            expect(dto.type).toBe('BUY');
            expect(dto.quantity).toBe(2);
            expect(dto.pricePerUnit).toBe('$5.00');
            expect(dto.totalPrice).toBe('$10.00');
            expect(dto.isFoil).toBe(false);
            expect(dto.date).toBe('2025-06-01');
            expect(dto.source).toBe('lgs');
        });

        it('should display fees of 0 as $0.00', () => {
            const tx = new Transaction({
                id: 1,
                userId: 1,
                cardId: 'card-1',
                type: 'BUY',
                quantity: 1,
                pricePerUnit: 5.0,
                isFoil: false,
                date: new Date('2025-06-01'),
                fees: 0,
            });

            const dto = TransactionPresenter.toResponseDto(tx);

            expect(dto.fees).toBe('$0.00');
            expect(dto.rawFees).toBe(0);
        });

        it('should handle missing card info gracefully', () => {
            const tx = new Transaction({
                id: 1,
                userId: 1,
                cardId: 'card-1',
                type: 'SELL',
                quantity: 1,
                pricePerUnit: 10.0,
                isFoil: true,
                date: new Date('2025-06-01'),
            });

            const dto = TransactionPresenter.toResponseDto(tx);

            expect(dto.cardName).toBe('');
            expect(dto.cardSetCode).toBe('');
            expect(dto.cardUrl).toBe('');
        });
    });

    describe('toCostBasisResponse', () => {
        it('should format cost basis summary', () => {
            const summary: CostBasisSummary = {
                totalCost: 24.0,
                totalQuantity: 3,
                averageCost: 8.0,
                unrealizedGain: 12.0,
                realizedGain: 10.0,
            };

            const dto = TransactionPresenter.toCostBasisResponse(summary, 12.0);

            expect(dto.totalCost).toBe('$24.00');
            expect(dto.totalQuantity).toBe(3);
            expect(dto.averageCost).toBe('$8.00');
            expect(dto.unrealizedGain).toBe('+$12.00');
            expect(dto.unrealizedGainSign).toBe('positive');
            expect(dto.realizedGain).toBe('+$10.00');
            expect(dto.realizedGainSign).toBe('positive');
            expect(dto.currentValue).toBe('$36.00');
            expect(dto.hasData).toBe(true);
        });

        it('should handle negative gains', () => {
            const summary: CostBasisSummary = {
                totalCost: 30.0,
                totalQuantity: 3,
                averageCost: 10.0,
                unrealizedGain: -6.0,
                realizedGain: -2.0,
            };

            const dto = TransactionPresenter.toCostBasisResponse(summary, 8.0);

            expect(dto.unrealizedGain).toBe('-$6.00');
            expect(dto.unrealizedGainSign).toBe('negative');
            expect(dto.realizedGain).toBe('-$2.00');
            expect(dto.realizedGainSign).toBe('negative');
            expect(dto.roiSign).toBe('negative');
        });

        it('should handle zero quantities', () => {
            const summary: CostBasisSummary = {
                totalCost: 0,
                totalQuantity: 0,
                averageCost: 0,
                unrealizedGain: 0,
                realizedGain: 0,
            };

            const dto = TransactionPresenter.toCostBasisResponse(summary, 10.0);

            expect(dto.hasData).toBe(false);
            expect(dto.roi).toBe('0.0%');
        });
    });

    describe('formatDate', () => {
        it('should format date as YYYY-MM-DD', () => {
            const result = TransactionPresenter.formatDate(new Date('2025-06-01'));
            expect(result).toBe('2025-06-01');
        });

        it('should handle null', () => {
            expect(TransactionPresenter.formatDate(null)).toBe('');
        });
    });

    describe('isEditable', () => {
        it('should return true when createdAt is undefined', () => {
            expect(TransactionPresenter.isEditable(undefined)).toBe(true);
        });

        it('should return true when created less than 24 hours ago', () => {
            const recent = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
            expect(TransactionPresenter.isEditable(recent)).toBe(true);
        });

        it('should return false when created more than 24 hours ago', () => {
            const old = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
            expect(TransactionPresenter.isEditable(old)).toBe(false);
        });

        it('should return true at exactly 23 hours 59 minutes', () => {
            const almostExpired = new Date(Date.now() - 1000 * 60 * 60 * 23 - 1000 * 60 * 59);
            expect(TransactionPresenter.isEditable(almostExpired)).toBe(true);
        });
    });

    describe('gainSign', () => {
        it('should return positive for positive numbers', () => {
            expect(TransactionPresenter.gainSign(5)).toBe('positive');
        });

        it('should return negative for negative numbers', () => {
            expect(TransactionPresenter.gainSign(-3)).toBe('negative');
        });

        it('should return neutral for zero', () => {
            expect(TransactionPresenter.gainSign(0)).toBe('neutral');
        });
    });
});
