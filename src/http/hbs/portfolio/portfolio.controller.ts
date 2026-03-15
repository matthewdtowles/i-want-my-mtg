import { Controller, Get, Inject, Post, Query, Render, Req, UseGuards } from '@nestjs/common';
import { CashFlowPeriod } from 'src/core/transaction/ports/transaction.repository.port';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { parseDaysParam } from 'src/http/base/query.util';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioValueHistoryResponseDto } from './dto/portfolio-value-history-response.dto';
import { PortfolioViewDto } from './dto/portfolio.view.dto';
import { PortfolioOrchestrator } from './portfolio.orchestrator';

@Controller('portfolio')
export class PortfolioController {
    private readonly LOGGER = getLogger(PortfolioController.name);

    constructor(
        @Inject(PortfolioOrchestrator)
        private readonly orchestrator: PortfolioOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('portfolio')
    async getPortfolio(@Req() req: AuthenticatedRequest): Promise<PortfolioViewDto> {
        this.LOGGER.log(`Get portfolio for user ${req.user?.id}.`);
        return this.orchestrator.getPortfolioView(req);
    }

    @UseGuards(JwtAuthGuard)
    @Get('history')
    async getHistory(
        @Req() req: AuthenticatedRequest,
        @Query('days') days?: string
    ): Promise<PortfolioValueHistoryResponseDto> {
        this.LOGGER.log(`Get portfolio history for user ${req.user?.id}.`);
        return this.orchestrator.getHistory(req, parseDaysParam(days));
    }

    @UseGuards(JwtAuthGuard)
    @Post('refresh')
    async refresh(@Req() req: AuthenticatedRequest): Promise<{ success: boolean; error?: string }> {
        this.LOGGER.log(`Refresh portfolio summary for user ${req.user?.id}.`);
        return this.orchestrator.refresh(req);
    }

    @UseGuards(JwtAuthGuard)
    @Get('cash-flow')
    async getCashFlow(@Req() req: AuthenticatedRequest): Promise<{ cashFlow: CashFlowPeriod[] }> {
        this.LOGGER.log(`Get cash flow for user ${req.user?.id}.`);
        return this.orchestrator.getCashFlow(req);
    }

    @UseGuards(JwtAuthGuard)
    @Get('realized-gains')
    async getRealizedGains(
        @Req() req: AuthenticatedRequest
    ): Promise<{ realizedGain: string; realizedGainSign: string }> {
        this.LOGGER.log(`Get realized gains for user ${req.user?.id}.`);
        return this.orchestrator.getRealizedGains(req);
    }
}
