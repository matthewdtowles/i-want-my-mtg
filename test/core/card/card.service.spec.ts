import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../../../src/core/card/card.service';
import { CardRepositoryPort } from '../../../src/core/card/ports/card.repository.port';
import { CardDataIngestionPort } from '../../../src/core/card/ports/card-data.ingestion.port';
import { Card } from '../../../src/core/card/card';

let createdCard: Card = new Card();
const mockSetCards: Card[] = [];
const mockCardsWithName: Card[] = [];
const mockCard: Card = new Card();

const mockCardRepository: CardRepositoryPort = {
    cardExists: jest.fn().mockResolvedValue(false),
    findAllInSet: jest.fn().mockResolvedValue(mockSetCards),
    findAllWithName: jest.fn().mockResolvedValue(mockCardsWithName),
    findById: jest.fn().mockResolvedValue(mockCard),
    findBySetCodeAndNumber: jest.fn().mockResolvedValue(mockCard),
    findByUuid: jest.fn().mockResolvedValue(mockCard),
    removeById: jest.fn(),
    saveCard: jest.fn().mockResolvedValue(createdCard),
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

    it('creates and returns persisted instance of given card', () => {});

    it('finds all cards in given set by setCode', () => {});

    it('finds every instance of a card with given name', () => {});

    it('finds a unique instance of a card by uuid', () => {});

    it('finds a unique instance of a card by setCode and card number in that set', () => {});

    it('updates and returns persisted instance of given card', () => {});
});
