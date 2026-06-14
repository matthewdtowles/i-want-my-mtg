import { SellOptimizerService } from 'src/core/optimizer/sell-optimizer.service';

describe('SellOptimizerService', () => {
    let inventoryService: { sellPlanForUser: jest.Mock };
    let buyListService: { list: jest.Mock };
    let service: SellOptimizerService;

    beforeEach(() => {
        inventoryService = { sellPlanForUser: jest.fn() };
        buyListService = { list: jest.fn() };
        service = new SellOptimizerService(inventoryService as any, buyListService as any);
    });

    describe('parseBonus', () => {
        it('defaults when raw is undefined or empty', () => {
            expect(SellOptimizerService.parseBonus(undefined)).toBe(0.3);
            expect(SellOptimizerService.parseBonus('')).toBe(0.3);
        });

        it('defaults on non-numeric or negative input', () => {
            expect(SellOptimizerService.parseBonus('abc')).toBe(0.3);
            expect(SellOptimizerService.parseBonus('-1')).toBe(0.3);
        });

        it('clamps to the UI cap of 2.0 (200%)', () => {
            expect(SellOptimizerService.parseBonus('5')).toBe(2);
            expect(SellOptimizerService.parseBonus('0.5')).toBe(0.5);
            expect(SellOptimizerService.parseBonus('2')).toBe(2);
        });
    });

    describe('buildPlan', () => {
        it('uses the Card Kingdom cash group, retail from buy-list prices, and the cash-vs-credit result', async () => {
            inventoryService.sellPlanForUser.mockResolvedValue({
                groups: [{ provider: 'cardkingdom', items: [{}, {}], payout: 14 }],
                totalPayout: 14,
                itemsWithOffers: 2,
                itemsWithoutOffers: 0,
            });
            buyListService.list.mockResolvedValue([
                {
                    cardId: 'c4',
                    isFoil: false,
                    quantity: 2,
                    card: {
                        name: 'Test Dragon',
                        setCode: 'tst',
                        number: '4',
                        prices: [{ normal: 20, foil: null }],
                    },
                },
            ]);

            const plan = await service.buildPlan(7, 0.3);

            expect(plan.vendorKey).toBe('cardkingdom');
            expect(plan.vendorName).toBe('Card Kingdom');
            expect(plan.cashValue).toBe(14);
            expect(plan.sellItemCount).toBe(2);
            expect(plan.buyListRetail).toBe(40);
            expect(plan.itemsWithoutPrice).toBe(0);
            expect(plan.buyLines).toEqual([
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
            // C=14, R=40, b=0.3 -> store credit 18.2, recommend credit, advantage C*b=4.2
            expect(plan.result.storeCredit).toBe(18.2);
            expect(plan.result.recommendCredit).toBe(true);
            expect(plan.result.creditAdvantage).toBe(4.2);
        });

        it('counts buy-list lines with no usable price and keeps them out of retail', async () => {
            inventoryService.sellPlanForUser.mockResolvedValue({
                groups: [],
                totalPayout: 0,
                itemsWithOffers: 0,
                itemsWithoutOffers: 0,
            });
            buyListService.list.mockResolvedValue([
                { cardId: 'c9', isFoil: false, quantity: 3, card: { name: 'No Price', setCode: 'tst', number: '9', prices: [] } },
            ]);

            const plan = await service.buildPlan(7, 0.3);

            expect(plan.cashValue).toBe(0);
            expect(plan.buyListRetail).toBe(0);
            expect(plan.itemsWithoutPrice).toBe(1);
            expect(plan.buyLines[0].unitPrice).toBeNull();
            expect(plan.buyLines[0].lineTotal).toBeNull();
        });

        it('uses the foil price for foil buy-list lines', async () => {
            inventoryService.sellPlanForUser.mockResolvedValue({
                groups: [],
                totalPayout: 0,
                itemsWithOffers: 0,
                itemsWithoutOffers: 0,
            });
            buyListService.list.mockResolvedValue([
                { cardId: 'c1', isFoil: true, quantity: 1, card: { name: 'Foil Card', setCode: 'tst', number: '1', prices: [{ normal: 5, foil: 12 }] } },
            ]);

            const plan = await service.buildPlan(7, 0.3);

            expect(plan.buyLines[0].finish).toBe('foil');
            expect(plan.buyLines[0].unitPrice).toBe(12);
            expect(plan.buyListRetail).toBe(12);
        });
    });
});
