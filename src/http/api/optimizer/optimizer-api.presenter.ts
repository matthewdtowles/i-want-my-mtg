import { OptimizerPlan } from 'src/core/optimizer/optimizer.types';
import { OptimizerApiResponseDto } from './dto/optimizer-response.dto';

export class OptimizerApiPresenter {
    /** Cash-vs-credit plan (6.5) as structured JSON — same OptimizerPlan the page renders. */
    static toResponse(plan: OptimizerPlan): OptimizerApiResponseDto {
        const r = plan.result;
        return {
            vendor: plan.vendorName,
            bonusPct: r.bonusPct,
            cashValue: r.cashValue,
            storeCredit: r.storeCredit,
            buyListRetail: r.buyListRetail,
            recommendCredit: r.recommendCredit,
            creditAdvantage: r.creditAdvantage,
            cashOutOfPocket: r.cashOutOfPocket,
            creditOutOfPocket: r.creditOutOfPocket,
            cashLeftover: r.cashLeftover,
            lockedCredit: r.lockedCredit,
            sellItemCount: plan.sellItemCount,
            itemsWithoutPrice: plan.itemsWithoutPrice,
            buyLines: plan.buyLines.map((l) => ({
                name: l.name,
                setCode: l.setCode,
                number: l.number,
                finish: l.finish,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal,
            })),
        };
    }
}
