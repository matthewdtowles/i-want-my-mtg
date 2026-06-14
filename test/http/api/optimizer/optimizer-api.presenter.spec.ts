import { computeCashVsCredit } from 'src/core/pricing/cash-vs-credit.policy';
import { OptimizerPlan } from 'src/core/optimizer/optimizer.types';
import { OptimizerApiPresenter } from 'src/http/api/optimizer/optimizer-api.presenter';

function plan(overrides: Partial<OptimizerPlan> = {}): OptimizerPlan {
    const bonusPct = overrides.bonusPct ?? 0.3;
    return {
        vendorKey: 'cardkingdom',
        vendorName: 'Card Kingdom',
        cashValue: 14,
        sellItemCount: 2,
        buyListRetail: 40,
        itemsWithoutPrice: 0,
        bonusPct,
        buyLines: [
            {
                name: 'Test Dragon',
                setCode: 'TST',
                number: '4',
                finish: 'normal',
                quantity: 2,
                unitPrice: 20,
                lineTotal: 40,
            },
        ],
        result: computeCashVsCredit({ cashValue: 14, buyListRetail: 40, bonusPct }),
        ...overrides,
    };
}

describe('OptimizerApiPresenter', () => {
    it('flattens the cash-vs-credit result and buy lines into the response DTO', () => {
        const result = OptimizerApiPresenter.toResponse(plan());

        expect(result.vendor).toBe('Card Kingdom');
        expect(result.bonusPct).toBe(0.3);
        expect(result.cashValue).toBe(14);
        expect(result.buyListRetail).toBe(40);
        expect(result.storeCredit).toBe(18.2);
        expect(result.recommendCredit).toBe(true);
        expect(result.creditAdvantage).toBe(4.2);
        expect(result.sellItemCount).toBe(2);
        expect(result.itemsWithoutPrice).toBe(0);
        expect(result.buyLines).toEqual([
            {
                name: 'Test Dragon',
                setCode: 'TST',
                number: '4',
                finish: 'normal',
                quantity: 2,
                unitPrice: 20,
                lineTotal: 40,
            },
        ]);
    });

    it('preserves null unit/line prices for unpriced buy-list lines', () => {
        const result = OptimizerApiPresenter.toResponse(
            plan({
                buyLines: [
                    {
                        name: 'No Price',
                        setCode: 'TST',
                        number: '9',
                        finish: 'normal',
                        quantity: 3,
                        unitPrice: null,
                        lineTotal: null,
                    },
                ],
            })
        );

        expect(result.buyLines[0].unitPrice).toBeNull();
        expect(result.buyLines[0].lineTotal).toBeNull();
    });
});
