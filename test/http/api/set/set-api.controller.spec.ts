import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from 'src/core/card/card.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { Set } from 'src/core/set/set.entity';
import { SetPrice } from 'src/core/set/set-price.entity';
import { SetService } from 'src/core/set/set.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BlockPaginationMeta } from 'src/http/base/api-response.dto';
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
                        findBlockGroupKeys: jest.fn(),
                        findSetsByBlockKeys: jest.fn(),
                        findMultiSetBlockKeys: jest.fn(),
                        totalBlockGroups: jest.fn(),
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
                        inventoryTotalsForSets: jest.fn(),
                        ownedValuesForSets: jest.fn(),
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
        it('should include owned data when authenticated using batch methods', async () => {
            const sets = [createSet()];
            setService.findSets.mockResolvedValue(sets);
            setService.totalSetsCount.mockResolvedValue(1);
            inventoryService.inventoryTotalsForSets.mockResolvedValue(new Map([['mkm', 50]]));
            inventoryService.ownedValuesForSets.mockResolvedValue(new Map([['mkm', 75.25]]));

            const req = makeReq(42);
            const result = await controller.findAll(req, {});

            expect(result.success).toBe(true);
            expect(result.data[0].ownedTotal).toBe(50);
            expect(result.data[0].ownedValue).toBe(75.25);
            expect(result.data[0].completionRate).toBeGreaterThan(0);
            expect(inventoryService.inventoryTotalsForSets).toHaveBeenCalledWith(42, ['mkm']);
            expect(inventoryService.ownedValuesForSets).toHaveBeenCalledWith(42, ['mkm']);
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
            expect(inventoryService.inventoryTotalsForSets).not.toHaveBeenCalled();
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

        describe('group=block', () => {
            const parentSet = createSet({
                code: 'mid',
                name: 'Innistrad: Midnight Hunt',
                block: 'Innistrad',
                parentCode: undefined,
                releaseDate: '2021-09-24',
            });
            const childSet = createSet({
                code: 'mic',
                name: 'Innistrad: Midnight Hunt Commander',
                block: 'Innistrad',
                parentCode: 'mid',
                isMain: false,
                releaseDate: '2021-09-24',
            });
            const standaloneSet = createSet({
                code: 'neo',
                name: 'Kamigawa: Neon Dynasty',
                parentCode: undefined,
                releaseDate: '2022-02-18',
            });

            it('should use block-level pagination when group=block', async () => {
                setService.totalBlockGroups.mockResolvedValue(10);
                setService.findBlockGroupKeys.mockResolvedValue(['mid', 'neo']);
                setService.findSetsByBlockKeys.mockResolvedValue([parentSet, childSet, standaloneSet]);
                setService.findMultiSetBlockKeys.mockResolvedValue(['mid']);

                const req = makeReq();
                const result = await controller.findAll(req, { group: 'block' });

                expect(result.success).toBe(true);
                expect(result.data).toHaveLength(3);
                expect(result.meta.total).toBe(10);
                expect(result.meta).toBeInstanceOf(BlockPaginationMeta);
                expect((result.meta as BlockPaginationMeta).multiSetBlockKeys).toEqual(['mid']);
            });

            it('should not call findSets when group=block', async () => {
                setService.totalBlockGroups.mockResolvedValue(1);
                setService.findBlockGroupKeys.mockResolvedValue(['mid']);
                setService.findSetsByBlockKeys.mockResolvedValue([parentSet]);
                setService.findMultiSetBlockKeys.mockResolvedValue([]);

                const req = makeReq();
                await controller.findAll(req, { group: 'block' });

                expect(setService.findSets).not.toHaveBeenCalled();
                expect(setService.totalSetsCount).not.toHaveBeenCalled();
                expect(setService.findBlockGroupKeys).toHaveBeenCalled();
            });

            it('should fall back to flat pagination when group=block with sort', async () => {
                setService.findSets.mockResolvedValue([parentSet]);
                setService.totalSetsCount.mockResolvedValue(1);

                const req = makeReq();
                const result = await controller.findAll(req, { group: 'block', sort: 'set.name' });

                expect(setService.findSets).toHaveBeenCalled();
                expect(setService.findBlockGroupKeys).not.toHaveBeenCalled();
                expect(result.meta).not.toBeInstanceOf(BlockPaginationMeta);
            });

            it('should fall back to flat pagination when group=block with search', async () => {
                setService.searchSets.mockResolvedValue([parentSet]);
                setService.totalSearchSets.mockResolvedValue(1);

                const req = makeReq();
                const result = await controller.findAll(req, { group: 'block', q: 'innistrad' });

                expect(setService.searchSets).toHaveBeenCalled();
                expect(setService.findBlockGroupKeys).not.toHaveBeenCalled();
                expect(result.meta).not.toBeInstanceOf(BlockPaginationMeta);
            });

            it('should include inventory data with group=block when authenticated', async () => {
                setService.totalBlockGroups.mockResolvedValue(1);
                setService.findBlockGroupKeys.mockResolvedValue(['mid']);
                setService.findSetsByBlockKeys.mockResolvedValue([parentSet]);
                setService.findMultiSetBlockKeys.mockResolvedValue([]);
                inventoryService.inventoryTotalsForSets.mockResolvedValue(new Map([['mid', 100]]));
                inventoryService.ownedValuesForSets.mockResolvedValue(new Map([['mid', 50.0]]));

                const req = makeReq(42);
                const result = await controller.findAll(req, { group: 'block' });

                expect(result.data[0].ownedTotal).toBe(100);
                expect(result.data[0].ownedValue).toBe(50.0);
                expect(inventoryService.inventoryTotalsForSets).toHaveBeenCalledWith(42, ['mid']);
            });

            it('should return empty multiSetBlockKeys when no multi-set blocks', async () => {
                setService.totalBlockGroups.mockResolvedValue(1);
                setService.findBlockGroupKeys.mockResolvedValue(['neo']);
                setService.findSetsByBlockKeys.mockResolvedValue([standaloneSet]);
                setService.findMultiSetBlockKeys.mockResolvedValue([]);

                const req = makeReq();
                const result = await controller.findAll(req, { group: 'block' });

                expect((result.meta as BlockPaginationMeta).multiSetBlockKeys).toEqual([]);
            });
        });
    });
});
