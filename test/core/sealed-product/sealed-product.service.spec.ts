import { Test, TestingModule } from '@nestjs/testing';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductRepositoryPort } from 'src/core/sealed-product/ports/sealed-product.repository.port';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';

describe('SealedProductService', () => {
    let service: SealedProductService;
    let repository: jest.Mocked<SealedProductRepositoryPort>;

    const mockProducts: SealedProduct[] = [
        new SealedProduct({ uuid: 'uuid-1', name: 'Draft Booster Box', setCode: 'blb' }),
        new SealedProduct({ uuid: 'uuid-2', name: 'Collector Booster Box', setCode: 'blb' }),
    ];

    const mockQueryOptions = new SafeQueryOptions({ page: '1', limit: '10' });

    const mockRepository = {
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
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SealedProductService,
                { provide: SealedProductRepositoryPort, useValue: mockRepository },
            ],
        }).compile();
        service = module.get<SealedProductService>(SealedProductService);
        repository = module.get(SealedProductRepositoryPort);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findBySetCode', () => {
        it('should return sealed products for a set', async () => {
            repository.findBySetCode.mockResolvedValue(mockProducts);
            const result = await service.findBySetCode('blb', mockQueryOptions);
            expect(result).toEqual(mockProducts);
            expect(repository.findBySetCode).toHaveBeenCalledWith('blb', mockQueryOptions);
        });
    });

    describe('totalBySetCode', () => {
        it('should return total count for a set', async () => {
            repository.totalBySetCode.mockResolvedValue(5);
            const result = await service.totalBySetCode('blb');
            expect(result).toBe(5);
            expect(repository.totalBySetCode).toHaveBeenCalledWith('blb');
        });
    });

    describe('findByUuid', () => {
        it('should return a sealed product by uuid', async () => {
            repository.findByUuid.mockResolvedValue(mockProducts[0]);
            const result = await service.findByUuid('uuid-1');
            expect(result).toEqual(mockProducts[0]);
            expect(repository.findByUuid).toHaveBeenCalledWith('uuid-1');
        });

        it('should return null when not found', async () => {
            repository.findByUuid.mockResolvedValue(null);
            const result = await service.findByUuid('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('findPriceHistory', () => {
        it('should return price history', async () => {
            const history = [{ price: 89.99, date: '2024-01-01' }];
            repository.findPriceHistory.mockResolvedValue(history);
            const result = await service.findPriceHistory('uuid-1', 30);
            expect(result).toEqual(history);
            expect(repository.findPriceHistory).toHaveBeenCalledWith('uuid-1', 30);
        });
    });

    describe('findInventoryForUser', () => {
        it('should return user sealed inventory', async () => {
            const items = [
                new SealedProductInventory({
                    sealedProductUuid: 'uuid-1',
                    userId: 1,
                    quantity: 2,
                }),
            ];
            repository.findInventoryForUser.mockResolvedValue(items);
            const result = await service.findInventoryForUser(1, mockQueryOptions);
            expect(result).toEqual(items);
        });
    });

    describe('saveInventory', () => {
        it('should save inventory item', async () => {
            const item = new SealedProductInventory({
                sealedProductUuid: 'uuid-1',
                userId: 1,
                quantity: 3,
            });
            repository.saveInventory.mockResolvedValue(item);
            const result = await service.saveInventory(item);
            expect(result).toEqual(item);
            expect(repository.saveInventory).toHaveBeenCalledWith(item);
        });

        it('should delete when quantity is 0', async () => {
            const item = new SealedProductInventory({
                sealedProductUuid: 'uuid-1',
                userId: 1,
                quantity: 0,
            });
            repository.deleteInventory.mockResolvedValue(true);
            const result = await service.saveInventory(item);
            expect(result).toBeNull();
            expect(repository.deleteInventory).toHaveBeenCalledWith('uuid-1', 1);
            expect(repository.saveInventory).not.toHaveBeenCalled();
        });
    });

    describe('deleteInventory', () => {
        it('should delete inventory item', async () => {
            repository.deleteInventory.mockResolvedValue(true);
            const result = await service.deleteInventory('uuid-1', 1);
            expect(result).toBe(true);
            expect(repository.deleteInventory).toHaveBeenCalledWith('uuid-1', 1);
        });
    });

    describe('findInventoryQuantitiesForUser', () => {
        it('should delegate to the repository and return the quantity map', async () => {
            const map = new Map<string, number>([
                ['uuid-1', 3],
                ['uuid-2', 1],
            ]);
            repository.findInventoryQuantitiesForUser.mockResolvedValue(map);

            const result = await service.findInventoryQuantitiesForUser(42, [
                'uuid-1',
                'uuid-2',
            ]);

            expect(result).toBe(map);
            expect(repository.findInventoryQuantitiesForUser).toHaveBeenCalledWith(42, [
                'uuid-1',
                'uuid-2',
            ]);
        });
    });
});
