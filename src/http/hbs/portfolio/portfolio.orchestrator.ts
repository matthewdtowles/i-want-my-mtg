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
import { formatGain, gainSign } from 'src/http/base/http.util';
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
        const parsed = parseInt(
            this.configService.get<string>('PORTFOLIO_REFRESH_MAX_DAILY', '3'),
            10
        );
        this.maxDailyRefreshes = Number.isFinite(parsed) ? parsed : 3;
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
            const points: PortfolioValueHistoryPointDto[] = history.map(
                PortfolioPresenter.toHistoryPoint
            );
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

            // Read from portfolio_summary snapshot (single query) instead of N+1 FIFO queries
            const summary = await this.summaryService.getSummary(req.user.id);
            const totalRealizedGain = summary?.totalRealizedGain ?? 0;

            return {
                realizedGain: formatGain(totalRealizedGain),
                realizedGainSign: gainSign(totalRealizedGain),
            };
        } catch (error) {
            this.LOGGER.debug(`Error getting realized gains: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getRealizedGains');
        }
    }
}
