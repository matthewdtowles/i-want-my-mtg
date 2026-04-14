import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import { SealedProductPrice } from 'src/core/sealed-product/sealed-product-price.entity';
import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';
import { Set } from 'src/core/set/set.entity';
import { SetService } from 'src/core/set/set.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SealedProductDetailViewDto } from 'src/http/hbs/sealed-product/dto/sealed-product-view.dto';
import { SealedProductOrchestrator } from 'src/http/hbs/sealed-product/sealed-product.orchestrator';

describe('SealedProductOrchestrator', () => {
    let orchestrator: SealedProductOrchestrator;
    let sealedProductService: jest.Mocked<SealedProductService>;
    let setService: jest.Mocked<SetService>;

    const authenticatedReq = {
        user: { id: 42, name: 'Tester' },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const unauthReq = {
        user: null,
        isAuthenticated: () => false,
    } as AuthenticatedRequest;

    const baseProduct = (overrides: Partial<SealedProduct> = {}): SealedProduct =>
        new SealedProduct({
            uuid: 'sp-abc',
            name: 'Draft Booster Box',
            setCode: 'blb',
            category: 'booster_box',
            subtype: 'draft',
            cardCount: 36,
            productSize: 36,
            releaseDate: '2024-08-02',
            contentsSummary: '36x Draft Booster Pack',
            tcgplayerProductId: '500001',
            price: new SealedProductPrice({
                price: 99.99,
                priceChangeWeekly: 1.5,
                date: '2024-08-02',
            }),
            ...overrides,
        });

    const baseSet = new Set({
        code: 'blb',
        baseSize: 280,
        isMain: true,
        keyruneCode: 'blb',
        name: 'Bloomburrow',
        releaseDate: '2024-08-02',
        cards: [],
        totalSize: 350,
        type: 'expansion',
    });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SealedProductOrchestrator,
                {
                    provide: SealedProductService,
                    useValue: {
                        findByUuid: jest.fn(),
                        findInventoryItem: jest.fn(),
                    },
                },
                {
                    provide: SetService,
                    useValue: {
                        findByCode: jest.fn(),
                    },
                },
            ],
        }).compile();

        orchestrator = module.get(SealedProductOrchestrator);
        sealedProductService = module.get(
            SealedProductService
        ) as jest.Mocked<SealedProductService>;
        setService = module.get(SetService) as jest.Mocked<SetService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByUuid', () => {
        it('returns a detail view DTO with presenter-shaped product', async () => {
            sealedProductService.findByUuid.mockResolvedValue(baseProduct());
            setService.findByCode.mockResolvedValue(baseSet);

            const result = await orchestrator.findByUuid(authenticatedReq, 'sp-abc');

            expect(result).toBeInstanceOf(SealedProductDetailViewDto);
            expect(result.product.uuid).toBe('sp-abc');
            expect(result.product.name).toBe('Draft Booster Box');
            expect(result.product.setCode).toBe('blb');
            expect(result.product.detailUrl).toBe('/sealed-products/sp-abc');
            expect(result.product.categoryLabel).toBe('Booster Box');
            expect(result.product.subtypeLabel).toBe('Draft');
            expect(result.product.price).toBe('$99.99');
            expect(result.product.hasPrice).toBe(true);
            expect(result.product.priceChangeWeekly).toBe('+$1.50');
            expect(result.product.priceChangeWeeklySign).toBe('positive');
            expect(result.product.imageUrl).toBe(
                'https://product-images.tcgplayer.com/fit-in/437x437/500001.jpg'
            );
            expect(result.product.contentsSummary).toBe('36x Draft Booster Pack');
            expect(result.product.productSize).toBe(36);
            expect(result.product.cardCount).toBe(36);
        });

        it('populates breadcrumbs with set and product links', async () => {
            sealedProductService.findByUuid.mockResolvedValue(baseProduct());
            setService.findByCode.mockResolvedValue(baseSet);

            const result = await orchestrator.findByUuid(authenticatedReq, 'sp-abc');

            expect(result.breadcrumbs).toEqual([
                { label: 'Home', url: '/' },
                { label: 'Sets', url: '/sets' },
                { label: 'Bloomburrow', url: '/sets/blb' },
                { label: 'Draft Booster Box', url: '/sealed-products/sp-abc' },
            ]);
        });

        it('populates setName and setKeyruneCode from the parent set', async () => {
            sealedProductService.findByUuid.mockResolvedValue(baseProduct());
            setService.findByCode.mockResolvedValue(baseSet);

            const result = await orchestrator.findByUuid(authenticatedReq, 'sp-abc');

            expect(result.setName).toBe('Bloomburrow');
            expect(result.setKeyruneCode).toBe('blb');
        });

        it('returns ownedQuantity=0 and authenticated=false for anonymous requests', async () => {
            sealedProductService.findByUuid.mockResolvedValue(baseProduct());
            setService.findByCode.mockResolvedValue(baseSet);

            const result = await orchestrator.findByUuid(unauthReq, 'sp-abc');

            expect(result.authenticated).toBe(false);
            expect(result.product.ownedQuantity).toBe(0);
            expect(sealedProductService.findInventoryItem).not.toHaveBeenCalled();
        });

        it('pulls ownedQuantity from inventory service for authenticated users', async () => {
            sealedProductService.findByUuid.mockResolvedValue(baseProduct());
            setService.findByCode.mockResolvedValue(baseSet);
            sealedProductService.findInventoryItem.mockResolvedValue({
                sealedProductUuid: 'sp-abc',
                userId: 42,
                quantity: 4,
            } as SealedProductInventory);

            const result = await orchestrator.findByUuid(authenticatedReq, 'sp-abc');

            expect(sealedProductService.findInventoryItem).toHaveBeenCalledWith('sp-abc', 42);
            expect(result.authenticated).toBe(true);
            expect(result.product.ownedQuantity).toBe(4);
        });

        it('returns ownedQuantity=0 when the authenticated user has no inventory record', async () => {
            sealedProductService.findByUuid.mockResolvedValue(baseProduct());
            setService.findByCode.mockResolvedValue(baseSet);
            sealedProductService.findInventoryItem.mockResolvedValue(null);

            const result = await orchestrator.findByUuid(authenticatedReq, 'sp-abc');

            expect(result.product.ownedQuantity).toBe(0);
        });

        it('exposes hasPrice=false when price is null', async () => {
            sealedProductService.findByUuid.mockResolvedValue(
                baseProduct({
                    price: new SealedProductPrice({ price: null, date: '2024-08-02' }),
                })
            );
            setService.findByCode.mockResolvedValue(baseSet);

            const result = await orchestrator.findByUuid(unauthReq, 'sp-abc');

            expect(result.product.hasPrice).toBe(false);
            expect(result.product.price).toBeUndefined();
            expect(result.product.priceChangeWeekly).toBeUndefined();
        });

        it('omits tcgplayer image when productId is missing', async () => {
            sealedProductService.findByUuid.mockResolvedValue(
                baseProduct({ tcgplayerProductId: undefined })
            );
            setService.findByCode.mockResolvedValue(baseSet);

            const result = await orchestrator.findByUuid(unauthReq, 'sp-abc');

            expect(result.product.imageUrl).toBeUndefined();
            expect(result.product.thumbnailUrl).toBeUndefined();
        });

        it('falls back to setCode for breadcrumb when set lookup returns null', async () => {
            sealedProductService.findByUuid.mockResolvedValue(baseProduct());
            setService.findByCode.mockResolvedValue(null);

            const result = await orchestrator.findByUuid(unauthReq, 'sp-abc');

            expect(result.setName).toBeUndefined();
            expect(result.setKeyruneCode).toBeUndefined();
            const setCrumb = result.breadcrumbs.find((b) => b.url === '/sets/blb');
            expect(setCrumb?.label).toBe('blb');
        });

        it('throws NotFoundException when product does not exist', async () => {
            sealedProductService.findByUuid.mockResolvedValue(null);

            await expect(
                orchestrator.findByUuid(authenticatedReq, 'missing')
            ).rejects.toThrow(NotFoundException);
        });
    });
});
