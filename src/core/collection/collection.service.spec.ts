import { Test, TestingModule } from '@nestjs/testing';
import { CollectionService } from './collection.service';
import { CollectionRepositoryPort } from './ports/collection.repository.port';

const mockCollectionRepository: CollectionRepositoryPort = {
    saveCollection: jest.fn(),
    collectionExists: jest.fn(),
    findById: jest.fn(),
    findByCollectionOwner: jest.fn(),
    addCard: jest.fn(),
    addCards: jest.fn(),
    removeCard: jest.fn(),
    removeCards: jest.fn(),
    removeById: jest.fn(),
    removeCollection: jest.fn(),
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
