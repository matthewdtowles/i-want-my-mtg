import { BaseViewDto } from 'src/http/base/base.view.dto';
import { BreakdownDimension } from 'src/core/portfolio/portfolio-breakdown.entity';

export interface BreakdownCardView {
    cardId: string;
    name: string;
    setCode: string;
    number: string;
    cardUrl: string;
    imgSrc: string;
    quantity: number;
    valueFormatted: string;
}

export interface BreakdownSliceView {
    key: string;
    label: string;
    cardCount: number;
    itemCount: number;
    value: number;
    valueFormatted: string;
    percent: number;
    percentFormatted: string;
    /** No-JS fallback: link that expands (or collapses) this slice via full nav. */
    expandHref: string;
    /** True when this slice is server-rendered expanded (the `expand` query param). */
    expanded: boolean;
    /** Cards in this slice, populated only when `expanded` is true. */
    cards: BreakdownCardView[];
}

export interface ColorChipView {
    code: string;
    label: string;
    active: boolean;
    href: string;
}

export class PortfolioBreakdownViewDto extends BaseViewDto {
    readonly dimension: BreakdownDimension;
    readonly locked: boolean;
    readonly slices: BreakdownSliceView[];
    readonly totalValue: number;
    readonly totalValueFormatted: string;
    readonly totalItems: number;
    readonly colorChips: ColorChipView[];
    readonly selectedColors: string[];
    readonly filterLabel: string;

    constructor(init: Partial<PortfolioBreakdownViewDto>) {
        super(init);
        this.dimension = init.dimension ?? 'set';
        this.locked = init.locked ?? false;
        this.slices = init.slices ?? [];
        this.totalValue = init.totalValue ?? 0;
        this.totalValueFormatted = init.totalValueFormatted ?? '$0.00';
        this.totalItems = init.totalItems ?? 0;
        this.colorChips = init.colorChips ?? [];
        this.selectedColors = init.selectedColors ?? [];
        this.filterLabel = init.filterLabel ?? '';
    }
}
