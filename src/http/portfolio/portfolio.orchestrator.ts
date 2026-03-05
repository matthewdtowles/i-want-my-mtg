import { Inject, Injectable } from '@nestjs/common';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import {
    PortfolioValueHistoryPointDto,
    PortfolioValueHistoryResponseDto,
} from './dto/portfolio-value-history-response.dto';
import { PortfolioViewDto } from './dto/portfolio.view.dto';

@Injectable()
export class PortfolioOrchestrator {
    private readonly LOGGER = getLogger(PortfolioOrchestrator.name);

    constructor(@Inject(PortfolioService) private readonly portfolioService: PortfolioService) {
        this.LOGGER.debug(`Initialized`);
    }

    async getPortfolioView(req: AuthenticatedRequest): Promise<PortfolioViewDto> {
        this.LOGGER.debug(`Get portfolio view for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const history = await this.portfolioService.getHistory(req.user.id);
            return new PortfolioViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Inventory', url: '/inventory' },
                    { label: 'Portfolio', url: '/portfolio' },
                ],
                username: req.user.name,
                hasHistory: history.length > 0,
            });
        } catch (error) {
            this.LOGGER.debug(`Error getting portfolio view: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getPortfolioView');
        }
    }

    async getHistory(userId: number, days?: number): Promise<PortfolioValueHistoryResponseDto> {
        this.LOGGER.debug(`Get portfolio history for user ${userId}, days: ${days}.`);
        try {
            const history = await this.portfolioService.getHistory(userId, days);
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
}
