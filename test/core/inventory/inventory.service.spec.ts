import { Test, TestingModule } from '@nestjs/testing';
import { CardMapper } from '../../../src/core/card/card.mapper';
import { InventoryCardDto, InventoryDto } from '../../../src/core/inventory/api/inventory.dto';
import { Inventory } from '../../../src/core/inventory/inventory.entity';
import { InventoryMapper } from '../../../src/core/inventory/inventory.mapper';
import { InventoryService } from '../../../src/core/inventory/inventory.service';
import { InventoryRepositoryPort } from '../../../src/core/inventory/api/inventory.repository.port';
import { TestUtils } from '../../test-utils';

describe('InventoryService', () => {
    let service: InventoryService;
    let repository: InventoryRepositoryPort;

    const testUtils: TestUtils = new TestUtils();
    const mockInventoryDtos: InventoryDto[] = testUtils.getMockCreateInventoryDtos();
    const mockDeleteInventoryDtos: InventoryDto[] = testUtils.getMockCreateInventoryDtos().map((i: InventoryDto) => {
        return {
            cardId: i.cardId,
            quantity: 0,
            userId: i.userId,
        };
    });
    const mockInventoryList: Inventory[] = testUtils.getMockInventoryList();

    const mockInventoryRepository: InventoryRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockInventoryList),
        findByUser: jest.fn().mockResolvedValue(mockInventoryList),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: InventoryRepositoryPort,
                    useValue: mockInventoryRepository,
                },
                InventoryMapper,
                CardMapper,
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        repository = module.get<InventoryRepositoryPort>(InventoryRepositoryPort);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create inventory items and return the saved inventory items', async () => {
        const savedItems: InventoryDto[] = await service.create(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedItems).toEqual(testUtils.getMockInventoryDtos());
    });

    it('should update existing inventory items and return the updated inventory items', async () => {
        const savedItems: InventoryDto[] = await service.update(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalled();
        expect(savedItems).toEqual(testUtils.getMockInventoryDtos());
    });

    it('should delete inventory items when update is called and item quantity is 0', async () => {
        jest.spyOn(repository, 'save').mockResolvedValueOnce([]);
        const savedItems: InventoryDto[] = await service.update(mockDeleteInventoryDtos);
        expect(repository.save).toHaveBeenCalled();
        expect(repository.delete).toHaveBeenCalled();
        expect(savedItems).toEqual([]);
    });

    it('should find inventory items for a user', async () => {
        const foundItems: InventoryDto[] = await service.findByUser(testUtils.MOCK_USER_ID);
        expect(repository.findByUser).toHaveBeenCalled();
        expect(foundItems).toEqual(testUtils.getMockInventoryDtos());
    });

    it('should find inventory items with cards for a user', async () => {
        const foundItems: InventoryCardDto[] = await service.findCardsByUser(testUtils.MOCK_USER_ID);
        expect(repository.findByUser).toHaveBeenCalled();
        expect(foundItems).toEqual(testUtils.getMockInventoryCardDtos());
    });
});
