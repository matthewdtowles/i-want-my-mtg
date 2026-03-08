import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardService } from 'src/core/card/card.service';
import { PortfolioSummaryService } from 'src/core/portfolio/portfolio-summary.service';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import {
    PortfolioValueHistoryPointDto,
    PortfolioValueHistoryResponseDto,
} from './dto/portfolio-value-history-response.dto';
import { PortfolioViewDto } from './dto/portfolio.view.dto';
import { TransactionPresenter } from 'src/http/transaction/transaction.presenter';
import {
    CardPerformanceViewData,
    PortfolioPresenter,
    PortfolioSummaryViewData,
    SetRoiViewData,
} from './portfolio.presenter';

@Injectable()
export class PortfolioOrchestrator {
    private readonly LOGGER = getLogger(PortfolioOrchestrator.name);
    private readonly maxDailyRefreshes: number;

    constructor(
        @Inject(PortfolioService) private readonly portfolioService: PortfolioService,
        @Inject(PortfolioSummaryService)
        private readonly summaryService: PortfolioSummaryService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        private readonly configService: ConfigService
    ) {
        this.maxDailyRefreshes = parseInt(
            this.configService.get<string>('PORTFOLIO_REFRESH_MAX_DAILY', '3'),
            10
        );
        this.LOGGER.debug(`Initialized`);
    }

    async getPortfolioView(req: AuthenticatedRequest): Promise<PortfolioViewDto> {
        this.LOGGER.debug(`Get portfolio view for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const history = await this.portfolioService.getHistory(req.user.id);

            let summaryViewData: PortfolioSummaryViewData | undefined;
            let topPerformers: CardPerformanceViewData[] | undefined;
            let worstPerformers: CardPerformanceViewData[] | undefined;
            let setRoi: SetRoiViewData[] | undefined;
            let hasSummary = false;

            const summary = await this.summaryService.getSummary(req.user.id);
            if (summary) {
                hasSummary = true;
                summaryViewData = PortfolioPresenter.toSummaryView(summary, this.maxDailyRefreshes);

                const [topPerfs, worstPerfs] = await Promise.all([
                    this.summaryService.getCardPerformance(req.user.id, 'best', 10),
                    this.summaryService.getCardPerformance(req.user.id, 'worst', 10),
                ]);

                const setAggregations = await this.summaryService.getSetRoi(req.user.id);
                if (setAggregations.length > 0) {
                    setRoi = setAggregations.map(PortfolioPresenter.toSetRoiView);
                }

                if (topPerfs.length > 0 || worstPerfs.length > 0) {
                    const allCardIds = [
                        ...new Set([
                            ...topPerfs.map((p) => p.cardId),
                            ...worstPerfs.map((p) => p.cardId),
                        ]),
                    ];
                    const cards = await this.cardService.findByIds(allCardIds);
                    const cardMap = new Map(cards.map((c) => [c.id, c]));

                    topPerformers = topPerfs.map((p) => {
                        const card = cardMap.get(p.cardId);
                        return PortfolioPresenter.toPerformanceView(
                            p,
                            card?.name || '',
                            card?.setCode || '',
                            card?.number || ''
                        );
                    });

                    worstPerformers = worstPerfs.map((p) => {
                        const card = cardMap.get(p.cardId);
                        return PortfolioPresenter.toPerformanceView(
                            p,
                            card?.name || '',
                            card?.setCode || '',
                            card?.number || ''
                        );
                    });
                }
            }

            return new PortfolioViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Inventory', url: '/inventory' },
                    { label: 'Portfolio', url: '/portfolio' },
                ],
                username: req.user.name,
                hasHistory: history.length > 0,
                hasSummary,
                summary: summaryViewData,
                topPerformers,
                worstPerformers,
                setRoi,
            });
        } catch (error) {
            this.LOGGER.debug(`Error getting portfolio view: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getPortfolioView');
        }
    }

    async getHistory(
        req: AuthenticatedRequest,
        days?: number
    ): Promise<PortfolioValueHistoryResponseDto> {
        this.LOGGER.debug(`Get portfolio history for user ${req.user?.id}, days: ${days}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const history = await this.portfolioService.getHistory(req.user.id, days);
            const points: PortfolioValueHistoryPointDto[] = history.map((h) => ({
                date: h.date instanceof Date ? h.date.toISOString().split('T')[0] : String(h.date),
                totalValue: h.totalValue,
                totalCost: h.totalCost,
                totalCards: h.totalCards,
            }));
            return { history: points };
        } catch (error) {
            this.LOGGER.debug(`Error getting portfolio history: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getHistory');
        }
    }

    async refresh(req: AuthenticatedRequest): Promise<{ success: boolean; error?: string }> {
        this.LOGGER.debug(`Refresh portfolio summary for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            await this.summaryService.refreshSummary(req.user.id);
            return { success: true };
        } catch (error) {
            this.LOGGER.debug(`Error refreshing portfolio summary: ${error?.message}`);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    }

    async getCashFlow(req: AuthenticatedRequest): Promise<{
        cashFlow: { period: string; totalBought: number; totalSold: number; net: number }[];
    }> {
        this.LOGGER.debug(`Get cash flow for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const cashFlow = await this.transactionService.getCashFlow(req.user.id);
            return { cashFlow };
        } catch (error) {
            this.LOGGER.debug(`Error getting cash flow: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getCashFlow');
        }
    }

    async getRealizedGains(
        req: AuthenticatedRequest
    ): Promise<{ realizedGain: string; realizedGainSign: string }> {
        this.LOGGER.debug(`Get realized gains for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const transactions = await this.transactionService.findByUser(req.user.id);
            const sells = transactions.filter((tx) => tx.type === 'SELL');

            let totalRealizedGain = 0;
            const cardFoilKeys = new Set(sells.map((s) => `${s.cardId}:${s.isFoil}`));

            for (const key of cardFoilKeys) {
                const [cardId, foilStr] = key.split(':');
                const isFoil = foilStr === 'true';

                const fifo = await this.transactionService.getFifoLotAllocations(
                    req.user.id,
                    cardId,
                    isFoil
                );
                totalRealizedGain += fifo.totalRealizedGain;
            }

            return {
                realizedGain: TransactionPresenter.formatGain(totalRealizedGain),
                realizedGainSign: TransactionPresenter.gainSign(totalRealizedGain),
            };
        } catch (error) {
            this.LOGGER.debug(`Error getting realized gains: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getRealizedGains');
        }
    }
}
