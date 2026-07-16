import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { CardService } from 'src/core/card/card.service';
import { PortfolioBreakdownService } from 'src/core/portfolio/portfolio-breakdown.service';
import {
    BreakdownDimension,
    COLOR_CODES,
    COLOR_LABELS,
} from 'src/core/portfolio/portfolio-breakdown.entity';
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
import {
    PortfolioBreakdownViewDto,
    BreakdownCardView,
    BreakdownSliceView,
    ColorChipView,
} from './dto/portfolio-breakdown.view.dto';
import { PortfolioViewDto } from './dto/portfolio.view.dto';
import { formatGain, gainSign, isAuthenticated } from 'src/http/base/http.util';
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
        @Inject(PortfolioBreakdownService)
        private readonly breakdownService: PortfolioBreakdownService,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
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
            const subscribed = await this.subscriptionService.isUserSubscribed(req.user.id);
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
                            card?.number || '',
                            card?.imgSrc || ''
                        );
                    });

                    worstPerformers = worstPerfs.map((p) => {
                        const card = cardMap.get(p.cardId);
                        return PortfolioPresenter.toPerformanceView(
                            p,
                            card?.name || '',
                            card?.setCode || '',
                            card?.number || '',
                            card?.imgSrc || ''
                        );
                    });
                }
            }

            return new PortfolioViewDto({
                authenticated: isAuthenticated(req),
                subscribed,
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
            HttpErrorHandler.toHttpException(error, 'getPortfolioView');
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
            HttpErrorHandler.toHttpException(error, 'getHistory');
        }
    }

    async refresh(req: AuthenticatedRequest): Promise<{ success: boolean; error?: string }> {
        this.LOGGER.debug(`Refresh portfolio summary for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const subscribed = await this.subscriptionService.isUserSubscribed(req.user.id);
            await this.summaryService.refreshSummary(req.user.id, subscribed);
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
            HttpErrorHandler.toHttpException(error, 'getCashFlow');
        }
    }

    async getBreakdownView(
        req: AuthenticatedRequest,
        dimension: BreakdownDimension,
        selectedColors: string[] = [],
        expandKey = ''
    ): Promise<PortfolioBreakdownViewDto> {
        this.LOGGER.debug(`Get ${dimension} breakdown view for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const subscribed = await this.subscriptionService.isUserSubscribed(req.user.id);

            const colorChips =
                dimension === 'color' ? this.buildColorChips(selectedColors) : [];
            const filterLabel =
                dimension === 'color' && selectedColors.length > 0
                    ? selectedColors.map((c) => COLOR_LABELS[c] ?? c).join(', ')
                    : '';

            const baseInit = {
                authenticated: true,
                subscribed,
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Portfolio', url: '/portfolio' },
                    { label: 'Analytics', url: '/portfolio/breakdown' },
                ],
                title: 'Portfolio Analytics - I Want My MTG',
                dimension,
                colorChips,
                selectedColors,
                filterLabel,
            };

            if (!subscribed) {
                return new PortfolioBreakdownViewDto({
                    ...baseInit,
                    locked: true,
                    slices: [],
                    totalValue: 0,
                    totalItems: 0,
                });
            }

            const [breakdown, summary] = await Promise.all([
                this.breakdownService.getBreakdown(req.user.id, dimension, selectedColors),
                this.summaryService.getSummary(req.user.id),
            ]);

            const totalValue = summary?.totalValue ?? 0;
            const totalItems = summary?.totalQuantity ?? 0;

            // No-JS fallback: when `expand` names a real slice, server-render
            // that slice's cards inline so drill-down works without JS. JS
            // intercepts the same links and fetches the API instead.
            const expandTarget = breakdown.slices.some((s) => s.key === expandKey)
                ? expandKey
                : '';
            const expandedCards: BreakdownCardView[] = expandTarget
                ? (
                      await this.breakdownService.listSliceCards(
                          req.user.id,
                          dimension,
                          expandTarget,
                          selectedColors
                      )
                  ).map((card) => {
                      const c = PortfolioPresenter.toBreakdownCard(card);
                      return {
                          cardId: c.cardId,
                          name: c.name,
                          setCode: c.setCode,
                          number: c.number,
                          cardUrl: c.cardUrl,
                          imgSrc: c.imgSrc,
                          quantity: c.quantity,
                          valueFormatted: c.valueFormatted,
                      };
                  })
                : [];

            const slices: BreakdownSliceView[] = breakdown.slices.map((s) => {
                const expanded = s.key === expandTarget;
                return {
                    key: s.key,
                    domKey: encodeURIComponent(s.key),
                    label: s.label,
                    cardCount: s.cardCount,
                    itemCount: s.itemCount,
                    value: s.value,
                    valueFormatted: this.formatCurrency(s.value),
                    percent: totalValue > 0 ? (s.value / totalValue) * 100 : 0,
                    percentFormatted:
                        totalValue > 0 ? `${((s.value / totalValue) * 100).toFixed(1)}%` : '0%',
                    expandHref: this.buildExpandHref(
                        dimension,
                        s.key,
                        selectedColors,
                        expanded
                    ),
                    expanded,
                    cards: expanded ? expandedCards : [],
                };
            });

            return new PortfolioBreakdownViewDto({
                ...baseInit,
                locked: false,
                slices,
                totalValue,
                totalValueFormatted: this.formatCurrency(totalValue),
                totalItems,
            });
        } catch (error) {
            this.LOGGER.debug(`Error getting breakdown view: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'getBreakdownView');
        }
    }

    /**
     * Build the color filter chips for the By Color tab. Each chip links to the
     * breakdown with its color toggled in/out of the selection, so the filter
     * works without JS. Codes stay in canonical WUBRG(C) order.
     */
    private buildColorChips(selectedColors: string[]): ColorChipView[] {
        const selected = new Set(selectedColors);
        return COLOR_CODES.map((code) => {
            const active = selected.has(code);
            // 'C' (colorless) is mutually exclusive with real colors: the
            // backend ignores 'C' whenever any WUBRG is selected, so the chips
            // never combine them. Toggling 'C' clears the real colors, and
            // toggling a real color drops 'C'.
            const next: string[] =
                code === 'C'
                    ? active
                        ? []
                        : ['C']
                    : COLOR_CODES.filter((c) =>
                          c === 'C' ? false : c === code ? !active : selected.has(c)
                      );
            const params = new URLSearchParams({ by: 'color' });
            if (next.length > 0) {
                params.set('colors', next.join(','));
            }
            return {
                code,
                label: COLOR_LABELS[code],
                active,
                href: `/portfolio/breakdown?${params.toString()}`,
            };
        });
    }

    /**
     * Build the drill-down link for one slice. With JS off, following it
     * re-renders the page with this slice expanded (or collapsed if it already
     * is); JS intercepts the click and toggles inline instead. The `#slice-…`
     * anchor keeps the row in view after a full-nav expand.
     */
    private buildExpandHref(
        dimension: BreakdownDimension,
        key: string,
        selectedColors: string[],
        expanded: boolean
    ): string {
        const params = new URLSearchParams({ by: dimension });
        if (dimension === 'color' && selectedColors.length > 0) {
            params.set('colors', selectedColors.join(','));
        }
        if (!expanded) {
            params.set('expand', key);
        }
        return `/portfolio/breakdown?${params.toString()}#slice-${encodeURIComponent(key)}`;
    }

    private static readonly CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    private formatCurrency(value: number): string {
        return PortfolioOrchestrator.CURRENCY_FORMATTER.format(value);
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
            HttpErrorHandler.toHttpException(error, 'getRealizedGains');
        }
    }
}
