import { PortfolioCardPerformance } from 'src/core/portfolio/portfolio-card-performance.entity';
import { SetRoiAggregation } from 'src/core/portfolio/portfolio-card-performance.repository.port';
import { PortfolioSummary } from 'src/core/portfolio/portfolio-summary.entity';
import { toDollar } from 'src/http/base/http.util';
import { TransactionPresenter } from 'src/http/transaction/transaction.presenter';

export interface PortfolioSummaryViewData {
    totalValue: string;
    totalCost: string;
    totalGain: string;
    totalGainSign: string;
    roi: string;
    roiSign: string;
    realizedGain: string;
    realizedGainSign: string;
    totalCards: number;
    totalQuantity: number;
    computedAt: string;
    canRefresh: boolean;
    refreshesRemaining: number;
    isFifo: boolean;
}

export interface CardPerformanceViewData {
    cardId: string;
    cardName: string;
    cardSetCode: string;
    cardUrl: string;
    isFoil: boolean;
    quantity: number;
    totalCost: string;
    currentValue: string;
    totalGain: string;
    totalGainSign: string;
    roi: string;
    roiSign: string;
}

export interface SetRoiViewData {
    setCode: string;
    setName: string;
    setUrl: string;
    cardsHeld: number;
    totalCost: string;
    currentValue: string;
    gain: string;
    gainSign: string;
    roi: string;
    roiSign: string;
}

export class PortfolioPresenter {
    static toSummaryView(
        summary: PortfolioSummary,
        maxDailyRefreshes: number
    ): PortfolioSummaryViewData {
        const hasCost = summary.totalCost != null;
        const totalGain = hasCost ? summary.totalValue - summary.totalCost : 0;
        const roi = hasCost && summary.totalCost > 0 ? (totalGain / summary.totalCost) * 100 : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isNewDay = summary.lastRefreshDate.getTime() < today.getTime();
        const refreshesUsed = isNewDay ? 0 : summary.refreshesToday;
        const refreshesRemaining = Math.max(0, maxDailyRefreshes - refreshesUsed);

        return {
            totalValue: toDollar(summary.totalValue),
            totalCost: hasCost ? toDollar(summary.totalCost) : '-',
            totalGain: hasCost ? TransactionPresenter.formatGain(totalGain) : '-',
            totalGainSign: hasCost ? TransactionPresenter.gainSign(totalGain) : 'neutral',
            roi: hasCost ? TransactionPresenter.formatRoi(roi) : '-',
            roiSign: hasCost ? TransactionPresenter.gainSign(roi) : 'neutral',
            realizedGain:
                summary.totalRealizedGain != null
                    ? TransactionPresenter.formatGain(summary.totalRealizedGain)
                    : '-',
            realizedGainSign:
                summary.totalRealizedGain != null
                    ? TransactionPresenter.gainSign(summary.totalRealizedGain)
                    : 'neutral',
            totalCards: summary.totalCards,
            totalQuantity: summary.totalQuantity,
            computedAt: PortfolioPresenter.formatTimestamp(summary.computedAt),
            canRefresh: refreshesRemaining > 0,
            refreshesRemaining,
            isFifo: summary.computationMethod === 'fifo',
        };
    }

    static toPerformanceView(
        perf: PortfolioCardPerformance,
        cardName: string,
        cardSetCode: string,
        cardNumber: string
    ): CardPerformanceViewData {
        const totalGain = perf.unrealizedGain + perf.realizedGain;
        return {
            cardId: perf.cardId,
            cardName,
            cardSetCode: cardSetCode.toUpperCase(),
            cardUrl:
                cardSetCode && cardNumber ? `/card/${cardSetCode.toLowerCase()}/${cardNumber}` : '',
            isFoil: perf.isFoil,
            quantity: perf.quantity,
            totalCost: toDollar(perf.totalCost),
            currentValue: toDollar(perf.currentValue),
            totalGain: TransactionPresenter.formatGain(totalGain),
            totalGainSign: TransactionPresenter.gainSign(totalGain),
            roi: perf.roiPercent != null ? TransactionPresenter.formatRoi(perf.roiPercent) : '-',
            roiSign:
                perf.roiPercent != null
                    ? TransactionPresenter.gainSign(perf.roiPercent)
                    : 'neutral',
        };
    }

    static toSetRoiView(agg: SetRoiAggregation): SetRoiViewData {
        return {
            setCode: agg.setCode.toUpperCase(),
            setName: agg.setName,
            setUrl: `/set/${agg.setCode.toLowerCase()}`,
            cardsHeld: agg.cardsHeld,
            totalCost: toDollar(agg.totalCost),
            currentValue: toDollar(agg.currentValue),
            gain: TransactionPresenter.formatGain(agg.gain),
            gainSign: TransactionPresenter.gainSign(agg.gain),
            roi: agg.roiPercent != null ? TransactionPresenter.formatRoi(agg.roiPercent) : '-',
            roiSign:
                agg.roiPercent != null ? TransactionPresenter.gainSign(agg.roiPercent) : 'neutral',
        };
    }

    static formatTimestamp(date: Date): string {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        return `${d.getUTCFullYear()}-${month}-${day} ${hours}:${minutes}`;
    }
}
