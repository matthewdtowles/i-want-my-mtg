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
import { CardService } from 'src/core/card/card.service';
import { PortfolioSummaryService } from 'src/core/portfolio/portfolio-summary.service';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { parseDaysParam } from 'src/http/base/query.util';
import { PortfolioPresenter } from 'src/http/hbs/portfolio/portfolio.presenter';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import {
    CardPerformanceApiDto,
    CashFlowPeriodApiDto,
    PortfolioHistoryPointDto,
    PortfolioSummaryApiDto,
} from './dto/portfolio-response.dto';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

@ApiTags('Portfolio')
@ApiBearerAuth()
@Controller('api/v1/portfolio')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
export class PortfolioApiController {
    constructor(
        @Inject(PortfolioService) private readonly portfolioService: PortfolioService,
        @Inject(PortfolioSummaryService) private readonly summaryService: PortfolioSummaryService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(TransactionService) private readonly transactionService: TransactionService
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get portfolio summary' })
    @ApiResponse({ status: 200, description: 'Portfolio summary' })
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
    @ApiOperation({ summary: 'Get portfolio value history' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days of history' })
    @ApiResponse({ status: 200, description: 'Value history data' })
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
    @ApiQuery({ name: 'type', required: false, description: 'best or worst' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of results' })
    @ApiResponse({ status: 200, description: 'Card performance data' })
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
            await this.summaryService.refreshSummary(req.user.id);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException(error?.message || 'Failed to refresh portfolio');
        }
        return ApiResponseDto.ok({ refreshed: true });
    }

    @Get('cash-flow')
    @ApiOperation({ summary: 'Get cash flow periods' })
    @ApiResponse({ status: 200, description: 'Cash flow data' })
    async getCashFlow(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<CashFlowPeriodApiDto[]>> {
        const cashFlow = await this.transactionService.getCashFlow(req.user.id);
        return ApiResponseDto.ok(cashFlow);
    }

    @Get('realized-gains')
    @ApiOperation({ summary: 'Get realized gains' })
    @ApiResponse({ status: 200, description: 'Realized gains data' })
    async getRealizedGains(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ totalRealizedGain: number }>> {
        const summary = await this.summaryService.getSummary(req.user.id);
        const totalRealizedGain = summary?.totalRealizedGain ?? 0;
        return ApiResponseDto.ok({ totalRealizedGain });
    }
}
