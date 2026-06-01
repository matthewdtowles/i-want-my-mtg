import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { CardService } from 'src/core/card/card.service';
import { PortfolioBreakdownService } from 'src/core/portfolio/portfolio-breakdown.service';
import { PortfolioSummaryService } from 'src/core/portfolio/portfolio-summary.service';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { parseDaysParam } from 'src/http/base/query.util';
import { PortfolioPresenter } from 'src/http/hbs/portfolio/portfolio.presenter';
import { McpToolContext, McpToolDefinition } from '../mcp-tool.types';

/**
 * Authenticated portfolio tools, mirroring `PortfolioApiController`. `premium`
 * matches the controller's `@RequiresSubscription()` placement exactly: history,
 * cash-flow, realized-gains, and breakdown are gated; summary, performance, and
 * refresh are not.
 */
@Injectable()
export class PortfolioMcpTools {
    constructor(
        @Inject(PortfolioService) private readonly portfolioService: PortfolioService,
        @Inject(PortfolioSummaryService) private readonly summaryService: PortfolioSummaryService,
        @Inject(PortfolioBreakdownService)
        private readonly breakdownService: PortfolioBreakdownService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {}

    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'get_portfolio_summary',
                description:
                    "Get the authenticated user's portfolio summary - current value, total invested, unrealized P&L, ROI, card/unit counts. Free tier sees current value + total invested only; Premium gets the full P&L set. Requires IWMM_API_KEY.",
                inputSchema: z.object({}),
                requiresAuth: true,
                handler: async (_args, ctx) => this.summary(ctx),
            },
            {
                name: 'get_portfolio_history',
                description:
                    'Get portfolio value history. Premium-gated - free tier receives 403. Requires IWMM_API_KEY.',
                inputSchema: z.object({
                    days: z
                        .number()
                        .int()
                        .min(1)
                        .max(3650)
                        .optional()
                        .describe('How many days of history. Server default applies if omitted.'),
                }),
                requiresAuth: true,
                premium: true,
                handler: async (args, ctx) => this.history(args, ctx),
            },
            {
                name: 'get_card_performance',
                description:
                    "Get the user's best- or worst-performing cards by P&L. Default: best, top 10. Premium-gated. Requires IWMM_API_KEY.",
                inputSchema: z.object({
                    type: z.enum(['best', 'worst']).optional(),
                    limit: z.number().int().min(1).max(100).optional(),
                }),
                requiresAuth: true,
                handler: async (args, ctx) => this.performance(args, ctx),
            },
            {
                name: 'get_cash_flow',
                description:
                    "Get the user's cash flow (money in vs money out from BUY/SELL transactions). Premium-gated. Requires IWMM_API_KEY.",
                inputSchema: z.object({}),
                requiresAuth: true,
                premium: true,
                handler: async (_args, ctx) => this.cashFlow(ctx),
            },
            {
                name: 'get_realized_gains',
                description:
                    "Get the user's realized gains from SELL transactions using FIFO cost basis. Premium-gated. Requires IWMM_API_KEY.",
                inputSchema: z.object({}),
                requiresAuth: true,
                premium: true,
                handler: async (_args, ctx) => this.realizedGains(ctx),
            },
            {
                name: 'get_portfolio_breakdown',
                description:
                    "Get the user's collection value broken down by a dimension. Premium-gated. Requires IWMM_API_KEY.",
                inputSchema: z.object({
                    by: z
                        .enum(['set', 'rarity', 'type', 'format', 'cost-basis'])
                        .describe(
                            "Dimension to break down by. 'cost-basis' buckets are gain/loss/at-cost."
                        ),
                }),
                requiresAuth: true,
                premium: true,
                handler: async (args, ctx) => this.breakdown(args, ctx),
            },
            {
                name: 'refresh_portfolio',
                description:
                    "Recalculate the user's portfolio P&L. Use after recording a batch of transactions if you want immediate fresh numbers. Requires IWMM_API_KEY.",
                inputSchema: z.object({}),
                requiresAuth: true,
                handler: async (_args, ctx) => this.refresh(ctx),
            },
        ];
    }

    private async summary(ctx: McpToolContext): Promise<unknown> {
        const summary = await this.summaryService.getSummary(ctx.user.id);
        if (!summary) {
            return ApiResponseDto.ok(null);
        }
        return ApiResponseDto.ok({
            totalValue: summary.totalValue,
            totalCost: summary.totalCost,
            totalRealizedGain: summary.totalRealizedGain,
            totalCards: summary.totalCards,
            totalQuantity: summary.totalQuantity,
            computedAt: summary.computedAt.toISOString(),
        });
    }

    private async history(args: { days?: number }, ctx: McpToolContext): Promise<unknown> {
        const validDays = parseDaysParam(args.days !== undefined ? String(args.days) : undefined);
        const history = await this.portfolioService.getHistory(ctx.user.id, validDays);
        return ApiResponseDto.ok(history.map(PortfolioPresenter.toHistoryPoint));
    }

    private async performance(
        args: { type?: 'best' | 'worst'; limit?: number },
        ctx: McpToolContext
    ): Promise<unknown> {
        const sortBy = args.type === 'worst' ? 'worst' : 'best';
        const validLimit = Number.isFinite(args.limit) && args.limit > 0 ? args.limit : 10;
        const performances = await this.summaryService.getCardPerformance(
            ctx.user.id,
            sortBy,
            validLimit
        );

        const cardIds = performances.map((p) => p.cardId);
        const cards = cardIds.length > 0 ? await this.cardService.findByIds(cardIds) : [];
        const cardMap = new Map(cards.map((c) => [c.id, c]));

        const items = performances.map((p) => {
            const card = cardMap.get(p.cardId);
            return {
                cardId: p.cardId,
                cardName: card?.name,
                setCode: card?.setCode,
                quantity: p.quantity,
                costBasis: p.totalCost,
                currentValue: p.currentValue,
                gain: p.unrealizedGain,
                roi: p.roiPercent ?? 0,
            };
        });
        return ApiResponseDto.ok(items);
    }

    private async cashFlow(ctx: McpToolContext): Promise<unknown> {
        const cashFlow = await this.transactionService.getCashFlow(ctx.user.id);
        return ApiResponseDto.ok(cashFlow);
    }

    private async realizedGains(ctx: McpToolContext): Promise<unknown> {
        const summary = await this.summaryService.getSummary(ctx.user.id);
        const totalRealizedGain = summary?.totalRealizedGain ?? 0;
        return ApiResponseDto.ok({ totalRealizedGain });
    }

    private async breakdown(args: { by: string }, ctx: McpToolContext): Promise<unknown> {
        const dimension = PortfolioBreakdownService.isDimension(args.by) ? args.by : 'set';
        const breakdown = await this.breakdownService.getBreakdown(ctx.user.id, dimension);
        return ApiResponseDto.ok(breakdown);
    }

    private async refresh(ctx: McpToolContext): Promise<unknown> {
        const subscribed = await this.subscriptionService.isUserSubscribed(ctx.user.id);
        await this.summaryService.refreshSummary(ctx.user.id, subscribed);
        return ApiResponseDto.ok({ refreshed: true });
    }
}
