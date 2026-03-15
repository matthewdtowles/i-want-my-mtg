import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SetController } from 'src/http/hbs/set/set.controller';
import { SetOrchestrator } from 'src/http/hbs/set/set.orchestrator';

function makeRes(): jest.Mocked<Response> {
    return {
        setHeader: jest.fn(),
        send: jest.fn(),
    } as unknown as jest.Mocked<Response>;
}

function makeReq(userId?: number): AuthenticatedRequest {
    return { user: userId !== undefined ? { id: userId } : undefined } as AuthenticatedRequest;
}

describe('SetController', () => {
    let controller: SetController;
    let orchestrator: jest.Mocked<SetOrchestrator>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SetController],
            providers: [
                {
                    provide: SetOrchestrator,
                    useValue: {
                        findSetList: jest.fn(),
                        findBySetCode: jest.fn(),
                        addSetToInventory: jest.fn(),
                        getChecklist: jest.fn(),
                        getSetPriceHistory: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get(SetController);
        orchestrator = module.get(SetOrchestrator) as jest.Mocked<SetOrchestrator>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPriceHistory', () => {
        it('delegates to orchestrator with parsed days', async () => {
            const mockResponse = { setCode: 'neo', prices: [] };
            orchestrator.getSetPriceHistory.mockResolvedValue(mockResponse);

            const result = await controller.getPriceHistory('neo', '30');

            expect(orchestrator.getSetPriceHistory).toHaveBeenCalledWith('neo', 30);
            expect(result).toEqual(mockResponse);
        });

        it('passes undefined days when not provided', async () => {
            const mockResponse = { setCode: 'neo', prices: [] };
            orchestrator.getSetPriceHistory.mockResolvedValue(mockResponse);

            await controller.getPriceHistory('neo');

            expect(orchestrator.getSetPriceHistory).toHaveBeenCalledWith('neo', undefined);
        });

        it('passes undefined for non-numeric days', async () => {
            const mockResponse = { setCode: 'neo', prices: [] };
            orchestrator.getSetPriceHistory.mockResolvedValue(mockResponse);

            await controller.getPriceHistory('neo', 'abc');

            expect(orchestrator.getSetPriceHistory).toHaveBeenCalledWith('neo', undefined);
        });
    });

    describe('getChecklist', () => {
        it('streams CSV for a valid set code', async () => {
            orchestrator.getChecklist.mockResolvedValue('number,name\n1,Forest\n');
            const res = makeRes();

            await controller.getChecklist('dmu', makeReq(1), res);

            expect(orchestrator.getChecklist).toHaveBeenCalledWith('dmu', 1);
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                'attachment; filename="dmu-checklist.csv"'
            );
            expect(res.send).toHaveBeenCalledWith('number,name\n1,Forest\n');
        });

        it('passes null userId for unauthenticated requests', async () => {
            orchestrator.getChecklist.mockResolvedValue('number,name\n');
            const res = makeRes();

            await controller.getChecklist('grn', makeReq(), res);

            expect(orchestrator.getChecklist).toHaveBeenCalledWith('grn', null);
        });

        it.each([
            ['code with path traversal', '../etc/passwd'],
            ['code with newline', 'dmu\r\nX-Injected: header'],
            ['code with quotes', 'dmu"evil'],
            ['code with spaces', 'dmu evil'],
            ['code with semicolon', 'dmu;evil'],
        ])('throws BadRequestException for unsafe code: %s', async (_, code) => {
            const res = makeRes();
            await expect(controller.getChecklist(code, makeReq(1), res)).rejects.toThrow(
                BadRequestException
            );
            expect(orchestrator.getChecklist).not.toHaveBeenCalled();
        });

        it.each(['dmu', 'DMU', 'mh3', 'MH3', 'alpha', 'war-of-the-spark', 'set_2024'])(
            'accepts valid set code: %s',
            async (code) => {
                orchestrator.getChecklist.mockResolvedValue('');
                const res = makeRes();

                await expect(controller.getChecklist(code, makeReq(1), res)).resolves.not.toThrow();
            }
        );
    });
});
