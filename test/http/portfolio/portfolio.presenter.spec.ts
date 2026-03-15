import { PortfolioCardPerformance } from 'src/core/portfolio/portfolio-card-performance.entity';
import { PortfolioSummary } from 'src/core/portfolio/portfolio-summary.entity';
import { PortfolioPresenter } from 'src/http/hbs/portfolio/portfolio.presenter';

describe('PortfolioPresenter', () => {
    describe('toSummaryView', () => {
        it('should format summary with cost basis data', () => {
            const summary = new PortfolioSummary({
                userId: 1,
                totalValue: 150.0,
                totalCost: 100.0,
                totalRealizedGain: 25.0,
                totalCards: 10,
                totalQuantity: 30,
                computedAt: new Date('2026-03-07T14:30:00'),
                refreshesToday: 1,
                lastRefreshDate: new Date(),
            });

            const result = PortfolioPresenter.toSummaryView(summary, 3);

            expect(result.totalValue).toBe('$150.00');
            expect(result.totalCost).toBe('$100.00');
            expect(result.totalGain).toBe('+$50.00');
            expect(result.totalGainSign).toBe('positive');
            expect(result.roi).toBe('+50.0%');
            expect(result.roiSign).toBe('positive');
            expect(result.realizedGain).toBe('+$25.00');
            expect(result.realizedGainSign).toBe('positive');
            expect(result.totalCards).toBe(10);
            expect(result.totalQuantity).toBe(30);
            expect(result.refreshesRemaining).toBe(2);
            expect(result.canRefresh).toBe(true);
        });

        it('should show dash for cost/gain when no cost data', () => {
            const summary = new PortfolioSummary({
                userId: 1,
                totalValue: 50.0,
                totalCost: null,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: new Date(),
                refreshesToday: 0,
                lastRefreshDate: new Date(),
            });

            const result = PortfolioPresenter.toSummaryView(summary, 3);

            expect(result.totalCost).toBe('-');
            expect(result.totalGain).toBe('-');
            expect(result.roi).toBe('-');
        });

        it('should indicate no refreshes remaining when maxed out', () => {
            const summary = new PortfolioSummary({
                userId: 1,
                totalValue: 50.0,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: new Date(),
                refreshesToday: 3,
                lastRefreshDate: new Date(),
            });

            const result = PortfolioPresenter.toSummaryView(summary, 3);

            expect(result.refreshesRemaining).toBe(0);
            expect(result.canRefresh).toBe(false);
        });

        it('should reset refreshes on new day', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const summary = new PortfolioSummary({
                userId: 1,
                totalValue: 50.0,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: yesterday,
                refreshesToday: 3,
                lastRefreshDate: yesterday,
            });

            const result = PortfolioPresenter.toSummaryView(summary, 3);

            expect(result.refreshesRemaining).toBe(3);
            expect(result.canRefresh).toBe(true);
        });

        it('should handle negative gain', () => {
            const summary = new PortfolioSummary({
                userId: 1,
                totalValue: 80.0,
                totalCost: 100.0,
                totalRealizedGain: -5.0,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: new Date(),
            });

            const result = PortfolioPresenter.toSummaryView(summary, 3);

            expect(result.totalGain).toBe('-$20.00');
            expect(result.totalGainSign).toBe('negative');
            expect(result.realizedGain).toBe('-$5.00');
            expect(result.realizedGainSign).toBe('negative');
        });
    });

    describe('toPerformanceView', () => {
        it('should format card performance data', () => {
            const perf = new PortfolioCardPerformance({
                userId: 1,
                cardId: 'card1',
                isFoil: false,
                quantity: 3,
                totalCost: 15.0,
                averageCost: 5.0,
                currentValue: 21.0,
                unrealizedGain: 6.0,
                realizedGain: 2.0,
                roiPercent: 53.33,
                computedAt: new Date(),
            });

            const result = PortfolioPresenter.toPerformanceView(
                perf,
                'Lightning Bolt',
                'lea',
                '161'
            );

            expect(result.cardName).toBe('Lightning Bolt');
            expect(result.cardSetCode).toBe('LEA');
            expect(result.cardUrl).toBe('/card/lea/161');
            expect(result.quantity).toBe(3);
            expect(result.totalCost).toBe('$15.00');
            expect(result.currentValue).toBe('$21.00');
            expect(result.totalGain).toBe('+$8.00'); // 6 + 2
            expect(result.totalGainSign).toBe('positive');
            expect(result.roi).toBe('+53.3%');
        });

        it('should handle foil cards', () => {
            const perf = new PortfolioCardPerformance({
                userId: 1,
                cardId: 'card1',
                isFoil: true,
                quantity: 1,
                totalCost: 10.0,
                averageCost: 10.0,
                currentValue: 8.0,
                unrealizedGain: -2.0,
                realizedGain: 0,
                roiPercent: -20.0,
                computedAt: new Date(),
            });

            const result = PortfolioPresenter.toPerformanceView(perf, 'Sol Ring', 'cmr', '472');

            expect(result.isFoil).toBe(true);
            expect(result.totalGain).toBe('-$2.00');
            expect(result.totalGainSign).toBe('negative');
        });

        it('should handle null ROI', () => {
            const perf = new PortfolioCardPerformance({
                userId: 1,
                cardId: 'card1',
                isFoil: false,
                quantity: 1,
                totalCost: 0,
                averageCost: 0,
                currentValue: 5.0,
                unrealizedGain: 5.0,
                realizedGain: 0,
                roiPercent: null,
                computedAt: new Date(),
            });

            const result = PortfolioPresenter.toPerformanceView(perf, 'Card', 'set', '1');

            expect(result.roi).toBe('-');
            expect(result.roiSign).toBe('neutral');
        });
    });

    describe('formatTimestamp', () => {
        it('should format timestamp as YYYY-MM-DD HH:MM in UTC', () => {
            const date = new Date('2026-03-07T14:30:00Z');
            const result = PortfolioPresenter.formatTimestamp(date);
            expect(result).toBe('2026-03-07 14:30');
        });
    });
});
