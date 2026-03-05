import { Controller, Get, Inject, Query, Render, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
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
        const parsedDays = days ? parseInt(days, 10) : undefined;
        return this.orchestrator.getHistory(
            req,
            Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : undefined
        );
    }
}
