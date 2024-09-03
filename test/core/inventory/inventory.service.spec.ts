import { Test, TestingModule } from '@nestjs/testing';
import { CreateInventoryDto } from '../../../src/core/inventory/dto/create-inventory.dto';
import { Inventory } from '../../../src/core/inventory/inventory.entity';
import { InventoryService } from '../../../src/core/inventory/inventory.service';
import { InventoryRepositoryPort } from '../../../src/core/inventory/ports/inventory.repository.port';
import { TestUtils } from '../../test-utils';
import { InventoryDto } from '../../../src/core/inventory/dto/inventory.dto';
import { InventoryMapper } from '../../../src/core/inventory/inventory.mapper';

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
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        repository = module.get<InventoryRepositoryPort>(InventoryRepositoryPort);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should save inventory items and return the saved inventory items', async () => {
        // TODO:
        const savedItems: InventoryDto[] = await service.save(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedItems).toEqual(testUtils.getMockInventoryDtos());
    });

    it('should find inventory items for a user', async () => {
        // TODO:
    });

    it('should delete given inventory items by calling repository.delete()', async () => {
        // TODO:
    });
});
