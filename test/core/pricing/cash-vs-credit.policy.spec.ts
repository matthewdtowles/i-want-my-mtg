import { computeCashVsCredit } from 'src/core/pricing/cash-vs-credit.policy';

describe('computeCashVsCredit', () => {
    it('recommends credit when the buy list exceeds the full store credit (full bonus realized)', () => {
        // C=100, b=0.30 -> credit=130. R=200 > 130.
        const r = computeCashVsCredit({ cashValue: 100, buyListRetail: 200, bonusPct: 0.3 });
        expect(r.storeCredit).toBe(130);
        expect(r.cashOutOfPocket).toBe(100); // 200 - 100
        expect(r.creditOutOfPocket).toBe(70); // 200 - 130
        expect(r.creditAdvantage).toBe(30); // exactly C*b
        expect(r.lockedCredit).toBe(0);
        expect(r.recommendCredit).toBe(true);
    });

    it('recommends credit when the buy list is between cash and full credit (partial)', () => {
        // C=100, b=0.30 -> credit=130. R=120 (C < R < credit).
        const r = computeCashVsCredit({ cashValue: 100, buyListRetail: 120, bonusPct: 0.3 });
        expect(r.cashOutOfPocket).toBe(20); // 120 - 100
        expect(r.creditOutOfPocket).toBe(0); // covered by 130
        expect(r.creditAdvantage).toBe(20);
        expect(r.lockedCredit).toBe(10); // 130 - 120, locked at vendor
        expect(r.recommendCredit).toBe(true);
    });

    it('recommends cash when selling more than buying (no advantage; keep liquid)', () => {
        // C=100, R=40 < C.
        const r = computeCashVsCredit({ cashValue: 100, buyListRetail: 40, bonusPct: 0.3 });
        expect(r.cashOutOfPocket).toBe(0);
        expect(r.cashLeftover).toBe(60);
        expect(r.creditAdvantage).toBe(0);
        expect(r.recommendCredit).toBe(false);
        expect(r.lockedCredit).toBe(90); // 130 - 40 locked (why cash wins)
    });

    it('recommends cash when there is no buy list', () => {
        const r = computeCashVsCredit({ cashValue: 100, buyListRetail: 0, bonusPct: 0.3 });
        expect(r.creditAdvantage).toBe(0);
        expect(r.recommendCredit).toBe(false);
    });

    it('handles a zero cash value (nothing to sell)', () => {
        const r = computeCashVsCredit({ cashValue: 0, buyListRetail: 50, bonusPct: 0.3 });
        expect(r.storeCredit).toBe(0);
        expect(r.creditAdvantage).toBe(0);
        expect(r.recommendCredit).toBe(false);
    });

    it('a zero bonus makes credit and cash equivalent (no advantage)', () => {
        const r = computeCashVsCredit({ cashValue: 100, buyListRetail: 200, bonusPct: 0 });
        expect(r.storeCredit).toBe(100);
        expect(r.creditAdvantage).toBe(0);
        expect(r.recommendCredit).toBe(false);
    });

    it('rounds money to cents and clamps negative inputs to zero', () => {
        const r = computeCashVsCredit({ cashValue: 33.333, buyListRetail: -5, bonusPct: 0.25 });
        expect(r.cashValue).toBe(33.33);
        expect(r.buyListRetail).toBe(0);
        expect(r.storeCredit).toBe(41.67); // 33.333 * 1.25 = 41.66625 -> 41.67
    });
});
