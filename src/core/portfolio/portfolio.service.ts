import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioValueHistory } from './portfolio-value-history.entity';
import { PortfolioValueHistoryRepositoryPort } from './portfolio-value-history.repository.port';

@Injectable()
export class PortfolioService {
    private readonly LOGGER = getLogger(PortfolioService.name);

    constructor(
        @Inject(PortfolioValueHistoryRepositoryPort)
        private readonly repository: PortfolioValueHistoryRepositoryPort,
    ) {}

    async getHistory(userId: number, days?: number): Promise<PortfolioValueHistory[]> {
        this.LOGGER.debug(`Get portfolio history for user ${userId}, days: ${days}.`);
        return this.repository.findByUser(userId, days);
    }
}
