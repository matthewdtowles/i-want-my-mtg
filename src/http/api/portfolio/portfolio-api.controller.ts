import {
    Controller,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Inject,
    InternalServerErrorException,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequiresSubscription } from 'src/core/billing/requires-subscription.decorator';
import { SubscriptionGuard } from 'src/core/billing/subscription.guard';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { CardService } from 'src/core/card/card.service';
import {
    BreakdownDimension,
    PortfolioBreakdown,
} from 'src/core/portfolio/portfolio-breakdown.entity';
import { PortfolioBreakdownService } from 'src/core/portfolio/portfolio-breakdown.service';
import { PortfolioSummaryService } from 'src/core/portfolio/portfolio-summary.service';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { JwtOrApiKeyGuard } from 'src/http/api/shared/jwt-or-api-key.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { parseDaysParam } from 'src/http/base/query.util';
import { PortfolioPresenter } from 'src/http/hbs/portfolio/portfolio.presenter';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import {
    BreakdownCardApiDto,
    CardPerformanceApiDto,
    CashFlowPeriodApiDto,
    PortfolioHistoryPointDto,
    PortfolioSummaryApiDto,
} from './dto/portfolio-response.dto';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';

@ApiTags('Portfolio')
@ApiBearerAuth()
@Controller('api/v1/portfolio')
@UseGuards(JwtOrApiKeyGuard, ApiRateLimitGuard)
export class PortfolioApiController {
    constructor(
        @Inject(PortfolioService) private readonly portfolioService: PortfolioService,
        @Inject(PortfolioSummaryService) private readonly summaryService: PortfolioSummaryService,
        @Inject(PortfolioBreakdownService)
        private readonly breakdownService: PortfolioBreakdownService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get portfolio summary' })
    @ApiOkEnvelope(PortfolioSummaryApiDto, {
        description: 'Portfolio summary',
        nullableData: true,
    })
    async getSummary(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<PortfolioSummaryApiDto | null>> {
        const summary = await this.summaryService.getSummary(req.user.id);
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

    @Get('history')
    @UseGuards(SubscriptionGuard)
    @RequiresSubscription()
    @ApiOperation({ summary: 'Get portfolio value history (Premium)' })
    @ApiResponse({ status: 403, description: 'Premium subscription required' })
    @ApiQuery({
        name: 'days',
        required: false,
        type: Number,
        description: 'Number of days of history',
    })
    @ApiOkEnvelope(PortfolioHistoryPointDto, { isArray: true, description: 'Value history data' })
    async getHistory(
        @Req() req: AuthenticatedRequest,
        @Query('days') days?: string
    ): Promise<ApiResponseDto<PortfolioHistoryPointDto[]>> {
        const validDays = parseDaysParam(days);
        const history = await this.portfolioService.getHistory(req.user.id, validDays);

        const points: PortfolioHistoryPointDto[] = history.map(PortfolioPresenter.toHistoryPoint);

        return ApiResponseDto.ok(points);
    }

    @Get('performance')
    @ApiOperation({ summary: 'Get card performance data' })
    @ApiQuery({ name: 'type', required: false, type: String, description: 'best or worst' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results' })
    @ApiOkEnvelope(CardPerformanceApiDto, { isArray: true, description: 'Card performance data' })
    async getPerformance(
        @Req() req: AuthenticatedRequest,
        @Query('type') type?: string,
        @Query('limit') limit?: string
    ): Promise<ApiResponseDto<CardPerformanceApiDto[]>> {
        const sortBy = type === 'worst' ? 'worst' : 'best';
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        const validLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

        const performances = await this.summaryService.getCardPerformance(
            req.user.id,
            sortBy,
            validLimit
        );

        const cardIds = performances.map((p) => p.cardId);
        const cards = cardIds.length > 0 ? await this.cardService.findByIds(cardIds) : [];
        const cardMap = new Map(cards.map((c) => [c.id, c]));

        const items: CardPerformanceApiDto[] = performances.map((p) => {
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

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh portfolio summary' })
    @ApiResponse({ status: 200, description: 'Summary refreshed' })
    async refresh(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ refreshed: boolean }>> {
        try {
            const subscribed = await this.subscriptionService.isUserSubscribed(req.user.id);
            await this.summaryService.refreshSummary(req.user.id, subscribed);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException(error?.message || 'Failed to refresh portfolio');
        }
        return ApiResponseDto.ok({ refreshed: true });
    }

    @Get('cash-flow')
    @UseGuards(SubscriptionGuard)
    @RequiresSubscription()
    @ApiOperation({ summary: 'Get cash flow periods (Premium)' })
    @ApiOkEnvelope(CashFlowPeriodApiDto, { isArray: true, description: 'Cash flow data' })
    @ApiResponse({ status: 403, description: 'Premium subscription required' })
    async getCashFlow(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<CashFlowPeriodApiDto[]>> {
        const cashFlow = await this.transactionService.getCashFlow(req.user.id);
        return ApiResponseDto.ok(cashFlow);
    }

    @Get('realized-gains')
    @UseGuards(SubscriptionGuard)
    @RequiresSubscription()
    @ApiOperation({ summary: 'Get realized gains (Premium)' })
    @ApiResponse({ status: 200, description: 'Realized gains data' })
    async getRealizedGains(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ totalRealizedGain: number }>> {
        const summary = await this.summaryService.getSummary(req.user.id);
        const totalRealizedGain = summary?.totalRealizedGain ?? 0;
        return ApiResponseDto.ok({ totalRealizedGain });
    }

    @Get('breakdown')
    @UseGuards(SubscriptionGuard)
    @RequiresSubscription()
    @ApiOperation({ summary: 'Get portfolio value breakdown by dimension (Premium)' })
    @ApiQuery({
        name: 'by',
        required: false,
        type: String,
        description: 'Dimension to group by (set, rarity, type, color, cost-basis)',
    })
    @ApiQuery({
        name: 'colors',
        required: false,
        type: String,
        description:
            "For by=color: comma-separated codes (W,U,B,R,G,C) to keep only cards whose color identity contains all of them; 'C' is colorless. Ignored for other dimensions.",
    })
    @ApiResponse({ status: 200, description: 'Breakdown slices and totals' })
    @ApiResponse({ status: 403, description: 'Premium subscription required' })
    async getBreakdown(
        @Req() req: AuthenticatedRequest,
        @Query('by') by?: string,
        @Query('colors') colors?: string
    ): Promise<ApiResponseDto<PortfolioBreakdown>> {
        const dimension: BreakdownDimension = PortfolioBreakdownService.isDimension(by)
            ? by
            : 'set';
        const selectedColors = PortfolioBreakdownService.parseColors(colors);
        const breakdown = await this.breakdownService.getBreakdown(
            req.user.id,
            dimension,
            selectedColors
        );
        return ApiResponseDto.ok(breakdown);
    }

    @Get('breakdown/cards')
    @UseGuards(SubscriptionGuard)
    @RequiresSubscription()
    @ApiOperation({ summary: 'Get the cards inside one breakdown slice (Premium)' })
    @ApiQuery({
        name: 'by',
        required: false,
        type: String,
        description: 'Dimension the slice belongs to (set, rarity, type, color, cost-basis)',
    })
    @ApiQuery({
        name: 'key',
        required: false,
        type: String,
        description:
            'Slice key from the breakdown (set code, rarity, type, cost-basis bucket, or color code). A missing/empty key returns an empty list.',
    })
    @ApiQuery({
        name: 'colors',
        required: false,
        type: String,
        description:
            'For by=color: the active superset filter (W,U,B,R,G,C) so drill-down matches the aggregate row. Ignored for other dimensions.',
    })
    @ApiOkEnvelope(BreakdownCardApiDto, { isArray: true, description: 'Cards in the slice' })
    @ApiResponse({ status: 403, description: 'Premium subscription required' })
    async getBreakdownCards(
        @Req() req: AuthenticatedRequest,
        @Query('key') key?: string,
        @Query('by') by?: string,
        @Query('colors') colors?: string
    ): Promise<ApiResponseDto<BreakdownCardApiDto[]>> {
        const dimension: BreakdownDimension = PortfolioBreakdownService.isDimension(by)
            ? by
            : 'set';
        const selectedColors = PortfolioBreakdownService.parseColors(colors);
        const cards = await this.breakdownService.listSliceCards(
            req.user.id,
            dimension,
            key ?? '',
            selectedColors
        );
        return ApiResponseDto.ok(cards.map(PortfolioPresenter.toBreakdownCard));
    }
}
