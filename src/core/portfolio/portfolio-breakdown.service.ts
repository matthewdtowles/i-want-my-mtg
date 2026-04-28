import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import {
    BREAKDOWN_DIMENSIONS,
    BreakdownDimension,
    PortfolioBreakdown,
} from './portfolio-breakdown.entity';
import { PortfolioBreakdownRepositoryPort } from './ports/portfolio-breakdown.repository.port';

@Injectable()
export class PortfolioBreakdownService {
    private readonly LOGGER = getLogger(PortfolioBreakdownService.name);

    constructor(
        @Inject(PortfolioBreakdownRepositoryPort)
        private readonly repository: PortfolioBreakdownRepositoryPort
    ) {}

    static isDimension(value: string | undefined | null): value is BreakdownDimension {
        return !!value && (BREAKDOWN_DIMENSIONS as string[]).includes(value);
    }

    async getBreakdown(
        userId: number,
        dimension: BreakdownDimension
    ): Promise<PortfolioBreakdown> {
        this.LOGGER.debug(`Get ${dimension} breakdown for user ${userId}.`);
        const slices = await this.repository.aggregate(userId, dimension);
        return new PortfolioBreakdown(dimension, slices);
    }
}
