import { PortfolioCardPerformance } from 'src/core/portfolio/portfolio-card-performance.entity';
import { PortfolioValueHistory } from 'src/core/portfolio/portfolio-value-history.entity';
import { SetRoiAggregation } from 'src/core/portfolio/ports/portfolio-card-performance.repository.port';
import { PortfolioSummary } from 'src/core/portfolio/portfolio-summary.entity';
import { formatUtcDate, formatUtcTimestamp } from 'src/http/base/date.util';
import { buildCardUrl, formatGain, formatRoi, gainSign, toDollar } from 'src/http/base/http.util';

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

export interface PortfolioHistoryPoint {
    date: string;
    totalValue: number;
    totalCost: number | null;
    totalCards: number;
}

export class PortfolioPresenter {
    static toHistoryPoint(h: PortfolioValueHistory): PortfolioHistoryPoint {
        return {
            date: formatUtcDate(h.date),
            totalValue: h.totalValue,
            totalCost: h.totalCost,
            totalCards: h.totalCards,
        };
    }

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
            totalGain: hasCost ? formatGain(totalGain) : '-',
            totalGainSign: hasCost ? gainSign(totalGain) : 'neutral',
            roi: hasCost ? formatRoi(roi) : '-',
            roiSign: hasCost ? gainSign(roi) : 'neutral',
            realizedGain:
                summary.totalRealizedGain != null ? formatGain(summary.totalRealizedGain) : '-',
            realizedGainSign:
                summary.totalRealizedGain != null ? gainSign(summary.totalRealizedGain) : 'neutral',
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
            cardUrl: cardSetCode && cardNumber ? buildCardUrl(cardSetCode, cardNumber) : '',
            isFoil: perf.isFoil,
            quantity: perf.quantity,
            totalCost: toDollar(perf.totalCost),
            currentValue: toDollar(perf.currentValue),
            totalGain: formatGain(totalGain),
            totalGainSign: gainSign(totalGain),
            roi: perf.roiPercent != null ? formatRoi(perf.roiPercent) : '-',
            roiSign: perf.roiPercent != null ? gainSign(perf.roiPercent) : 'neutral',
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
            gain: formatGain(agg.gain),
            gainSign: gainSign(agg.gain),
            roi: agg.roiPercent != null ? formatRoi(agg.roiPercent) : '-',
            roiSign: agg.roiPercent != null ? gainSign(agg.roiPercent) : 'neutral',
        };
    }

    static formatTimestamp(date: Date): string {
        return formatUtcTimestamp(date);
    }
}
