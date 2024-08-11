import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../../../src/core/card/card.service';
import { CardRepositoryPort } from '../../../src/core/card/ports/card.repository.port';
import { CardDataIngestionPort } from '../../../src/core/card/ports/card-data.ingestion.port';
import { Card } from '../../../src/core/card/card';
import { TestUtils } from '../../test-utils';


describe('CardService', () => {
    const testUtils: TestUtils = new TestUtils();
    const mockSetCode: string = 'SET';
    const mockSetNumber = 1;

    const mockSetCards: Card[] = testUtils.getMockSetCards(mockSetCode);
    const mockCardsWithName: Card[] = testUtils.getMockCardsWithName(3);
    const mockSavedCard: Card = testUtils.getMockCard(mockSetNumber, mockSetCode);

    let service: CardService;
    let repository: CardRepositoryPort;
    let ingestionSvc: CardDataIngestionPort;

    const mockCardRepository: CardRepositoryPort = {
        cardExists: jest.fn().mockResolvedValue(true),
        findAllInSet: jest.fn().mockResolvedValue(mockSetCards),
        findAllWithName: jest.fn().mockResolvedValue(mockCardsWithName),
        findById: jest.fn().mockResolvedValue(mockSavedCard),
        findBySetCodeAndNumber: jest.fn().mockResolvedValue(mockSavedCard),
        findByUuid: jest.fn().mockResolvedValue(mockSavedCard),
        removeById: jest.fn(),
        saveCard: jest.fn().mockResolvedValue(mockSavedCard),
    };

    const mockCardIngestion: CardDataIngestionPort = {
        fetchCard: jest.fn(),
        fetchSetCards: jest.fn(),
    };

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

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('saves card and returns saved card if cardExists returns false', async () => {
        const card: Card = testUtils.getMockInputCard(mockSetNumber, mockSetCode);
        const repoSaveCard = jest.spyOn(repository, 'saveCard');
        jest.spyOn(repository, 'cardExists').mockReturnValueOnce(Promise.resolve(false));
        const repoCardExists = jest.spyOn(repository, 'cardExists');
        const createdCard: Card = await service.create(card);
        expect(repoCardExists).toHaveBeenCalledWith(card);
        expect(repoSaveCard).toHaveBeenCalledWith(card);
        expect(createdCard).toEqual(mockSavedCard);
    });

    it('returns given card and does not save if cardExists returns true', async () => {
        const card: Card = testUtils.getMockInputCard(mockSetNumber, mockSetCode);
        const repoSaveCard = jest.spyOn(repository, 'saveCard');
        const repoCardExists = jest.spyOn(repository, 'cardExists');
        const createdCard: Card = await service.create(card);
        expect(repoCardExists).toHaveBeenCalledWith(card);
        expect(repoSaveCard).not.toHaveBeenCalled();
        expect(createdCard).toEqual(card);
    });

    it('finds all cards in given set by setCode', async () => { });

    it('finds every instance of a card with given name', async () => { });

    it('finds a unique instance of a card by uuid', async () => { });

    it('finds a unique instance of a card by setCode and card number in that set', async () => { });

    it('updates and returns persisted instance of given card', async () => { });
});
