import { Test, TestingModule } from '@nestjs/testing';
import { CreateInventoryDto } from '../../../src/core/inventory/dto/create-inventory.dto';
import { InventoryDto } from '../../../src/core/inventory/dto/inventory.dto';
import { Inventory } from '../../../src/core/inventory/inventory.entity';
import { InventoryMapper } from '../../../src/core/inventory/inventory.mapper';
import { InventoryService } from '../../../src/core/inventory/inventory.service';
import { InventoryRepositoryPort } from '../../../src/core/inventory/ports/inventory.repository.port';
import { TestUtils } from '../../test-utils';
import { CardMapper } from '../../../src/core/card/card.mapper';

describe('InventoryService', () => {
    let service: InventoryService;
    let repository: InventoryRepositoryPort;

    const testUtils: TestUtils = new TestUtils();
    const mockInventoryDtos: CreateInventoryDto[] = testUtils.getMockCreateInventoryDtos();
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

    it('should save inventory items and return the saved inventory items', async () => {
        const savedItems: InventoryDto[] = await service.save(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedItems).toEqual(testUtils.getMockInventoryDtos());
    });

    it('should find inventory items for a user', async () => {
        const foundItems: InventoryDto[] = await service.findByUser(testUtils.MOCK_USER_ID);
        expect(repository.findByUser).toHaveBeenCalledTimes(1);
        expect(foundItems).toEqual(testUtils.getMockInventoryDtos());
    });

    it('should remove given inventory item by calling repository.delete()', async () => {
        const deleteSpy = jest.spyOn(repository, 'delete');
        const dtosToRemove: InventoryDto[] = testUtils.getMockInventoryDtos();
        expect(await service.remove(dtosToRemove)).toBe(undefined);
        expect(deleteSpy).toHaveBeenCalledTimes(dtosToRemove.length);
    });
});
