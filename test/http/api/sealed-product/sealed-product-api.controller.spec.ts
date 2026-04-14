import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';
import { SealedProductApiController } from 'src/http/api/sealed-product/sealed-product-api.controller';
import { ApiRateLimitGuard } from 'src/http/api/shared/api-rate-limit.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';

function createProduct(overrides: Partial<SealedProduct> = {}): SealedProduct {
    return new SealedProduct({
        uuid: '11111111-1111-1111-1111-111111111111',
        name: 'Murders at Karlov Manor Collector Booster Box',
        setCode: 'mkm',
        category: 'booster_box',
        subtype: 'collector',
        cardCount: 180,
        productSize: 12,
        releaseDate: '2024-02-09',
        contentsSummary: '12 collector boosters',
        tcgplayerProductId: '500001',
        ...overrides,
    });
}

function createInventory(
    overrides: Partial<SealedProductInventory> = {}
): SealedProductInventory {
    return new SealedProductInventory({
        sealedProductUuid: '11111111-1111-1111-1111-111111111111',
        userId: 42,
        quantity: 2,
        ...overrides,
    });
}

function makeReq(userId?: number): AuthenticatedRequest {
    return { user: userId !== undefined ? { id: userId } : undefined } as AuthenticatedRequest;
}

describe('SealedProductApiController', () => {
    let controller: SealedProductApiController;
    let sealedProductService: jest.Mocked<SealedProductService>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SealedProductApiController],
            providers: [
                {
                    provide: SealedProductService,
                    useValue: {
                        findBySetCode: jest.fn(),
                        totalBySetCode: jest.fn(),
                        findByUuid: jest.fn(),
                        findPriceHistory: jest.fn(),
                        findInventoryForUser: jest.fn(),
                        totalInventoryForUser: jest.fn(),
                        findInventoryItem: jest.fn(),
                        findInventoryQuantitiesForUser: jest.fn(),
                        saveInventory: jest.fn(),
                        deleteInventory: jest.fn(),
                    },
                },
                {
                    provide: ApiRateLimitGuard,
                    useValue: { canActivate: jest.fn().mockReturnValue(true) },
                },
            ],
        }).compile();

        controller = module.get(SealedProductApiController);
        sealedProductService = module.get(
            SealedProductService
        ) as jest.Mocked<SealedProductService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findBySet', () => {
        it('returns products and pagination meta', async () => {
            sealedProductService.findBySetCode.mockResolvedValue([createProduct()]);
            sealedProductService.totalBySetCode.mockResolvedValue(7);

            const result = await controller.findBySet(
                'mkm',
                { page: '2', limit: '25' },
                makeReq()
            );

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].uuid).toBe('11111111-1111-1111-1111-111111111111');
            expect(result.data[0].setCode).toBe('mkm');
            expect(result.data[0].ownedQuantity).toBeUndefined();
            expect(result.meta.page).toBe(2);
            expect(result.meta.limit).toBe(25);
            expect(result.meta.total).toBe(7);
            expect(sealedProductService.findBySetCode).toHaveBeenCalledWith(
                'mkm',
                expect.any(Object)
            );
            expect(sealedProductService.totalBySetCode).toHaveBeenCalledWith('mkm');
            expect(sealedProductService.findInventoryQuantitiesForUser).not.toHaveBeenCalled();
        });

        it('returns an empty array when the set has no sealed products', async () => {
            sealedProductService.findBySetCode.mockResolvedValue([]);
            sealedProductService.totalBySetCode.mockResolvedValue(0);

            const result = await controller.findBySet('mkm', {}, makeReq());

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.meta.total).toBe(0);
            expect(sealedProductService.findInventoryQuantitiesForUser).not.toHaveBeenCalled();
        });

        it('populates ownedQuantity for authenticated users', async () => {
            const p1 = createProduct({ uuid: 'uuid-1' });
            const p2 = createProduct({ uuid: 'uuid-2', name: 'Other Product' });
            sealedProductService.findBySetCode.mockResolvedValue([p1, p2]);
            sealedProductService.totalBySetCode.mockResolvedValue(2);
            sealedProductService.findInventoryQuantitiesForUser.mockResolvedValue(
                new Map([['uuid-1', 5]])
            );

            const result = await controller.findBySet('mkm', {}, makeReq(42));

            expect(result.success).toBe(true);
            expect(result.data[0].ownedQuantity).toBe(5);
            // Products not in the map default to 0.
            expect(result.data[1].ownedQuantity).toBe(0);
            expect(sealedProductService.findInventoryQuantitiesForUser).toHaveBeenCalledWith(
                42,
                ['uuid-1', 'uuid-2']
            );
        });

        it('skips the inventory lookup when authenticated but no products returned', async () => {
            sealedProductService.findBySetCode.mockResolvedValue([]);
            sealedProductService.totalBySetCode.mockResolvedValue(0);

            const result = await controller.findBySet('mkm', {}, makeReq(42));

            expect(result.data).toEqual([]);
            expect(sealedProductService.findInventoryQuantitiesForUser).not.toHaveBeenCalled();
        });
    });

    describe('findByUuid', () => {
        it('returns the product when found', async () => {
            const product = createProduct();
            sealedProductService.findByUuid.mockResolvedValue(product);

            const result = await controller.findByUuid(product.uuid);

            expect(result.success).toBe(true);
            expect(result.data.uuid).toBe(product.uuid);
            expect(result.data.name).toBe(product.name);
            expect(sealedProductService.findByUuid).toHaveBeenCalledWith(product.uuid);
        });

        it('throws NotFoundException when the product is missing', async () => {
            sealedProductService.findByUuid.mockResolvedValue(null);

            await expect(controller.findByUuid('missing-uuid')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('getPriceHistory', () => {
        it('returns price history points for the default window', async () => {
            const history = [{ price: 120.5, date: '2026-04-01' }];
            sealedProductService.findPriceHistory.mockResolvedValue(history);

            const result = await controller.getPriceHistory('uuid-1');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(history);
            expect(sealedProductService.findPriceHistory).toHaveBeenCalledWith(
                'uuid-1',
                undefined
            );
        });

        it('passes through the days query parameter', async () => {
            sealedProductService.findPriceHistory.mockResolvedValue([]);

            await controller.getPriceHistory('uuid-1', '30');

            const [, daysArg] = sealedProductService.findPriceHistory.mock.calls[0];
            expect(daysArg).toBe(30);
        });
    });

    describe('findInventory', () => {
        it('returns the authenticated user inventory with pagination', async () => {
            const items = [createInventory({ sealedProduct: createProduct() })];
            sealedProductService.findInventoryForUser.mockResolvedValue(items);
            sealedProductService.totalInventoryForUser.mockResolvedValue(1);

            const req = makeReq(42);
            const result = await controller.findInventory({}, req);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].sealedProductUuid).toBe(items[0].sealedProductUuid);
            expect(result.data[0].quantity).toBe(2);
            expect(sealedProductService.findInventoryForUser).toHaveBeenCalledWith(
                42,
                expect.any(Object)
            );
            expect(sealedProductService.totalInventoryForUser).toHaveBeenCalledWith(42);
        });
    });

    describe('addToInventory', () => {
        it('saves a new inventory item for the authenticated user', async () => {
            const saved = createInventory({ quantity: 1 });
            sealedProductService.saveInventory.mockResolvedValue(saved);

            const req = makeReq(42);
            const result = await controller.addToInventory(
                { sealedProductUuid: saved.sealedProductUuid, quantity: 1 },
                req
            );

            expect(result.success).toBe(true);
            expect(result.data.quantity).toBe(1);
            const arg = sealedProductService.saveInventory.mock.calls[0][0];
            expect(arg.sealedProductUuid).toBe(saved.sealedProductUuid);
            expect(arg.userId).toBe(42);
            expect(arg.quantity).toBe(1);
        });

    });

    describe('updateInventory', () => {
        it('updates an existing inventory quantity', async () => {
            const saved = createInventory({ quantity: 5 });
            sealedProductService.saveInventory.mockResolvedValue(saved);

            const req = makeReq(42);
            const result = await controller.updateInventory(
                { sealedProductUuid: saved.sealedProductUuid, quantity: 5 },
                req
            );

            expect(result.success).toBe(true);
            expect(result.data.quantity).toBe(5);
            const arg = sealedProductService.saveInventory.mock.calls[0][0];
            expect(arg.quantity).toBe(5);
            expect(arg.userId).toBe(42);
        });
    });

    describe('removeFromInventory', () => {
        it('deletes and returns deleted=true', async () => {
            sealedProductService.deleteInventory.mockResolvedValue(true);

            const req = makeReq(42);
            const result = await controller.removeFromInventory(
                { sealedProductUuid: '11111111-1111-1111-1111-111111111111' },
                req
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ deleted: true });
            expect(sealedProductService.deleteInventory).toHaveBeenCalledWith(
                '11111111-1111-1111-1111-111111111111',
                42
            );
        });

        it('returns deleted=false when the service reports no-op', async () => {
            sealedProductService.deleteInventory.mockResolvedValue(false);

            const req = makeReq(42);
            const result = await controller.removeFromInventory(
                { sealedProductUuid: '11111111-1111-1111-1111-111111111111' },
                req
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ deleted: false });
        });
    });
});
