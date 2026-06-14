import { CashVsCreditResult } from 'src/core/pricing/cash-vs-credit.policy';
import { OptimizerBuyLine } from 'src/core/optimizer/optimizer.types';
import { BaseViewDto } from 'src/http/base/base.view.dto';

export { OptimizerBuyLine };

export class OptimizerViewDto extends BaseViewDto {
    readonly vendorName: string;
    readonly sellItemCount: number;
    readonly itemsWithoutPrice: number;
    readonly buyLines: OptimizerBuyLine[];
    /** Bonus fraction used for the server-rendered numbers (0.30 = 30%). */
    readonly defaultBonusPct: number;
    readonly result: CashVsCreditResult;

    constructor(init: Partial<OptimizerViewDto>) {
        super(init);
        this.vendorName = init.vendorName ?? '';
        this.sellItemCount = init.sellItemCount ?? 0;
        this.itemsWithoutPrice = init.itemsWithoutPrice ?? 0;
        this.buyLines = init.buyLines ?? [];
        this.defaultBonusPct = init.defaultBonusPct ?? 0;
        this.result = init.result;
    }
}
