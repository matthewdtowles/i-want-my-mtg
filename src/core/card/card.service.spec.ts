import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from './card.service';
import { CardRepositoryPort } from './ports/card.repository.port';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';

const mockCardRepository: CardRepositoryPort = {
    cardExists: jest.fn().mockResolvedValue(false),
    findAllInSet: jest.fn(),
    findAllWithName: jest.fn(),
    findById: jest.fn(),
    findBySetCodeAndNumber: jest.fn(),
    findByUuid: jest.fn(),
    removeById: jest.fn(),
    saveCard: jest.fn(),
};

const mockCardIngestion: CardDataIngestionPort = {
    fetchCard: jest.fn(),
    fetchSetCards: jest.fn(),
};

describe('CardService', () => {
    let service: CardService;
    let repository: CardRepositoryPort;
    let ingestionSvc: CardDataIngestionPort;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardService,
                {
                    provide: CardRepositoryPort,
                    useValue: mockCardRepository,
                }, 
                {
                    provide: CardDataIngestionPort,
                    useValue: mockCardIngestion,
                },
            ],
        }).compile();

        service = module.get<CardService>(CardService);
        repository = module.get<CardRepositoryPort>(CardRepositoryPort);
        ingestionSvc = module.get<CardDataIngestionPort>(CardDataIngestionPort);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
