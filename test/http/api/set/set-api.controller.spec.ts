import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from 'src/core/card/card.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { Set } from 'src/core/set/set.entity';
import { SetPrice } from 'src/core/set/set-price.entity';
import { SetService } from 'src/core/set/set.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SetApiController } from 'src/http/api/set/set-api.controller';
import { ApiRateLimitGuard } from 'src/http/api/shared/api-rate-limit.guard';

function createSet(overrides: Partial<Set> = {}): Set {
    return new Set({
        code: 'mkm',
        name: 'Murders at Karlov Manor',
        type: 'expansion',
        releaseDate: '2024-02-09',
        baseSize: 286,
        totalSize: 421,
        keyruneCode: 'mkm',
        isMain: true,
        prices: new SetPrice({
            setCode: 'mkm',
            basePrice: 120.5,
        }),
        ...overrides,
    });
}

function makeReq(userId?: number): AuthenticatedRequest {
    return { user: userId !== undefined ? { id: userId } : undefined } as AuthenticatedRequest;
}

describe('SetApiController', () => {
    let controller: SetApiController;
    let setService: jest.Mocked<SetService>;
    let inventoryService: jest.Mocked<InventoryService>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SetApiController],
            providers: [
                {
                    provide: SetService,
                    useValue: {
                        findSets: jest.fn(),
                        totalSetsCount: jest.fn(),
                        searchSets: jest.fn(),
                        totalSearchSets: jest.fn(),
                        findByCode: jest.fn(),
                    },
                },
                {
                    provide: CardService,
                    useValue: {
                        findBySet: jest.fn(),
                        totalInSet: jest.fn(),
                    },
                },
                {
                    provide: InventoryService,
                    useValue: {
                        totalInventoryItemsForSet: jest.fn(),
                        ownedValueForSet: jest.fn(),
                    },
                },
                {
                    provide: ApiRateLimitGuard,
                    useValue: { canActivate: jest.fn().mockReturnValue(true) },
                },
            ],
        }).compile();

        controller = module.get(SetApiController);
        setService = module.get(SetService) as jest.Mocked<SetService>;
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should include owned data when authenticated', async () => {
            const sets = [createSet()];
            setService.findSets.mockResolvedValue(sets);
            setService.totalSetsCount.mockResolvedValue(1);
            inventoryService.totalInventoryItemsForSet.mockResolvedValue(50);
            inventoryService.ownedValueForSet.mockResolvedValue(75.25);

            const req = makeReq(42);
            const result = await controller.findAll(req, {});

            expect(result.success).toBe(true);
            expect(result.data[0].ownedTotal).toBe(50);
            expect(result.data[0].ownedValue).toBe(75.25);
            expect(result.data[0].completionRate).toBeGreaterThan(0);
            expect(inventoryService.totalInventoryItemsForSet).toHaveBeenCalledWith(42, 'mkm');
            expect(inventoryService.ownedValueForSet).toHaveBeenCalledWith(42, 'mkm');
        });

        it('should not include owned data when unauthenticated', async () => {
            const sets = [createSet()];
            setService.findSets.mockResolvedValue(sets);
            setService.totalSetsCount.mockResolvedValue(1);

            const req = makeReq();
            const result = await controller.findAll(req, {});

            expect(result.success).toBe(true);
            expect(result.data[0].ownedTotal).toBeUndefined();
            expect(result.data[0].ownedValue).toBeUndefined();
            expect(result.data[0].completionRate).toBeUndefined();
            expect(inventoryService.totalInventoryItemsForSet).not.toHaveBeenCalled();
        });

        it('should use presenter to map set fields', async () => {
            const sets = [createSet({ type: 'commander', isMain: false })];
            setService.findSets.mockResolvedValue(sets);
            setService.totalSetsCount.mockResolvedValue(1);

            const req = makeReq();
            const result = await controller.findAll(req, {});

            expect(result.data[0].isMain).toBe(false);
            expect(result.data[0].tags).toEqual(['Commander']);
            expect(result.data[0].parentCode).toBeUndefined();
        });

        it('should include pagination meta', async () => {
            const sets = [createSet()];
            setService.findSets.mockResolvedValue(sets);
            setService.totalSetsCount.mockResolvedValue(50);

            const req = makeReq();
            const result = await controller.findAll(req, { page: '2', limit: '25' });

            expect(result.meta.page).toBe(2);
            expect(result.meta.limit).toBe(25);
            expect(result.meta.total).toBe(50);
        });

        it('should pass filter and baseOnly through SafeQueryOptions', async () => {
            const sets = [createSet()];
            setService.findSets.mockResolvedValue(sets);
            setService.totalSetsCount.mockResolvedValue(1);

            const req = makeReq();
            await controller.findAll(req, { filter: 'murder', baseOnly: 'true' });

            const calledOptions = setService.findSets.mock.calls[0][0];
            expect(calledOptions.filter).toBe('murder');
            expect(calledOptions.baseOnly).toBe(true);
        });
    });
});
