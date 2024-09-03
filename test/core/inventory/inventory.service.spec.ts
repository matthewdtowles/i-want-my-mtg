import { Test, TestingModule } from '@nestjs/testing';
import { CreateInventoryDto } from '../../../src/core/inventory/dto/create-inventory.dto';
import { Inventory } from '../../../src/core/inventory/inventory.entity';
import { InventoryService } from '../../../src/core/inventory/inventory.service';
import { InventoryRepositoryPort } from '../../../src/core/inventory/ports/inventory.repository.port';
import { TestUtils } from '../../test-utils';

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
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        repository = module.get<InventoryRepositoryPort>(InventoryRepositoryPort);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should save cards and return the saved cards', () => {
        // TODO:
    });

    it('should find inventory items for a user', () => {
        // TODO:
    });

    it('should delete given inventory items by calling repository.delete()', () => {
        // TODO:
    });
});
