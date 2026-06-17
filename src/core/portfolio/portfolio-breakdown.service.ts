import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import {
    BREAKDOWN_DIMENSIONS,
    BreakdownDimension,
    COLOR_CODES,
    ColorCode,
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

    /**
     * Parse a `colors` filter param (e.g. "W,U") into validated, de-duped color
     * codes, preserving input order. Unknown codes are dropped.
     */
    static parseColors(raw: string | undefined | null): ColorCode[] {
        if (!raw) {
            return [];
        }
        const seen = new Set<string>();
        const out: ColorCode[] = [];
        for (const part of raw.split(',')) {
            const code = part.trim().toUpperCase();
            if ((COLOR_CODES as readonly string[]).includes(code) && !seen.has(code)) {
                seen.add(code);
                out.push(code as ColorCode);
            }
        }
        return out;
    }

    async getBreakdown(
        userId: number,
        dimension: BreakdownDimension,
        selectedColors: string[] = []
    ): Promise<PortfolioBreakdown> {
        this.LOGGER.debug(`Get ${dimension} breakdown for user ${userId}.`);
        const slices = await this.repository.aggregate(userId, dimension, selectedColors);
        return new PortfolioBreakdown(dimension, slices);
    }
}
