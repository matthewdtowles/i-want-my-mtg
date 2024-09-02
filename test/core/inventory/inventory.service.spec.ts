import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../../../src/core/inventory/inventory.service';
import { InventoryRepositoryPort } from '../../../src/core/inventory/ports/inventory.repository.port';

const mockInventoryRepository: InventoryRepositoryPort = {
    // TODO: save returns InventoryDto[]
    save: jest.fn(),
    // TODO: findByUser returns InventoryDto[]
    findByUser: jest.fn(),
    delete: jest.fn(),
};

describe('InventoryService', () => {
    let service: InventoryService;
    let repository: InventoryRepositoryPort;

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
