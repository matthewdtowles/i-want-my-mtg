import { Test, TestingModule } from '@nestjs/testing';
import { CollectionService } from '../../../src/core/collection/collection.service';
import { CollectionRepositoryPort } from '../../../src/core/collection/ports/collection.repository.port';

const mockCollectionRepository: CollectionRepositoryPort = {
    save: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    delete: jest.fn(),
};

describe('CollectionService', () => {
    let service: CollectionService;
    let repository: CollectionRepositoryPort;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CollectionService,
                {
                    provide: CollectionRepositoryPort,
                    useValue: mockCollectionRepository,
                },
            ],
        }).compile();

        service = module.get<CollectionService>(CollectionService);
        repository = module.get<CollectionRepositoryPort>(CollectionRepositoryPort);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
