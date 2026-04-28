import { BaseViewDto } from 'src/http/base/base.view.dto';
import { BreakdownDimension } from 'src/core/portfolio/portfolio-breakdown.entity';

export interface BreakdownSliceView {
    key: string;
    label: string;
    cardCount: number;
    itemCount: number;
    value: number;
    valueFormatted: string;
    percent: number;
    percentFormatted: string;
}

export class PortfolioBreakdownViewDto extends BaseViewDto {
    readonly dimension: BreakdownDimension;
    readonly locked: boolean;
    readonly slices: BreakdownSliceView[];
    readonly totalValue: number;
    readonly totalValueFormatted: string;
    readonly totalItems: number;

    constructor(init: Partial<PortfolioBreakdownViewDto>) {
        super(init);
        this.dimension = init.dimension ?? 'set';
        this.locked = init.locked ?? false;
        this.slices = init.slices ?? [];
        this.totalValue = init.totalValue ?? 0;
        this.totalValueFormatted = init.totalValueFormatted ?? '$0.00';
        this.totalItems = init.totalItems ?? 0;
    }
}
