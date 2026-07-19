import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OptimizerPlan } from 'src/core/optimizer/optimizer.types';
import { SellOptimizerService } from 'src/core/optimizer/sell-optimizer.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SellOptimizerOrchestrator } from 'src/http/hbs/optimizer/sell-optimizer.orchestrator';

describe('SellOptimizerOrchestrator', () => {
    let orchestrator: SellOptimizerOrchestrator;
    let optimizerService: jest.Mocked<SellOptimizerService>;

    const authedReq = { user: { id: 3 } } as AuthenticatedRequest;
    const anonReq = { user: null } as unknown as AuthenticatedRequest;

    const plan: OptimizerPlan = {
        vendorKey: 'cardkingdom',
        vendorName: 'Card Kingdom',
        cashValue: 100,
        sellItemCount: 4,
        buyListRetail: 120,
        buyLines: [
            {
                name: 'Lightning Bolt',
                setCode: 'lea',
                number: '141',
                finish: 'normal',
                quantity: 2,
                unitPrice: 10,
                lineTotal: 20,
            },
            {
                // Comma in the name and a missing price: both need CSV handling.
                name: 'Jace, the Mind Sculptor',
                setCode: 'wwk',
                number: '31',
                finish: 'foil',
                quantity: 1,
                unitPrice: null,
                lineTotal: null,
            },
        ],
        itemsWithoutPrice: 1,
        bonusPct: 0.3,
        result: {
            cashValue: 100,
            buyListRetail: 120,
            bonusPct: 0.3,
            storeCredit: 130,
            cashOutOfPocket: 20,
            cashLeftover: 0,
            creditOutOfPocket: 0,
            lockedCredit: 10,
            creditAdvantage: 20,
            recommendCredit: true,
        },
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SellOptimizerOrchestrator,
                { provide: SellOptimizerService, useValue: { buildPlan: jest.fn() } },
            ],
        }).compile();

        orchestrator = module.get(SellOptimizerOrchestrator);
        optimizerService = module.get(SellOptimizerService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        optimizerService.buildPlan.mockResolvedValue(plan);
    });

    describe('buildView', () => {
        it('maps the plan onto the view and echoes the parsed bonus', async () => {
            const view = await orchestrator.buildView(authedReq, '0.25');

            expect(optimizerService.buildPlan).toHaveBeenCalledWith(3, 0.25);
            expect(view.authenticated).toBe(true);
            expect(view.title).toBe('Cash vs. Store Credit - I Want My MTG');
            expect(view.vendorName).toBe('Card Kingdom');
            expect(view.sellItemCount).toBe(4);
            expect(view.itemsWithoutPrice).toBe(1);
            expect(view.defaultBonusPct).toBe(0.25);
            expect(view.buyLines).toBe(plan.buyLines);
            expect(view.result).toBe(plan.result);
        });

        it('falls back to the default bonus when the param is missing or invalid', async () => {
            const fallback = SellOptimizerService.parseBonus(undefined);

            await orchestrator.buildView(authedReq);
            expect(optimizerService.buildPlan).toHaveBeenCalledWith(3, fallback);

            await orchestrator.buildView(authedReq, 'abc');
            expect(optimizerService.buildPlan).toHaveBeenLastCalledWith(3, fallback);
        });

        it('throws Unauthorized for an unauthenticated request', async () => {
            await expect(orchestrator.buildView(anonReq)).rejects.toThrow(UnauthorizedException);
            expect(optimizerService.buildPlan).not.toHaveBeenCalled();
        });

        it('maps an unexpected service error to a 500', async () => {
            optimizerService.buildPlan.mockRejectedValue(new Error('boom'));

            await expect(orchestrator.buildView(authedReq)).rejects.toThrow(
                InternalServerErrorException
            );
        });
    });

    describe('buildCsv', () => {
        it('emits a summary block followed by the buy-list rows', async () => {
            const csv = await orchestrator.buildCsv(authedReq, '0.3');
            const lines = csv.split('\n');

            expect(lines[0]).toBe('section,field,value');
            expect(lines).toContain('summary,vendor,Card Kingdom');
            expect(lines).toContain('summary,store_credit_bonus_pct,30');
            expect(lines).toContain('summary,recommendation,store_credit');
            expect(lines).toContain(
                'buy_list,name,set_code,number,finish,quantity,unit_retail,line_retail'
            );
            expect(lines).toContain('buy_list,Lightning Bolt,lea,141,normal,2,10,20');
            expect(csv.endsWith('\n')).toBe(true);
        });

        it('quotes fields containing commas and leaves unpriced lines blank', async () => {
            const csv = await orchestrator.buildCsv(authedReq);

            expect(csv).toContain('buy_list,"Jace, the Mind Sculptor",wwk,31,foil,1,,');
        });

        it('reports cash when credit is not the better option', async () => {
            optimizerService.buildPlan.mockResolvedValue({
                ...plan,
                result: { ...plan.result, recommendCredit: false },
            });

            const csv = await orchestrator.buildCsv(authedReq);

            expect(csv).toContain('summary,recommendation,cash');
        });

        it('throws Unauthorized for an unauthenticated request', async () => {
            await expect(orchestrator.buildCsv(anonReq)).rejects.toThrow(UnauthorizedException);
        });
    });
});
