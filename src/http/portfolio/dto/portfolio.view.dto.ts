import { BaseViewDto } from 'src/http/base/base.view.dto';
import {
    CardPerformanceViewData,
    PortfolioSummaryViewData,
    SetRoiViewData,
} from '../portfolio.presenter';

export class PortfolioViewDto extends BaseViewDto {
    readonly username: string;
    readonly hasHistory: boolean;
    readonly hasSummary: boolean;
    readonly summary?: PortfolioSummaryViewData;
    readonly topPerformers?: CardPerformanceViewData[];
    readonly worstPerformers?: CardPerformanceViewData[];
    readonly setRoi?: SetRoiViewData[];

    constructor(init: Partial<PortfolioViewDto>) {
        super(init);
        this.username = init.username || '';
        this.hasHistory = init.hasHistory || false;
        this.hasSummary = init.hasSummary || false;
        this.summary = init.summary;
        this.topPerformers = init.topPerformers;
        this.worstPerformers = init.worstPerformers;
        this.setRoi = init.setRoi;
    }
}
